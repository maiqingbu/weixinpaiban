import { describe, it, expect } from 'vitest'
import { sanitizeHtmlForWeChat, sanitizeHtmlLight } from './sanitize'

describe('sanitizeHtmlForWeChat', () => {
  it('returns empty string for empty/non-string input', () => {
    expect(sanitizeHtmlForWeChat('')).toBe('')
    expect(sanitizeHtmlForWeChat(null as unknown as string)).toBe('')
    expect(sanitizeHtmlForWeChat(undefined as unknown as string)).toBe('')
  })

  it('preserves safe HTML', () => {
    const html = '<p>Hello <strong>World</strong></p>'
    const result = sanitizeHtmlForWeChat(html)
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>')
  })

  it('removes script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>'
    const result = sanitizeHtmlForWeChat(html)
    expect(result).not.toContain('<script')
    expect(result).not.toContain('alert')
  })

  it('removes event handlers', () => {
    const html = '<p onclick="alert(1)">Click</p>'
    const result = sanitizeHtmlForWeChat(html)
    expect(result).not.toContain('onclick')
  })

  it('removes javascript: URLs', () => {
    const html = '<a href="javascript:alert(1)">link</a>'
    const result = sanitizeHtmlForWeChat(html)
    expect(result).not.toContain('javascript:')
  })

  it('removes iframe tags', () => {
    const html = '<iframe src="evil.com"></iframe><p>safe</p>'
    const result = sanitizeHtmlForWeChat(html)
    expect(result).not.toContain('<iframe')
    expect(result).toContain('<p>')
  })

  it('preserves images with safe attributes', () => {
    const html = '<img src="https://example.com/x.jpg" alt="x" />'
    const result = sanitizeHtmlForWeChat(html)
    expect(result).toContain('img')
    expect(result).toContain('https://example.com/x.jpg')
  })
})

describe('sanitizeHtmlLight', () => {
  it('strips all tags but keeps text', () => {
    const html = '<p>Hello <strong>World</strong></p>'
    const result = sanitizeHtmlLight(html)
    expect(result).not.toContain('<p>')
    expect(result).not.toContain('<strong>')
    expect(result).toContain('Hello')
    expect(result).toContain('World')
  })

  it('handles empty input', () => {
    expect(sanitizeHtmlLight('')).toBe('')
    expect(sanitizeHtmlLight(null as unknown as string)).toBe('')
  })
})
