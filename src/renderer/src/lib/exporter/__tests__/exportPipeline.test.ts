import { describe, it, expect } from 'vitest'
import { exportForWechat, htmlToText } from '../index'
import { processCodeBlocks } from '../codeBlockProcess'
import { buildStylesheet } from '../buildStylesheet'
import { inlineStyles } from '../inlineStyles'
import { postProcess } from '../postProcess'
import { convertColumnsToTable } from '../columnsToTable'
import { convertEmbedCards } from '../cardConverters'
import type { Theme } from '@/themes/types'

// Minimal theme for testing
function makeTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    id: 'test-theme',
    name: 'Test Theme',
    styles: {
      container: { padding: '16px' },
      p: { fontSize: 16, lineHeight: 1.8, color: '#333' },
      h1: { fontSize: 24, fontWeight: 700 },
      h2: { fontSize: 20, fontWeight: 600 },
      h3: { fontSize: 18, fontWeight: 600 },
      h4: { fontSize: 16, fontWeight: 600 },
      strong: { fontWeight: 700 },
      em: { fontStyle: 'italic' },
      u: { textDecoration: 'underline' },
      s: { textDecoration: 'line-through' },
      a: { color: '#576b95' },
      ul: { paddingLeft: 24 },
      ol: { paddingLeft: 24 },
      li: { marginBottom: 4 },
      blockquote: { borderLeft: '3px solid #e5e7eb', paddingLeft: 12, color: '#6b7280' },
      code: { fontFamily: 'monospace', fontSize: 14 },
      pre: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 },
      preCode: { fontSize: 13 },
      hr: { border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' },
      img: { maxWidth: '100%' },
      table: { width: '100%', borderCollapse: 'collapse' },
      th: { fontWeight: 700, backgroundColor: '#f9fafb' },
      td: { padding: 8 },
      taskList: { listStyle: 'none', padding: 0 },
      taskItem: { listStyle: 'none' },
    },
    ...overrides,
  } as Theme
}

describe('processCodeBlocks', () => {
  it('leaves plain paragraphs unchanged', () => {
    const input = '<p>Hello World</p>'
    const result = processCodeBlocks(input)
    expect(result).toContain('Hello World')
    expect(result).toContain('<p>')
  })

  it('wraps code lines in section tags', () => {
    const input = '<pre><code>line1\nline2</code></pre>'
    const result = processCodeBlocks(input)
    expect(result).toContain('<section')
    expect(result).toContain('line1')
    expect(result).toContain('line2')
  })

  it('applies inline color for hljs classes', () => {
    const input = '<pre><code><span class="hljs-keyword">const</span></code></pre>'
    const result = processCodeBlocks(input)
    expect(result).toContain('color')
  })

  it('handles empty input', () => {
    expect(() => processCodeBlocks('')).not.toThrow()
    expect(() => processCodeBlocks('<p></p>')).not.toThrow()
  })

  it('handles HTML with special characters', () => {
    const input = '<p>Price &lt; 100 &amp; Free &gt; 50</p>'
    const result = processCodeBlocks(input)
    expect(result).not.toBe('')
  })
})

describe('buildStylesheet', () => {
  it('merges base styles with custom CSS', () => {
    const theme = makeTheme({ customCss: '.wx-root p { color: red; }' })
    const css = buildStylesheet(theme)
    // Should include both base styles and custom CSS
    expect(css).toContain('.wx-root {')
    expect(css).toContain('.wx-root p { color: red; }')
  })

  it('generates CSS from theme styles', () => {
    const theme = makeTheme()
    const css = buildStylesheet(theme)
    expect(css).toContain('.wx-root')
    expect(css).toContain('.wx-root p')
    expect(css).toContain('font-size')
  })
})

describe('inlineStyles', () => {
  it('inlines CSS into HTML elements', () => {
    const html = '<p>Hello</p>'
    const css = '.wx-root p { color: red; font-size: 16px; }'
    const result = inlineStyles(html, css)
    expect(result).toContain('color')
    expect(result).toContain('Hello')
  })

  it('handles empty HTML', () => {
    const result = inlineStyles('', '.wx-root p { color: red; }')
    expect(typeof result).toBe('string')
  })
})

describe('htmlToText', () => {
  it('strips HTML tags', () => {
    expect(htmlToText('<p>Hello</p>')).toBe('Hello')
  })

  it('converts br to newlines', () => {
    expect(htmlToText('Line1<br>Line2')).toBe('Line1\nLine2')
  })

  it('decodes HTML entities', () => {
    expect(htmlToText('Price &lt; 100 &amp; Free')).toBe('Price < 100 & Free')
  })
})

