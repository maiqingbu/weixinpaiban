import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import {
  validateString,
  validateNumber,
  validateObject,
  ValidationError,
} from '../lib/validation'

const MAX_HTML_LENGTH = 50 * 1024 * 1024 // 50MB
const MIN_CAPTURE_WIDTH = 320
const MAX_CAPTURE_WIDTH = 4096
const MAX_PDF_PAGE_WIDTH = 200000 // 微米（200mm）
const MAX_PDF_PAGE_HEIGHT = 2000000 // 微米（2000mm）

// CSP meta 注入：防止预览/PDF 渲染时执行外联脚本或加载外网资源
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; img-src * data:; font-src * data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' data:;">`

function sanitizeFilename(name: string): string {
  // Windows / macOS 都不允许的字符
  return (name || '未命名文章').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 200)
}

/**
 * 把 HTML 包成完整文档，写入临时文件。
 * - 注入 CSP meta 防止内嵌 JS 执行
 * - 过滤恶意 <script> 标签（兜底，CSP 是主防线）
 * - 限制总大小
 */
async function writeHtmlToTempFile(html: string, filename: string): Promise<string> {
  if (html.length > MAX_HTML_LENGTH) {
    throw new Error(`HTML 内容过大（>${MAX_HTML_LENGTH / 1024 / 1024}MB）`)
  }
  // 移除外联 script，降低攻击面
  const safeHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')

  // 包裹成完整 HTML 文档
  const wrapped = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
${CSP_META}
</head>
<body>
${safeHtml}
</body>
</html>`

  const tempDir = join(app.getPath('userData'), 'temp')
  await mkdir(tempDir, { recursive: true })
  const tempPath = join(tempDir, filename)
  await writeFile(tempPath, wrapped, 'utf-8')
  return tempPath
}

interface PrintOptions {
  pageSize: 'a4' | 'a3' | 'letter' | 'legal' | 'wechat' | { width: number; height: number } | string
}

function validatePrintOptions(options: unknown): PrintOptions {
  const obj = validateObject<Record<string, unknown>>(options, 'options')
  if (typeof obj.pageSize === 'string') {
    return { pageSize: obj.pageSize }
  }
  if (typeof obj.pageSize === 'object' && obj.pageSize !== null) {
    const ps = obj.pageSize as Record<string, unknown>
    const width = validateNumber(ps.width, 'pageSize.width', {
      min: 1000,
      max: MAX_PDF_PAGE_WIDTH,
      integer: true,
    })
    const height = validateNumber(ps.height, 'pageSize.height', {
      min: 0,
      max: MAX_PDF_PAGE_HEIGHT,
      integer: true,
    })
    return { pageSize: { width, height } }
  }
  throw new ValidationError('options.pageSize 必须是字符串或 {width, height} 对象', 'options.pageSize')
}

function handle<T>(fn: () => T | Promise<T>): Promise<T> {
  return Promise.resolve()
    .then(fn)
    .catch((err) => {
      const message =
        err instanceof ValidationError
          ? `参数错误: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      throw new Error(message)
    })
}

