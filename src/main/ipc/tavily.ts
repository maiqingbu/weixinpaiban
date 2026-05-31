import { ipcMain } from 'electron'
import { getDb } from '../db'

const TAVILY_API_URL = 'https://api.tavily.com/search'

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
}

export function registerTavilyHandlers(): void {
  // 保存 Tavily API Key
  ipcMain.handle('tavily:set-key', (_event, apiKey: string) => {
    const db = getDb()
    db.prepare(`INSERT OR REPLACE INTO image_host_settings (key, value) VALUES ('tavily_api_key', ?)`).run(apiKey)
  })

  // 获取 Tavily API Key
  ipcMain.handle('tavily:get-key', () => {
    const db = getDb()
    const row = db.prepare(`SELECT value FROM image_host_settings WHERE key = 'tavily_api_key'`).get() as { value: string } | undefined
    return row?.value || null
  })

  // 删除 Tavily API Key
  ipcMain.handle('tavily:delete-key', () => {
    const db = getDb()
    db.prepare(`DELETE FROM image_host_settings WHERE key = 'tavily_api_key'`).run()
  })

  // 搜索
  ipcMain.handle('tavily:search', async (_event, query: string, maxResults: number = 5) => {
    const db = getDb()
    const row = db.prepare(`SELECT value FROM image_host_settings WHERE key = 'tavily_api_key'`).get() as { value: string } | undefined
    const apiKey = row?.value

    if (!apiKey) {
      return { error: '未配置 Tavily API Key', results: [] }
    }

    try {
      const resp = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: 'basic',
          include_answer: true,
        }),
      })

      if (!resp.ok) {
        const text = await resp.text()
        return { error: `Tavily API 错误: ${resp.status} ${text}`, results: [] }
      }

      const data: TavilyResponse = await resp.json()
      return {
        results: data.results.map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
      }
    } catch (err: any) {
      return { error: err.message || '搜索失败', results: [] }
    }
  })
}
