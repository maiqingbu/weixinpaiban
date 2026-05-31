import { describe, it, expect } from 'vitest'
import { convertVideoCards, convertMiniprogramCards, convertEmbedCards } from '../cardConverters'

function hasVideoPlaceholder(html: string): boolean {
  return /data-video-card-placeholder/.test(html)
}

function hasMiniprogramPlaceholder(html: string): boolean {
  return /data-miniprogram-card-placeholder/.test(html)
}

// renderHTML outputs section with data attributes, no inner content (contentEditable view only)
function makeVideoHtml(attrs: Record<string, string> = {}): string {
  const title = attrs.title || '测试视频'
  const account = attrs.account || '@testaccount'
  const finderUserName = attrs.finderUserName || ''
  const feedId = attrs.feedId || ''
  return [
    '<section data-video-card=""',
    `data-title="${title}"`,
    `data-account="${account}"`,
    finderUserName ? `data-finder-username="${finderUserName}"` : '',
    feedId ? `data-feed-id="${feedId}"` : '',
    'style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:1.5em 0;background:#fff;">',
    '</section>',
  ].join(' ')
}

function makeMiniprogramHtml(attrs: Record<string, string> = {}): string {
  const title = attrs.title || '测试小程序'
  const appid = attrs.appid || ''
  const path = attrs.path || ''
  const displayStyle = attrs.displayStyle || 'card'
  return [
    '<section data-miniprogram-card=""',
    `data-title="${title}"`,
    `data-description="${attrs.description || ''}"`,
    appid ? `data-appid="${appid}"` : '',
    path ? `data-path="${path}"` : '',
    `data-display-style="${displayStyle}"`,
    'style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:1.5em 0;background:#fff;">',
    '</section>',
  ].join(' ')
}

describe('convertVideoCards', () => {
  it('converts a video card section to placeholder', () => {
    const input = makeVideoHtml()
    const result = convertVideoCards(input)
    expect(hasVideoPlaceholder(result)).toBe(true)
  })

  it('preserves title and account in placeholder', () => {
    const input = makeVideoHtml({ title: '我的视频', account: '@myaccount' })
    const result = convertVideoCards(input)
    expect(result).toContain('data-title="我的视频"')
    expect(result).toContain('data-account="@myaccount"')
    expect(result).toContain('在公众号后台关联视频')
  })

  it('preserves finderUserName and feedId', () => {
    const input = makeVideoHtml({ finderUserName: 'wxid_abc', feedId: 'f001' })
    const result = convertVideoCards(input)
    expect(result).toContain('data-finder-username="wxid_abc"')
    expect(result).toContain('data-feed-id="f001"')
  })

  it('removes original data-video-card attribute', () => {
    const input = makeVideoHtml()
    const result = convertVideoCards(input)
    expect(result).not.toContain('data-video-card=""')
    expect(result).toContain('data-video-card-placeholder')
  })

  it('leaves non-video-card HTML unchanged', () => {
    const input = '<p>Normal paragraph</p><section>Normal section</section>'
    const result = convertVideoCards(input)
    expect(result).toBe(input)
  })

  it('preserves surrounding content', () => {
    const input = `<p>Before</p>${makeVideoHtml()}<p>After</p>`
    const result = convertVideoCards(input)
    expect(result).toContain('<p>Before</p>')
    expect(result).toContain('<p>After</p>')
  })
})

describe('convertMiniprogramCards', () => {
  it('converts a miniprogram card section to placeholder', () => {
    const input = makeMiniprogramHtml()
    const result = convertMiniprogramCards(input)
    expect(hasMiniprogramPlaceholder(result)).toBe(true)
  })

  it('preserves title and app info in placeholder', () => {
    const input = makeMiniprogramHtml({ title: '我的小程序', appid: 'wx123456', path: 'pages/index' })
    const result = convertMiniprogramCards(input)
    expect(result).toContain('data-appid="wx123456"')
    expect(result).toContain('data-path="pages/index"')
    expect(result).toContain('在公众号后台关联')
  })

  it('renders text mode differently', () => {
    const input = makeMiniprogramHtml({ title: '快速入口', displayStyle: 'text' })
    const result = convertMiniprogramCards(input)
    expect(hasMiniprogramPlaceholder(result)).toBe(true)
    expect(result).toContain('快速入口')
  })

  it('leaves non-miniprogram HTML untouched', () => {
    const input = '<div>Hello</div>'
    expect(convertMiniprogramCards(input)).toBe(input)
  })
})

describe('convertEmbedCards', () => {
  it('converts both video and miniprogram cards in one pass', () => {
    const combined = `<p>Start</p>${makeVideoHtml()}${makeMiniprogramHtml()}<p>End</p>`
    const result = convertEmbedCards(combined)

    expect(hasVideoPlaceholder(result)).toBe(true)
    expect(hasMiniprogramPlaceholder(result)).toBe(true)
    expect(result).toContain('<p>Start</p>')
    expect(result).toContain('<p>End</p>')
  })

  it('handles HTML with no cards', () => {
    const input = '<p>Just a paragraph</p>'
    expect(convertEmbedCards(input)).toBe(input)
  })
})

describe('HTML escaping', () => {
  it('escapes angle brackets and ampersands in title', () => {
    const input = makeVideoHtml({ title: 'Price < 100 & Free' })
    const result = convertVideoCards(input)
    expect(result).toContain('&lt;')
    expect(result).toContain('&amp;')
    expect(result).not.toContain('Price < 100')
  })
})
