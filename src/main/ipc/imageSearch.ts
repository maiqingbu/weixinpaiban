import { ipcMain, shell, BrowserWindow } from 'electron'
import { getDb } from '../db'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ── Pexels API helper ──

async function getPexelsKey(): Promise<string | null> {
  const row = getDb()
    .prepare('SELECT value FROM image_host_settings WHERE key = ?')
    .get('pexels_api_key') as { value: string } | undefined
  return row?.value || null
}

async function searchPexels(query: string, count: number, page: number): Promise<string[]> {
  const apiKey = await getPexelsKey()
  if (!apiKey) return []

  try {
    const resp = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&page=${page + 1}&orientation=landscape&size=medium`,
      {
        headers: { Authorization: apiKey, 'User-Agent': UA },
        signal: AbortSignal.timeout(15000),
      }
    )
    if (!resp.ok) return []

    const data = await resp.json()
    const images: string[] = []
    for (const photo of data.photos || []) {
      const url = photo.src?.large || photo.src?.medium || photo.src?.original || ''
      if (!url) continue
      try {
        const imgResp = await fetch(url, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(12000),
        })
        if (!imgResp.ok) continue
        const buffer = await imgResp.arrayBuffer()
        if (buffer.byteLength < 8000) continue
        const base64 = Buffer.from(buffer).toString('base64')
        const ct = imgResp.headers.get('content-type') || 'image/jpeg'
        images.push(`data:${ct};base64,${base64}`)
      } catch {
        continue
      }
      if (images.length >= count) break
    }
    return images
  } catch {
    return []
  }
}

// ── BrowserWindow-based search for Chinese search engines ──

function searchImagesViaBrowser(
  url: string,
  domExtractor: string,
  count: number,
  referer: string,
): Promise<{ images: string[]; urls: string[] }> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (images: string[], urls: string[]) => {
      if (settled) return
      settled = true
      if (!win.isDestroyed()) win.destroy()
      resolve({ images, urls })
    }

    const win = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    const timeout = setTimeout(() => finish([], []), 20000)

    win.loadURL(url, { userAgent: UA, httpReferrer: referer })

    win.webContents.on('did-finish-load', async () => {
      // Wait for DOM rendering (not image loading — we don't need that anymore)
      await new Promise((r) => setTimeout(r, 2000))

      try {
        const imgUrls: string[] = await win.webContents.executeJavaScript(`
          (() => {
            const seen = new Set()
            const results = []
            ${domExtractor}
            return results
          })()
        `)

        clearTimeout(timeout)

        if (imgUrls.length === 0) {
          finish([], [])
          return
        }

        // Deduplicate URLs from this source
        const uniqueUrls = [...new Set(imgUrls)].slice(0, count * 3)

        // Download images via main process
        const images: string[] = []
        const downloadedUrls: string[] = []
        for (const imgUrl of uniqueUrls) {
          if (images.length >= count) break
          try {
            const resp = await fetch(imgUrl, {
              headers: { 'User-Agent': UA, Referer: referer },
              signal: AbortSignal.timeout(10000),
            })
            if (!resp.ok) continue
            const buffer = await resp.arrayBuffer()
            if (buffer.byteLength < 6000) continue
            const base64 = Buffer.from(buffer).toString('base64')
            const ct = resp.headers.get('content-type') || 'image/jpeg'
            images.push(`data:${ct};base64,${base64}`)
            downloadedUrls.push(imgUrl)
          } catch {
            continue
          }
        }

        finish(images, downloadedUrls)
      } catch {
        clearTimeout(timeout)
        finish([], [])
      }
    })

    win.webContents.on('did-fail-load', () => {
      clearTimeout(timeout)
      finish([], [])
    })
  })
}

// ── URL normalizer for cross-source dedup ──

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // Strip query strings and fragments for dedup (different CDN params = same image)
    return u.origin + u.pathname
  } catch {
    return url
  }
}

// ── Content-based dedup ──

function dedupByContent(images: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const img of images) {
    // Extract a signature from the first 2KB of base64 data
    const sig = img.slice(0, 2000)
    if (seen.has(sig)) continue
    seen.add(sig)
    result.push(img)
  }
  return result
}

// ── Per-source configurations ──

interface ImageSource {
  name: string
  buildUrl: (q: string, seed: number) => string
  referer: string
  extractor: string
}

const CHINESE_SOURCES: ImageSource[] = [
  {
    name: 'baidu',
    buildUrl: (q: string, seed: number) =>
      `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(q)}&pn=${(seed % 8) * 30}`,
    referer: 'https://image.baidu.com/',
    extractor: `
      // Primary: data-objurl attributes on result cards
      document.querySelectorAll('[data-objurl]').forEach(el => {
        const u = el.getAttribute('data-objurl')
        if (u && u.startsWith('http')) results.push(u)
      })
      // Fallback: all img src attributes (no naturalWidth in hidden window)
      if (results.length < 8) {
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || img.getAttribute('data-src') || ''
          if (src.startsWith('http') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
            results.push(src)
          }
        })
      }
    `,
  },
  {
    name: 'sogou',
    buildUrl: (q: string, seed: number) =>
      `https://pic.sogou.com/pics?query=${encodeURIComponent(q)}&mode=1&start=${(seed % 10) * 48}`,
    referer: 'https://pic.sogou.com/',
    extractor: `
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src') || ''
        if (src.startsWith('http') && !src.includes('avatar') && !src.includes('icon')) {
          results.push(src)
        }
      })
      // Also try to get originals from links
      document.querySelectorAll('a[href*="http"]').forEach(a => {
        const href = a.getAttribute('href')
        if (href && href.match(/\.(jpg|jpeg|png|webp)/i)) results.push(href)
      })
    `,
  },
  {
    name: '360',
    buildUrl: (q: string, seed: number) =>
      `https://image.so.com/i?q=${encodeURIComponent(q)}&src=srp&pn=${30 + (seed % 8) * 30}`,
    referer: 'https://image.so.com/',
    extractor: `
      document.querySelectorAll('img').forEach(img => {
        const orig = img.getAttribute('data-original') || img.getAttribute('data-imgurl')
        if (orig && orig.startsWith('http')) results.push(orig)
        const src = img.src || img.getAttribute('data-src') || ''
        if (src.startsWith('http') && !src.includes('avatar') && !src.includes('icon')) {
          results.push(src)
        }
      })
    `,
  },
]

