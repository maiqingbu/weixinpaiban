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
  if (!host.includes(':')) return false
  const lower = host.toLowerCase()
  if (lower === '::1' || lower === '::' || lower === 'fe80::' || lower === 'fe80::1') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice(7)
    if (PRIVATE_IPV4_RANGES.some((p) => p.test(v4))) return true
  }
  return false
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!SAFE_PROTOCOLS.has(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (PRIVATE_HOSTNAMES.has(host)) return false
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