describe('convertColumnsToTable', () => {
  it('converts columns container to table', () => {
    const html = '<section data-columns-container="" data-direction="horizontal" data-widths="[60,40]" data-gap="16"><section data-column=""><p>Left</p></section><section data-column=""><p>Right</p></section></section>'
    const result = convertColumnsToTable(html)
    expect(result).toContain('<table')
    expect(result).toContain('Left')
    expect(result).toContain('Right')
    // Should NOT contain the original container attributes
    expect(result).not.toContain('data-columns-container')
  })

  it('handles HTML with no columns', () => {
    const input = '<p>Just a paragraph</p>'
    expect(convertColumnsToTable(input)).toBe(input)
  })
})

describe('postProcess', () => {
  it('removes class attributes', () => {
    const html = '<p class="my-class" style="color:red">Hello</p>'
    const result = postProcess(html)
    expect(result).not.toContain('my-class')
    expect(result).toContain('color')
  })

  it('removes data-template-id attributes', () => {
    const html = '<section data-template-id="qrcode" data-html="content">X</section>'
    const result = postProcess(html)
    expect(result).not.toContain('data-template-id')
  })

  it('adds font defaults to paragraphs', () => {
    const result = postProcess('<p>Hello</p>')
    expect(result).toContain('font-size')
    expect(result).toContain('line-height')
  })

  it('converts task list checkboxes', () => {
    const html = '<ul><li><input type="checkbox" checked=""><div>Done</div></li></ul>'
    const result = postProcess(html)
    expect(result).toContain('☑')
  })
})

describe('convertEmbedCards', () => {
  it('converts video card to placeholder', () => {
    const input = '<section data-video-card="" data-title="测试" data-account="@test" style="border:1px solid"></section>'
    const result = convertEmbedCards(input)
    expect(result).toContain('data-video-card-placeholder')
  })

  it('converts miniprogram card to placeholder', () => {
    const input = '<section data-miniprogram-card="" data-title="小程序" data-appid="wx123" style="border:1px solid"></section>'
    const result = convertEmbedCards(input)
    expect(result).toContain('data-miniprogram-card-placeholder')
  })
})

describe('exportForWechat - full pipeline', () => {
  it('exports simple HTML successfully', async () => {
    const html = '<p>Hello WeChat</p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty string for empty input', async () => {
    const theme = makeTheme()
    expect(await exportForWechat('', theme)).toBe('')
    expect(await exportForWechat('<p></p>', theme)).toBe('')
  })

  it('exports HTML with headings and formatting', async () => {
    const html = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em></p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('Title')
    expect(result).toContain('Paragraph')
  })

  it('exports HTML with code blocks', async () => {
    const html = '<pre><code>const x = 1;</code></pre>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('const')
  })

  it('exports HTML with images', async () => {
    const html = '<p>Before</p><img src="https://example.com/img.jpg" alt="test"><p>After</p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('img')
  })

  it('exports HTML with column containers', async () => {
    const html = '<p>Start</p><section data-columns-container="" data-direction="horizontal" data-widths="[50,50]" data-gap="16"><section data-column=""><p>Col1</p></section><section data-column=""><p>Col2</p></section></section><p>End</p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('Col1')
    expect(result).toContain('Col2')
    expect(result).toContain('<table')
  })

  it('exports HTML with embed cards', async () => {
    const html = '<p>Start</p><section data-video-card="" data-title="视频" data-account="@test" style="border:1px solid"></section><p>End</p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('data-video-card-placeholder')
    expect(result).toContain('Start')
    expect(result).toContain('End')
  })

  it('does not throw on malformed HTML', async () => {
    const html = '<p>Unclosed paragraph'
    const theme = makeTheme()
    await expect(exportForWechat(html, theme)).resolves.toBeTruthy()
  })

  it('does not throw on HTML with special characters', async () => {
    const html = '<p>Price &lt; 100 &amp; Free &gt; 50</p><p>Café résumé</p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toBeTruthy()
  })

  it('completes within reasonable time (no hang)', async () => {
    const html = '<p>Test content</p><h1>Title</h1><p>More content</p>'
    const theme = makeTheme()
    const start = Date.now()
    const result = await exportForWechat(html, theme)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000) // should complete quickly
    expect(result).toBeTruthy()
  })

  it('processes HTML with multiple code blocks', async () => {
    const html = '<p>Before</p><pre><code>const x = 1;\nconst y = 2;</code></pre><p>Middle</p><pre><code>function f() { return 1; }</code></pre><p>After</p>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('Before')
    expect(result).toContain('Middle')
    expect(result).toContain('After')
  })

  it('exports HTML with task list', async () => {
    const html = '<ul data-type="taskList"><li data-checked="true"><div>Done task</div></li><li><div>Pending task</div></li></ul>'
    const theme = makeTheme()
    const result = await exportForWechat(html, theme)
    expect(result).toContain('☑')
    expect(result).toContain('☐')
  })
})
