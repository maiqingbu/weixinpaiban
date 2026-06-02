import { ipcMain } from 'electron'
import { validateString, ValidationError } from '../lib/validation'
import { isSafeExternalUrl } from '../lib/urlSafety'

export function registerLinkCheckHandlers(): void {
  ipcMain.handle('check-link', async (_event, url: unknown) => {
    const safeUrl = validateString(url, 'url', { minLength: 1, maxLength: 2000 })
    if (!isSafeExternalUrl(safeUrl)) {
      throw new ValidationError('URL is not allowed (private/local addresses are blocked)', 'url')
    }
    try {
      const response = await fetch(safeUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      })
      return { url: safeUrl, ok: response.ok, status: response.status }
    } catch (e: unknown) {
      const err = e as Error
      return { url: safeUrl, ok: false, error: err.message }
    }
  })
}
