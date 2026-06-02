import { ipcMain, clipboard, app } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import {
  listArticles,
  createArticle,
  getArticle,
  updateArticle,
  deleteArticle,
  getDb,
  listReadMoreLinks,
  saveReadMoreLink,
  deleteReadMoreLink,
  getDefaultReadMoreLink,
  incrementReadMoreLinkUse,
} from '../db'
import type { Article } from '../db'
import { sanitizeHtmlForWeChat } from '../lib/sanitize'
import { validateId, validateString, validateStringOrNull, validateUrl, validateObject, ValidationError } from '../lib/validation'

const ARTICLE_COLS = 'id, title, content, theme_id, summary, cover_image, read_more_url, read_more_text, last_opened_at, created_at, updated_at'

const MAX_HTML_LENGTH = 50 * 1024 * 1024
const MAX_STRING_LENGTH = 1024 * 1024
const MAX_NAME_LENGTH = 200

export function registerIpcHandlers(): void {
  ipcMain.handle('ping', async (_event): Promise<string> => {
    return 'pong'
  })

  ipcMain.handle(
    'copy-to-wechat',
    async (_event, html: unknown, _plainText: unknown): Promise<{ success: boolean }> => {
      try {
        const safeHtml = validateString(html, 'html', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
        const plainText = validateString(_plainText, 'plainText', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
        const sanitized = sanitizeHtmlForWeChat(safeHtml)
        clipboard.write({ html: sanitized, text: plainText })
        return { success: true }
      } catch (err) {
        if (err instanceof ValidationError) {
          console.warn(`[copy-to-wechat] Validation failed: ${err.message}`)
        } else {
          console.error('[copy-to-wechat] Failed:', err)
        }
        return { success: false }
      }
    }
  )

  // Debug: save exported HTML to file (Ctrl/Cmd + Shift + E)
  ipcMain.handle(
    'debug-save-export',
    async (_event, html: unknown): Promise<{ filePath: string }> => {
      const safeHtml = validateString(html, 'html', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
      const filePath = join(app.getPath('userData'), 'last-export.html')
      await writeFile(filePath, safeHtml, 'utf-8')
      console.log(`[debug] Export saved to: ${filePath}`)
      return { filePath }
    }
  )

  // Article CRUD
  ipcMain.handle('article:list', async () => {
    return listArticles()
  })

  ipcMain.handle('article:create', async () => {
    return createArticle()
  })

  ipcMain.handle('article:get', async (_event, id: unknown) => {
    const safeId = validateId(id)
    return getArticle(safeId)
  })

  ipcMain.handle('article:update', async (_event, id: unknown, data: unknown) => {
    const safeId = validateId(id)
    const obj = validateObject<{
      title?: string; content?: string; theme_id?: string; summary?: string
      read_more_url?: string; read_more_text?: string
    }>(data, 'data')
    const sanitized: typeof obj = {}
    if (obj.title !== undefined) sanitized.title = validateString(obj.title, 'title', { allowEmpty: true, maxLength: MAX_NAME_LENGTH })
    if (obj.content !== undefined) sanitized.content = validateString(obj.content, 'content', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
    if (obj.theme_id !== undefined) {
      const themeId = validateStringOrNull(obj.theme_id, 'theme_id')
      sanitized.theme_id = themeId === null ? undefined : themeId
    }
    if (obj.summary !== undefined) sanitized.summary = validateString(obj.summary, 'summary', { allowEmpty: true, maxLength: 500 })
    if (obj.read_more_url !== undefined) {
      sanitized.read_more_url = obj.read_more_url === '' ? '' : validateUrl(obj.read_more_url, 'read_more_url')
    }
    if (obj.read_more_text !== undefined) sanitized.read_more_text = validateString(obj.read_more_text, 'read_more_text', { allowEmpty: true, maxLength: 200 })
    return updateArticle(safeId, sanitized)
  })

  ipcMain.handle('article:delete', async (_event, id: unknown) => {
    const safeId = validateId(id)
    return deleteArticle(safeId)
  })

  // Article: update last_opened_at
  ipcMain.handle('article:updateLastOpened', async (_event, id: unknown) => {
    const safeId = validateId(id)
    const db = getDb()
    return db.prepare(`UPDATE articles SET last_opened_at = unixepoch() WHERE id = ? RETURNING ${ARTICLE_COLS}`).get(safeId) as Article | null
  })

  // ── Read More Links ──
  ipcMain.handle('readMore:list', async () => {
    return listReadMoreLinks()
  })

  ipcMain.handle('readMore:save', async (_event, link: unknown) => {
    const obj = validateObject<{
      id?: string; name: string; url: string; description?: string; isDefault?: boolean
    }>(link, 'link')
    const sanitized: typeof obj = {
      name: validateString(obj.name, 'name', { maxLength: MAX_NAME_LENGTH }),
      url: validateUrl(obj.url, 'url'),
    }
    if (obj.id !== undefined) sanitized.id = validateString(obj.id, 'id', { maxLength: 100 })
    if (obj.description !== undefined) sanitized.description = validateString(obj.description, 'description', { allowEmpty: true, maxLength: MAX_STRING_LENGTH })
    if (obj.isDefault !== undefined) sanitized.isDefault = Boolean(obj.isDefault)
    return saveReadMoreLink(sanitized)
  })

  ipcMain.handle('readMore:delete', async (_event, id: unknown) => {
    const safeId = validateString(id, 'id', { maxLength: 100 })
    return deleteReadMoreLink(safeId)
  })

  ipcMain.handle('readMore:getDefault', async () => {
    return getDefaultReadMoreLink()
  })

  ipcMain.handle('readMore:incrementUse', async (_event, id: unknown) => {
    const safeId = validateString(id, 'id', { maxLength: 100 })
    incrementReadMoreLinkUse(safeId)
  })
}
