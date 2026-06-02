import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import { sanitizeHtmlForWeChat } from '../lib/sanitize'

interface PreviewEntry {
  id: string
  token: string
  title: string
  html: string
  createdAt: number
}

let server: Server | null = null
let serverPort = 0
const previews = new Map<string, PreviewEntry>()

function generateToken(): string {
  return randomBytes(24).toString('hex')
}

function generateId(): string {
  return randomBytes(8).toString('hex')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFullHtml(html: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; img-src * data:; font-src * data:;">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      max-width: 720px;
      margin: 20px auto;
      padding: 0 16px;
      font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif;
      color: #333;
      line-height: 1.75;
    }
    p { margin: 0.5em 0; }
    p:empty, p:has(br:only-child) { min-height: 1.2em; }
    @media (max-width: 480px) {
      body { margin: 10px auto; padding: 0 12px; }
    }
    img { max-width: 100%; height: auto; }
    pre { overflow-x: auto; }
  </style>
</head>
<body>${html}</body>
</html>`
}

/**
 * 校验请求 token 是否匹配指定 id。
 * 支持两种方式：Authorization: Bearer <token> 或 ?id=X&token=Y。
 */
function authenticatePreview(req: IncomingMessage, urlObj: URL): PreviewEntry | null {
  const id = urlObj.searchParams.get('id')
  const queryToken = urlObj.searchParams.get('token')
  const authHeader = req.headers['authorization']

  // 方式 1：query 参数
  if (id && queryToken) {
    const entry = previews.get(id)
    if (entry && entry.token === queryToken) return entry
  }

  // 方式 2：Authorization header + 路径中的 id
  if (authHeader && id) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    const entry = previews.get(id)
    if (entry && entry.token === token) return entry
  }

  return null
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const urlObj = new URL(req.url || '/', 'http://localhost')
  const urlPath = urlObj.pathname

  if (urlPath === '/' || urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }

  // 路径：/p/{id}?token=...
  const match = urlPath.match(/^\/p\/([a-f0-9]+)$/i)
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>404 - 页面不存在</h1>')
    return
  }

  // id 来自 path（强类型），token 来自 query 或 header
  urlObj.searchParams.set('id', match[1])
  const entry = authenticatePreview(req, urlObj)
  if (!entry) {
    res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>401 - Unauthorized</h1>')
    return
  }

  const sanitized = sanitizeHtmlForWeChat(entry.html)
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(buildFullHtml(sanitized, entry.title))
}

export function ensureServer(): Promise<{ port: number }> {
  if (server && serverPort) {
    return Promise.resolve({ port: serverPort })
  }
  return new Promise((resolve, reject) => {
    server = createServer(handleRequest)
    server.on('error', (err) => {
      console.error('[preview-server] error:', err)
      server = null
      reject(err)
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server?.address()
      if (addr && typeof addr === 'object') {
        serverPort = addr.port
        console.log(`[preview-server] listening on http://127.0.0.1:${serverPort}`)
        resolve({ port: serverPort })
      } else {
        reject(new Error('Failed to get server address'))
      }
    })
  })
}

export async function createPreview(html: string, title: string): Promise<{
  id: string
  token: string
  url: string
  createdAt: number
}> {
  const { port } = await ensureServer()
  const id = generateId()
  const token = generateToken()
  const entry: PreviewEntry = {
    id,
    token,
    title: title || '预览',
    html,
    createdAt: Math.floor(Date.now() / 1000),
  }
  previews.set(id, entry)
  return {
    id,
    token,
    url: `http://127.0.0.1:${port}/p/${id}?token=${token}`,
    createdAt: entry.createdAt,
  }
}

export function updatePreview(id: string, html: string, title?: string): boolean {
  const entry = previews.get(id)
  if (!entry) return false
  entry.html = html
  if (title) entry.title = title
  return true
}

export function deletePreview(id: string): boolean {
  return previews.delete(id)
}

export function listPreviews(): Array<{
  id: string
  title: string
  created_at: number
  url: string
}> {
  if (!serverPort) return []
  return Array.from(previews.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => ({
      id: p.id,
      title: p.title,
      created_at: p.createdAt,
      url: `http://127.0.0.1:${serverPort}/p/${p.id}?token=${p.token}`,
    }))
}

export function getPreviewToken(id: string): string {
  return previews.get(id)?.token ?? ''
}

export function getPreviewUrl(id: string): string {
  if (!serverPort) return ''
  const entry = previews.get(id)
  if (!entry) return ''
  return `http://127.0.0.1:${serverPort}/p/${id}?token=${entry.token}`
}

export async function stopAllPreviews(): Promise<void> {
  previews.clear()
  if (server) {
    const s = server
    server = null
    serverPort = 0
    await new Promise<void>((resolve) => s.close(() => resolve()))
  }
}

// 兼容旧 API：单个 active preview
let activePreviewId: string | null = null
export async function startPreviewServer(): Promise<{ port: number; token: string; url: string }> {
  const result = await createPreview('', '预览')
  activePreviewId = result.id
  return { port: serverPort, token: result.token, url: result.url }
}

export function updatePreviewContent(html: string, title?: string): boolean {
  if (!activePreviewId) return false
  return updatePreview(activePreviewId, html, title)
}

export function getActivePreviewId(): string {
  return activePreviewId ?? ''
}

export function getActivePreviewToken(): string {
  if (!activePreviewId) return ''
  return getPreviewToken(activePreviewId)
}

export function getActivePreviewUrl(): string {
  if (!activePreviewId) return ''
  return getPreviewUrl(activePreviewId)
}

export async function stopPreviewServer(): Promise<void> {
  if (activePreviewId) {
    deletePreview(activePreviewId)
    activePreviewId = null
  }
}
