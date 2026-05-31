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

const ARTICLE_COLS = 'id, title, content, theme_id, summary, cover_image, read_more_url, read_more_text, last_opened_at, created_at, updated_at'

export function registerIpcHandlers(): void {
  ipcMain.handle('ping', async (_event): Promise<string> => {
    return 'pong'
  })

  ipcMain.handle(
    'copy-to-wechat',
    async (_event, html: string, _plainText: string): Promise<{ success: boolean }> => {
      try {
        clipboard.write({ html, text: _plainText })
        return { success: true }
      } catch (err) {
        console.error('[copy-to-wechat] Failed:', err)
        return { success: false }
      }
    }
  )

  // Debug: save exported HTML to file (Ctrl/Cmd + Shift + E)
  ipcMain.handle(
    'debug-save-export',
    async (_event, html: string): Promise<{ filePath: string }> => {
      const filePath = join(app.getPath('userData'), 'last-export.html')
      await writeFile(filePath, html, 'utf-8')
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

  ipcMain.handle('article:get', async (_event, id: number) => {
    return getArticle(id)
  })

  ipcMain.handle('article:update', async (_event, id: number, data: {
    title?: string; content?: string; theme_id?: string; summary?: string
    read_more_url?: string; read_more_text?: string
  }) => {
    return updateArticle(id, data)
  })

  ipcMain.handle('article:delete', async (_event, id: number) => {
    return deleteArticle(id)
  })

  // Article: update last_opened_at
  ipcMain.handle('article:updateLastOpened', async (_event, id: number) => {
    const db = getDb()
    return db.prepare(`UPDATE articles SET last_opened_at = unixepoch() WHERE id = ? RETURNING ${ARTICLE_COLS}`).get(id) as Article | null
  })

  // ── Read More Links ──
  ipcMain.handle('readMore:list', async () => {
    return listReadMoreLinks()
  })

  ipcMain.handle('readMore:save', async (_event, link: {
    id?: string; name: string; url: string; description?: string; isDefault?: boolean
  }) => {
    return saveReadMoreLink(link)
  })

  ipcMain.handle('readMore:delete', async (_event, id: string) => {
    return deleteReadMoreLink(id)
  })

  ipcMain.handle('readMore:getDefault', async () => {
    return getDefaultReadMoreLink()
  })

  ipcMain.handle('readMore:incrementUse', async (_event, id: string) => {
    incrementReadMoreLinkUse(id)
  })
}
