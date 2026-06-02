import { ipcMain, safeStorage } from 'electron'
import { getDb } from '../db'
import { validateString, validateNumber } from '../lib/validation'

const TAVILY_API_URL = 'https://api.tavily.com/search'
const TAVILY_KEY_SECRET = 'tavily_api_key'

const TAVILY_KEY_MAX_LENGTH = 200
const QUERY_MAX_LENGTH = 500
const MAX_RESULTS_LIMIT = 20
const MAX_RESULTS_DEFAULT = 5

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
}

/**
 * 从 encrypted_secrets 表中读取并解密 Tavily API key。
 * 兼容旧明文（image_host_settings），但只在加密不可用时使用。
 */
function readTavilyKey(): string | null {
  const db = getDb()
  // 优先读加密版本
  try {
    const encRow = db
      .prepare('SELECT encrypted_value FROM encrypted_secrets WHERE key = ?')
      .get(TAVILY_KEY_SECRET) as { encrypted_value: Buffer } | undefined
    if (encRow && safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(encRow.encrypted_value)
      } catch (err) {
        console.error('[tavily] 解密 API key 失败:', err)
      }
    }
  } catch {
    // 加密表不存在（迁移未跑），忽略
  }
  // 兼容旧明文（image_host_settings）
  const plainRow = db
    .prepare('SELECT value FROM image_host_settings WHERE key = ?')
    .get(TAVILY_KEY_SECRET) as { value: string } | undefined
  return plainRow?.value || null
}

function writeTavilyKey(apiKey: string): void {
  const db = getDb()
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统不支持安全加密存储，无法保存 Tavily API Key')
  }
  const encrypted = safeStorage.encryptString(apiKey)
  db.prepare(
    `INSERT INTO encrypted_secrets (key, encrypted_value, updated_at)
     VALUES (?, ?, unixepoch())
     ON CONFLICT(key) DO UPDATE SET
       encrypted_value = excluded.encrypted_value,
       updated_at = unixepoch()`
  ).run(TAVILY_KEY_SECRET, encrypted)
  // 同时清理旧的明文副本
  db.prepare('DELETE FROM image_host_settings WHERE key = ?').run(TAVILY_KEY_SECRET)
}

function deleteTavilyKey(): void {
  const db = getDb()
  db.prepare('DELETE FROM encrypted_secrets WHERE key = ?').run(TAVILY_KEY_SECRET)
  db.prepare('DELETE FROM image_host_settings WHERE key = ?').run(TAVILY_KEY_SECRET)
}

export function registerTavilyHandlers(): void {
  // 保存 Tavily API Key（加密存储）
  ipcMain.handle('tavily:set-key', (_event, apiKey: unknown) => {
    const safeApiKey = validateString(apiKey, 'apiKey', {
      minLength: 1,
      maxLength: TAVILY_KEY_MAX_LENGTH,
    })
    writeTavilyKey(safeApiKey)
    return { success: true }
  })

  // 获取 Tavily API Key（仅返回是否配置，不返回明文，避免泄露到 renderer）
  ipcMain.handle('tavily:get-key', () => {
    const key = readTavilyKey()
    return { apiKey: key ? '***' : null, configured: !!key }
  })

  // 删除 Tavily API Key
  ipcMain.handle('tavily:delete-key', () => {
    deleteTavilyKey()
    return { success: true }
  })

  // 搜索
  ipcMain.handle(
    'tavily:search',
    async (_event, query: unknown, maxResults?: unknown) => {
      const safeQuery = validateString(query, 'query', {
        minLength: 1,
        maxLength: QUERY_MAX_LENGTH,
      })
      const safeMaxResults =
        maxResults !== undefined
          ? validateNumber(maxResults, 'maxResults', {
              min: 1,
              max: MAX_RESULTS_LIMIT,
              integer: true,
            })
          : MAX_RESULTS_DEFAULT

      const apiKey = readTavilyKey()
      if (!apiKey) {
        return { error: '未配置 Tavily API Key', results: [] }
      }

      try {
        const resp = await fetch(TAVILY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: safeQuery,
            max_results: safeMaxResults,
            search_depth: 'basic',
            include_answer: true,
          }),
          signal: AbortSignal.timeout(20000),
        })

        if (!resp.ok) {
          const text = await resp.text()
          return {
            error: `Tavily API 错误: ${resp.status} ${text.slice(0, 200)}`,
            results: [],
          }
        }

        const data: TavilyResponse = await resp.json()
        return {
          results: (data.results || []).map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })),
        }
      } catch (err: unknown) {
        const e = err as Error & { name?: string }
        if (e.name === 'TimeoutError') {
          return { error: 'Tavily 搜索超时', results: [] }
        }
        return { error: e.message || '搜索失败', results: [] }
      }
    }
  )

  // 静默忽略未知异常：避免 ValidationError 信息泄露
  ipcMain.handle('tavily:test', () => {
    const key = readTavilyKey()
    return { configured: !!key, encrypted: safeStorage.isEncryptionAvailable() }
  })
}
