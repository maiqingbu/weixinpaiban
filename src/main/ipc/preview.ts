import { ipcMain } from 'electron'
import {
  startPreviewServer,
  stopPreviewServer,
  updatePreviewContent,
  getPreviewToken,
  getPreviewUrl
} from '../services/previewServer'
import { validateString } from '../lib/validation'

const MAX_HTML_LENGTH = 50 * 1024 * 1024

export function registerPreviewHandlers(): void {
  ipcMain.handle('preview:start', async () => {
    const result = await startPreviewServer()
    return { port: result.port, token: result.token, url: getPreviewUrl() }
  })

  ipcMain.handle('preview:update', async (_event, html: unknown) => {
    const safeHtml = validateString(html, 'html', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
    updatePreviewContent(safeHtml)
  })

  ipcMain.handle('preview:stop', async () => {
    await stopPreviewServer()
  })

  ipcMain.handle('preview:getInfo', async () => {
    return {
      port: null,
      token: getPreviewToken(),
      url: getPreviewUrl()
    }
  })
}
