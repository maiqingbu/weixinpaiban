import { ipcMain } from 'electron'
import { lookup } from 'dns/promises'
import { validateString, ValidationError } from '../lib/validation'
import { isSafeExternalUrl, isPrivateIPv4, isPrivateIPv6 } from '../lib/urlSafety'

/**
 * 解析 hostname 获取实际 IP，校验是否指向内网。
 * 这是防 DNS rebinding 的关键步骤：仅校验 hostname 字符串不够，
 * 因为攻击者可以让一个合法域名解析到内网 IP。
 */
async function assertHostnameResolvesToPublic(hostname: string): Promise<void> {
  // 如果是字面 IP，直接走 isPrivateIPv4/IPv6 校验
  if (/^[\d.]+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`hostname 解析到内网 IP: ${hostname}`)
    }
    return
  }
  if (hostname.includes(':')) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`hostname 解析到内网 IPv6: ${hostname}`)
    }
    return
  }
  // 域名：用 dns.lookup 解析 A/AAAA 记录
  try {
    const { address } = await lookup(hostname, { all: false })
    if (isPrivateIPv4(address) || isPrivateIPv6(address)) {
      throw new Error(`域名 ${hostname} 解析到内网 IP: ${address}`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('解析到内网')) throw err
    // 解析失败时拒绝请求（保守策略）
    throw new Error(`域名解析失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function registerLinkCheckHandlers(): void {
  ipcMain.handle('check-link', async (_event, url: unknown) => {
    const safeUrl = validateString(url, 'url', { minLength: 1, maxLength: 2000 })
    if (!isSafeExternalUrl(safeUrl)) {
      throw new ValidationError('URL is not allowed (private/local addresses are blocked)', 'url')
    }
    const parsed = new URL(safeUrl)
    // DNS rebinding 防护：解析 hostname 看实际 IP 是否仍为公网
    await assertHostnameResolvesToPublic(parsed.hostname)
    try {
      // 手动跟随重定向，每次都重新校验目标地址
      let currentUrl = safeUrl
      let redirectCount = 0
      let response: Response
      while (true) {
        response = await fetch(currentUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
          redirect: 'manual',
        })
        if (response.status < 300 || response.status >= 400) break
        if (redirectCount >= 3) {
          return { url: safeUrl, ok: false, error: '重定向次数过多' }
        }
        const location = response.headers.get('location')
        if (!location) break
        const nextUrl = new URL(location, currentUrl).toString()
        if (!isSafeExternalUrl(nextUrl)) {
          return { url: safeUrl, ok: false, error: '重定向目标指向内网/本地' }
        }
        const nextParsed = new URL(nextUrl)
        await assertHostnameResolvesToPublic(nextParsed.hostname)
        currentUrl = nextUrl
        redirectCount++
      }
      return { url: safeUrl, ok: response.ok, status: response.status }
    } catch (e: unknown) {
      const err = e as Error
      return { url: safeUrl, ok: false, error: err.message }
    }
  })
}