// ── Fetch images from all sources with dedup ──

async function fetchImagesFromAllSources(query: string, count: number, seed: number): Promise<string[]> {
  const allImages: string[] = []
  const seenUrls = new Set<string>()

  // 1. Try Pexels first (fast HTTP API, no BrowserWindow overhead)
  if (await getPexelsKey()) {
    try {
      const pexelsImages = await searchPexels(query, count, Math.floor(seed / 3))
      allImages.push(...pexelsImages)
    } catch { /* fall through to Chinese sources */ }
  }

  if (allImages.length >= count) return allImages.slice(0, count)

  // 2. Try Chinese search engines with rotated order
  const offset = seed % CHINESE_SOURCES.length
  const rotatedSources = [...CHINESE_SOURCES.slice(offset), ...CHINESE_SOURCES.slice(0, offset)]

  for (const source of rotatedSources) {
    if (allImages.length >= count) break
    try {
      const pageSeed = seed + Math.floor(allImages.length / 3)
      const { images } = await searchImagesViaBrowser(
        source.buildUrl(query, pageSeed),
        source.extractor,
        count - allImages.length,
        source.referer,
      )
      // Cross-source URL dedup
      for (const img of images) {
        if (allImages.length >= count) break
        const normalized = normalizeUrl(img)
        if (seenUrls.has(normalized)) continue
        seenUrls.add(normalized)
        allImages.push(img)
      }
    } catch {
      continue
    }
  }

  // Final content dedup
  return dedupByContent(allImages).slice(0, count)
}

// ── Register IPC handlers ──

export function registerImageSearchHandlers(): void {
  ipcMain.handle('image-search:open-browser', async (_event, query: string) => {
    const url = `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`
    await shell.openExternal(url)
    return { success: true }
  })

  ipcMain.handle('image-search:suggestions', async (_event, query: string, seed?: number) => {
    const s = typeof seed === 'number' ? seed : Math.floor(Math.random() * 100)
    const images = await fetchImagesFromAllSources(query, 4, s)
    return { images }
  })

  ipcMain.handle('image-search:download', async (_event, imageUrl: string) => {
    try {
      const resp = await fetch(imageUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(30000),
      })
      if (!resp.ok) return { error: `下载失败 (${resp.status})` }
      const buffer = await resp.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const ct = resp.headers.get('content-type') || 'image/jpeg'
      return { dataUrl: `data:${ct};base64,${base64}` }
    } catch (e: unknown) {
      return { error: (e as Error).message || '下载失败' }
    }
  })

  // Pexels API key management
  ipcMain.handle('image-search:set-pexels-key', async (_event, apiKey: string) => {
    const db = getDb()
    db.prepare(
      `INSERT INTO image_host_settings (key, value) VALUES ('pexels_api_key', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(apiKey)
    return { success: true }
  })

  ipcMain.handle('image-search:get-pexels-key', async () => {
    const row = getDb()
      .prepare('SELECT value FROM image_host_settings WHERE key = ?')
      .get('pexels_api_key') as { value: string } | undefined
    return { apiKey: row?.value || null }
  })

  ipcMain.handle('image-search:delete-pexels-key', async () => {
    getDb().prepare('DELETE FROM image_host_settings WHERE key = ?').run('pexels_api_key')
    return { success: true }
  })
}
