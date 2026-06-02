import { ipcMain, shell } from 'electron'
import {
  createPreview,
  updatePreview,
  deletePreview,
  listPreviews,
  getPreviewToken,
  getPreviewUrl,
  stopAllPreviews,
  startPreviewServer,
  updatePreviewContent,
  stopPreviewServer,
} from '../services/previewServer'
import { ValidationError, validateString, validateId } from '../lib/validation'
import { isSafeExternalUrl } from '../lib/urlSafety'

const MAX_HTML_LENGTH = 50 * 1024 * 1024 // 50MB

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

export function registerPreviewHandlers(): void {
  // 多 preview 模式
  ipcMain.handle('preview:create', (_event, html: unknown, title: unknown) =>
    handle(() => {
      const safeHtml = validateString(html, 'html', { minLength: 0, maxLength: MAX_HTML_LENGTH })
      const safeTitle = validateString(title, 'title', { minLength: 0, maxLength: 256 }) || '预览'
      return createPreview(safeHtml, safeTitle)
    })
  )

  ipcMain.handle('preview:list', () => handle(() => listPreviews()))

  ipcMain.handle('preview:delete', (_event, id: unknown) =>
    handle(() => {
      const safeId = validateId(id, 'id')
      return deletePreview(safeId)
    })
  )

  ipcMain.handle('preview:getToken', (_event, id: unknown) =>
    handle(() => {
      const safeId = validateId(id, 'id')
      return getPreviewToken(safeId)
    })
  )

  ipcMain.handle('preview:getUrl', (_event, id: unknown) =>
    handle(() => {
      const safeId = validateId(id, 'id')
      return getPreviewUrl(safeId)
    })
  )

  ipcMain.handle('preview:update', (_event, id: unknown, html: unknown, title: unknown) =>
    handle(() => {
      const safeId = validateId(id, 'id')
      const safeHtml = validateString(html, 'html', { minLength: 0, maxLength: MAX_HTML_LENGTH })
      const safeTitle = title
        ? validateString(title, 'title', { minLength: 0, maxLength: 256 })
        : undefined
      return updatePreview(safeId, safeHtml, safeTitle)
    })
  )

  ipcMain.handle('preview:open-in-browser', async (_event, url: unknown) => {
    // 必须是 http://127.0.0.1 开头，且命中已存在的 preview
    if (typeof url !== 'string') {
      throw new Error('URL 必须是字符串')
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error('URL 格式不合法')
    }
    if (parsed.protocol !== 'http:') {
      throw new Error('仅支持 http 协议')
    }
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      throw new Error('仅支持本机预览链接')
    }
    if (!isSafeExternalUrl(parsed.toString())) {
      throw new Error('预览 URL 校验失败')
    }
    await shell.openExternal(parsed.toString())
  })

  ipcMain.handle('preview:stop-all', () => handle(() => stopAllPreviews()))

  // 兼容旧 API：单个 active preview
  ipcMain.handle('preview:start', () => handle(() => startPreviewServer()))
  ipcMain.handle(
    'preview:update-active',
    (_event, html: unknown, title: unknown) =>
      handle(() => {
        const safeHtml = validateString(html, 'html', { minLength: 0, maxLength: MAX_HTML_LENGTH })
        const safeTitle = title
          ? validateString(title, 'title', { minLength: 0, maxLength: 256 })
          : undefined
        return updatePreviewContent(safeHtml, safeTitle)
      })
  )
  ipcMain.handle('preview:stop', () => handle(() => stopPreviewServer()))
}
