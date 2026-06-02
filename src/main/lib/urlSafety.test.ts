import { describe, it, expect } from 'vitest'
import { isSafeExternalUrl, isPrivateIPv4, isPrivateIPv6, isPublicHttpUrl } from './urlSafety'

describe('isPrivateIPv4', () => {
  it('identifies RFC 1918 ranges', () => {
    expect(isPrivateIPv4('10.0.0.1')).toBe(true)
    expect(isPrivateIPv4('10.255.255.255')).toBe(true)
    expect(isPrivateIPv4('172.16.0.1')).toBe(true)
    expect(isPrivateIPv4('172.31.255.255')).toBe(true)
    expect(isPrivateIPv4('192.168.0.1')).toBe(true)
  })

  it('identifies loopback', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true)
    expect(isPrivateIPv4('127.255.255.255')).toBe(true)
  })

  it('identifies link-local and metadata', () => {
    expect(isPrivateIPv4('169.254.169.254')).toBe(true)
  })

  it('allows public IPs', () => {
    expect(isPrivateIPv4('8.8.8.8')).toBe(false)
    expect(isPrivateIPv4('1.1.1.1')).toBe(false)
    expect(isPrivateIPv4('172.32.0.1')).toBe(false)
    expect(isPrivateIPv4('172.15.0.1')).toBe(false)
  })
})

describe('isPrivateIPv6', () => {
  it('identifies loopback and special addresses', () => {
    expect(isPrivateIPv6('::1')).toBe(true)
    expect(isPrivateIPv6('::')).toBe(true)
    expect(isPrivateIPv6('fe80::1')).toBe(true)
  })

  it('identifies unique local addresses', () => {
    expect(isPrivateIPv6('fc00::1')).toBe(true)
    expect(isPrivateIPv6('fd00::1')).toBe(true)
  })

  it('identifies IPv4-mapped private addresses', () => {
    expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateIPv6('::ffff:192.168.1.1')).toBe(true)
  })

  it('allows public IPv6', () => {
    expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false)
  })
})

describe('isSafeExternalUrl', () => {
  it('accepts public http/https URLs', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
    expect(isSafeExternalUrl('https://api.openai.com/v1/chat')).toBe(true)
    expect(isSafeExternalUrl('http://example.com/path')).toBe(true)
  })

  it('rejects dangerous protocols', () => {
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('ftp://example.com')).toBe(false)
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects private/local hostnames', () => {
    expect(isSafeExternalUrl('http://localhost/foo')).toBe(false)
    expect(isSafeExternalUrl('http://127.0.0.1/admin')).toBe(false)
    expect(isSafeExternalUrl('http://0.0.0.0/')).toBe(false)
    expect(isSafeExternalUrl('http://[::1]/')).toBe(false)
  })

  it('rejects private IP ranges', () => {
    expect(isSafeExternalUrl('http://10.0.0.1/')).toBe(false)
    expect(isSafeExternalUrl('http://192.168.1.1/')).toBe(false)
    expect(isSafeExternalUrl('http://172.16.0.1/')).toBe(false)
    expect(isSafeExternalUrl('http://169.254.169.254/latest/meta-data')).toBe(false)
  })

  it('rejects .local/.internal/.lan domains', () => {
    expect(isSafeExternalUrl('http://server.local/')).toBe(false)
    expect(isSafeExternalUrl('http://app.internal/')).toBe(false)
    expect(isSafeExternalUrl('http://printer.lan/')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isSafeExternalUrl('not a url')).toBe(false)
    expect(isSafeExternalUrl('')).toBe(false)
  })
})

describe('isPublicHttpUrl', () => {
  it('returns true for valid public URLs', () => {
    expect(isPublicHttpUrl('https://example.com')).toBe(true)
  })

  it('returns false for unsafe URLs', () => {
    expect(isPublicHttpUrl('https://localhost')).toBe(false)
    expect(isPublicHttpUrl('ftp://example.com')).toBe(false)
  })
})

describe('isSafeExternalUrl (SSRF defense)', () => {
  it('blocks decimal/octal/hex IP encodings', () => {
    // 127.0.0.1 写成十进制整数
    expect(isSafeExternalUrl('http://2130706433/')).toBe(false)
    // 十六进制
    expect(isSafeExternalUrl('http://0x7f000001/')).toBe(false)
    // IPv4-mapped IPv6
    expect(isSafeExternalUrl('http://[::ffff:127.0.0.1]/')).toBe(false)
  })

  it('blocks file/gopher/javascript protocols', () => {
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('gopher://evil.com/')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('blocks userinfo with embedded creds', () => {
    // 攻击者可能通过 userinfo 隐藏 host 部分
    expect(isSafeExternalUrl('http://evil.com@127.0.0.1/')).toBe(false)
  })

  it('blocks 0.0.0.0 wildcard', () => {
    expect(isSafeExternalUrl('http://0.0.0.0/')).toBe(false)
  })
})
