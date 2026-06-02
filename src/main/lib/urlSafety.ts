const SAFE_PROTOCOLS = new Set(['http:', 'https:'])

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^0\./
]

const PRIVATE_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1', '[::1]', 'broadcasthost'])

export function isPrivateIPv4(host: string): boolean {
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(host))
}

export function isPrivateIPv6(host: string): boolean {
  // URL.hostname 保留 IPv6 的方括号
  const lower = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!lower.includes(':')) return false
  if (lower === '::1' || lower === '::' || lower === 'fe80::' || lower === 'fe80::1') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6: 取后 32 bit 翻译为 IPv4
    const tail = lower.slice(7)
    // ::ffff:7f00:1 → "7f00:1" 或 "7f00:0001" → 转成 127.0.0.1
    const parts = tail.split(':')
    if (parts.length === 1) {
      // ::ffff:a.b.c.d
      if (PRIVATE_IPV4_RANGES.some((p) => p.test(parts[0]))) return true
    } else if (parts.length === 2) {
      const hi = parseInt(parts[0], 16) || 0
      const lo = parseInt(parts[1], 16) || 0
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
      if (PRIVATE_IPV4_RANGES.some((p) => p.test(v4))) return true
    }
  }
  return false
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!SAFE_PROTOCOLS.has(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (PRIVATE_HOSTNAMES.has(host) || PRIVATE_HOSTNAMES.has(host.replace(/^\[|\]$/g, ''))) return false
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return false
    if (isPrivateIPv4(host) || isPrivateIPv6(host)) return false
    return true
  } catch {
    return false
  }
}

export function isPublicHttpUrl(url: string): boolean {
  if (!isSafeExternalUrl(url)) return false
  try {
    const u = new URL(url)
    return SAFE_PROTOCOLS.has(u.protocol)
  } catch {
    return false
  }
}
