import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function registerExportPdfHandlers(): void {
  ipcMain.handle('export-pdf', async (_event, html: string, title: string, options: { pageSize: string | { width: number; height: number } }) => {
    // Create offscreen window for rendering
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    try {
      // Save HTML to temp file and load via file:// to avoid data URL encoding issues
      const tempDir = join(app.getPath('userData'), 'temp')
      await mkdir(tempDir, { recursive: true })
      const tempPath = join(tempDir, 'capture-pdf.html')
      await writeFile(tempPath, html, 'utf-8')

      await win.loadFile(tempPath)

      // Wait a bit for rendering
      await new Promise((r) => setTimeout(r, 500))

      // Clean up temp file
      unlink(tempPath).catch(() => {})

      // Generate PDF
      const pdfBuffer = await win.webContents.printToPDF({
        pageSize: options.pageSize === 'wechat' ? { width: 677000, height: 0 } : options.pageSize as any,
        printBackground: true,
        margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      })

      // Sanitize title for filename
      const safeTitle = (title || '未命名文章').replace(/[\\/:*?"<>|]/g, '_')

      // Show save dialog
      const saveResult = await dialog.showSaveDialog({
        defaultPath: `${safeTitle}.pdf`,
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
      win.close()
      throw err
    }
  })

  // Capture long image using Electron native webContents.capturePage()
  ipcMain.handle('capture-long-image', async (_event, html: string, title: string, width: number) => {
    const win = new BrowserWindow({
      show: false,
      width: width + 40, // extra padding
      height: 600,
      webPreferences: {
        offscreen: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    try {
      // Save HTML to temp file and load via file:// to avoid data URL encoding issues
      const tempDir = join(app.getPath('userData'), 'temp')
      await mkdir(tempDir, { recursive: true })
      const tempPath = join(tempDir, 'capture-render.html')
      await writeFile(tempPath, html, 'utf-8')
      console.log('[capture-long-image] Loading HTML from file:', tempPath, 'length:', html.length)
      console.log('[capture-long-image] Has style attr:', html.includes('style='))

      await win.loadFile(tempPath)

      // Wait for images to load and rendering to complete
      await new Promise((r) => setTimeout(r, 1000))

      // Diagnostic: check computed styles on first styled element
      const diag = await win.webContents.executeJavaScript(`
        (() => {
          const bq = document.querySelector('blockquote')
          const h1 = document.querySelector('h1')
          const section = document.querySelector('section')
          if (bq) {
            const cs = getComputedStyle(bq)
            return {
              blockquote: {
                background: cs.backgroundColor,
                borderLeft: cs.borderLeft,
                color: cs.color,
                padding: cs.padding,
              },
              h1: h1 ? { textAlign: getComputedStyle(h1).textAlign, fontSize: getComputedStyle(h1).fontSize } : null,
              sectionBg: section ? getComputedStyle(section).backgroundColor : null,
            }
          }
          return { error: 'no blockquote found' }
        })()
      `)
      console.log('[capture-long-image] Computed styles:', JSON.stringify(diag, null, 2))

      // Get actual content height
      const contentHeight = await win.webContents.executeJavaScript('document.body.scrollHeight')
      win.setSize(width + 40, contentHeight + 40)
      await new Promise((r) => setTimeout(r, 500))

      // Capture the page as PNG
      const image = await win.webContents.capturePage()
      const pngBuffer = image.toPNG()

      // Debug: save captured PNG in dev mode
      if (is.dev) {
        const debugPngPath = join(app.getPath('userData'), 'capture-output.png')
        await writeFile(debugPngPath, pngBuffer)
        console.log('[capture-long-image] Saved debug PNG to:', debugPngPath, 'size:', pngBuffer.length)
      }

      const safeTitle = (title || '未命名文章').replace(/[\\/:*?"<>|]/g, '_')

      const saveResult = await dialog.showSaveDialog({
        defaultPath: `${safeTitle}.png`,
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
      win.close()
      throw err
    }
  })

  // Save file (generic, used for HTML and Markdown export)
  ipcMain.handle('save-file', async (_event, data: Buffer | Uint8Array | string | Record<string, number>, defaultName: string) => {
    const saveResult = await dialog.showSaveDialog({
      defaultPath: defaultName,
    })

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true }
    }

    if (typeof data === 'string') {
      await writeFile(saveResult.filePath, data, 'utf-8')
    } else if (Buffer.isBuffer(data)) {
      await writeFile(saveResult.filePath, data)
    } else if (data instanceof Uint8Array) {
      await writeFile(saveResult.filePath, data)
    } else if (typeof data === 'object' && data !== null) {
      // IPC may deserialize Uint8Array as a plain object
      const arr = new Uint8Array(Object.values(data as Record<string, number>))
      await writeFile(saveResult.filePath, arr)
    }

    shell.showItemInFolder(saveResult.filePath)
    return { path: saveResult.filePath }
  })
}
