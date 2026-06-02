import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import { sanitizeHtmlForWeChat } from '../lib/sanitize'

let server: Server | null = null
let serverPort = 0
let serverToken = ''
let currentContent = ''
let currentTitle = '预览'

function generateToken(): string {
  return randomBytes(24).toString('hex')
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

function authenticate(req: IncomingMessage): boolean {
  if (!serverToken) return false
  const authHeader = req.headers['authorization']
  if (authHeader === `Bearer ${serverToken}`) return true
  const urlObj = new URL(req.url || '/', 'http://localhost')
  const queryToken = urlObj.searchParams.get('token')
  return queryToken === serverToken
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const urlObj = new URL(req.url || '/', 'http://localhost')
  const urlPath = urlObj.pathname

  if (urlPath === '/' || urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }

  const match = urlPath.match(/^\/preview(\/|$)/)
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>404 - 页面不存在</h1>')
    return
  }

  if (!authenticate(req)) {
    res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>401 - Unauthorized</h1>')
    return
  }

  const sanitized = sanitizeHtmlForWeChat(currentContent)
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(buildFullHtml(sanitized, currentTitle))
}

export async function startPreviewServer(): Promise<{ port: number; token: string }> {
  if (server) {
    return { port: serverPort, token: serverToken }
  }

  serverToken = generateToken()

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
        resolve({ port: serverPort, token: serverToken })
      } else {
        reject(new Error('Failed to get server address'))
      }
    })
  })
}

export function updatePreviewContent(html: string, title?: string): void {
  currentContent = html
  if (title) currentTitle = title
}

export function getPreviewToken(): string {
  return serverToken
}

export function getPreviewUrl(): string {
  if (!serverToken || !serverPort) return ''
  return `http://127.0.0.1:${serverPort}/preview?token=${serverToken}`
}

export async function stopPreviewServer(): Promise<void> {
  if (server) {
    return new Promise((resolve) => {
      server!.close(() => {
        server = null
        serverPort = 0
        serverToken = ''
        resolve()
      })
    })
  }
}