export function registerExportPdfHandlers(): void {
  ipcMain.handle(
    'export-pdf',
    (_event, html: unknown, title: unknown, options: unknown) =>
      handle(async () => {
        const safeHtml = validateString(html, 'html', {
          allowEmpty: false,
          maxLength: MAX_HTML_LENGTH,
        })
        const safeTitle = validateString(title, 'title', { maxLength: 200 })
        const printOptions = validatePrintOptions(options)

        // Create offscreen window for rendering
        const win = new BrowserWindow({
          show: false,
          webPreferences: {
            offscreen: true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            // 禁止 webContents 打开新窗口
            webSecurity: true,
          },
        })

        let tempPath: string | null = null
        try {
          // Save HTML to temp file (with CSP) and load via file://
          tempPath = await writeHtmlToTempFile(safeHtml, 'capture-pdf.html')
          await win.loadFile(tempPath)

          // Wait a bit for rendering
          await new Promise((r) => setTimeout(r, 500))

          // Clean up temp file
          if (tempPath) unlink(tempPath).catch(() => {})
          tempPath = null

          // Generate PDF
          const pdfBuffer = await win.webContents.printToPDF({
            pageSize:
              printOptions.pageSize === 'wechat'
                ? { width: 677000, height: 0 }
                : (printOptions.pageSize as any),
            printBackground: true,
            margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
          })

          const safeName = sanitizeFilename(safeTitle)

          // Show save dialog
          const saveResult = await dialog.showSaveDialog({
            defaultPath: `${safeName}.pdf`,
            filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
          })

          if (saveResult.canceled || !saveResult.filePath) {
            win.close()
            return { canceled: true }
          }

          await writeFile(saveResult.filePath, pdfBuffer)

          // Show file in folder
          shell.showItemInFolder(saveResult.filePath)

          win.close()
          return { path: saveResult.filePath }
        } catch (err) {
          if (tempPath) unlink(tempPath).catch(() => {})
          win.close()
          throw err
        }
      })
  )

  // Capture long image using Electron native webContents.capturePage()
  ipcMain.handle(
    'capture-long-image',
    (_event, html: unknown, title: unknown, width: unknown) =>
      handle(async () => {
        const safeHtml = validateString(html, 'html', {
          allowEmpty: false,
          maxLength: MAX_HTML_LENGTH,
        })
        const safeTitle = validateString(title, 'title', { maxLength: 200 })
        const safeWidth = validateNumber(width, 'width', {
          min: MIN_CAPTURE_WIDTH,
          max: MAX_CAPTURE_WIDTH,
          integer: true,
        })

        const win = new BrowserWindow({
          show: false,
          width: safeWidth + 40, // extra padding
          height: 600,
          webPreferences: {
            offscreen: true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
          },
        })

        let tempPath: string | null = null
        try {
          // Save HTML to temp file (with CSP) and load via file://
          tempPath = await writeHtmlToTempFile(safeHtml, 'capture-render.html')
          await win.loadFile(tempPath)

          // Wait for images to load and rendering to complete
          await new Promise((r) => setTimeout(r, 1000))

          // Get actual content height
          const contentHeight = await win.webContents.executeJavaScript(
            'document.body.scrollHeight'
          )
          // 限制最大渲染高度，防止 OOM
          const safeHeight = Math.min(Number(contentHeight) || 600, 30000)
          win.setSize(safeWidth + 40, safeHeight + 40)
          await new Promise((r) => setTimeout(r, 500))

          // Clean up temp file
          if (tempPath) unlink(tempPath).catch(() => {})
          tempPath = null

          // Capture the page as PNG
          const image = await win.webContents.capturePage()
          const pngBuffer = image.toPNG()

          // Debug: save captured PNG in dev mode
          if (is.dev) {
            const debugPngPath = join(app.getPath('userData'), 'capture-output.png')
            await writeFile(debugPngPath, pngBuffer)
            console.log(
              '[capture-long-image] Saved debug PNG to:',
              debugPngPath,
              'size:',
              pngBuffer.length
            )
          }

          const safeName = sanitizeFilename(safeTitle)

          const saveResult = await dialog.showSaveDialog({
            defaultPath: `${safeName}.png`,
            filters: [{ name: 'PNG 图片', extensions: ['png'] }],
          })

          if (saveResult.canceled || !saveResult.filePath) {
            win.close()
            return { canceled: true }
          }

          await writeFile(saveResult.filePath, pngBuffer)
          shell.showItemInFolder(saveResult.filePath)

          win.close()
          return { path: saveResult.filePath }
        } catch (err) {
          if (tempPath) unlink(tempPath).catch(() => {})
          win.close()
          throw err
        }
      })
  )

  // Save file (generic, used for HTML and Markdown export)
  ipcMain.handle(
    'save-file',
    async (
      _event,
      data: unknown,
      defaultName: unknown
    ) => {
      const safeDefaultName = validateString(defaultName, 'defaultName', {
        maxLength: 200,
      })

      // Validate data type
      let buffer: Buffer | Uint8Array | string
      if (typeof data === 'string') {
        if (data.length > MAX_HTML_LENGTH) {
          throw new ValidationError(
            `字符串内容过大（>${MAX_HTML_LENGTH / 1024 / 1024}MB）`,
            'data'
          )
        }
        buffer = data
      } else if (data instanceof Uint8Array) {
        if (data.byteLength > MAX_HTML_LENGTH) {
          throw new ValidationError(
            `二进制内容过大（>${MAX_HTML_LENGTH / 1024 / 1024}MB）`,
            'data'
          )
        }
        buffer = data
      } else if (typeof data === 'object' && data !== null) {
        // IPC may deserialize Uint8Array as a plain object
        const obj = data as Record<string, number>
        const keys = Object.keys(obj)
        if (keys.length > MAX_HTML_LENGTH) {
          throw new ValidationError(
            `二进制内容过大（>${MAX_HTML_LENGTH / 1024 / 1024}MB）`,
            'data'
          )
        }
        buffer = new Uint8Array(Object.values(obj))
      } else {
        throw new ValidationError('data 必须是 string / Uint8Array / 对象', 'data')
      }

      const saveResult = await dialog.showSaveDialog({
        defaultPath: safeDefaultName,
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { canceled: true }
      }

      if (typeof buffer === 'string') {
        await writeFile(saveResult.filePath, buffer, 'utf-8')
      } else {
        await writeFile(saveResult.filePath, buffer)
      }

      shell.showItemInFolder(saveResult.filePath)
      return { path: saveResult.filePath }
    }
  )
}
