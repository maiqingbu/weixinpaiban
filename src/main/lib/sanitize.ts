import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import type { Config } from 'dompurify'

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window as unknown as Window & typeof globalThis)

const WEIXIN_ALLOWED_TAGS = [
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'nav',
  'ol',
  'p',
  'pre',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul',
  'var',
  'video',
  'audio',
  'source',
  'wbr'
]

const WEIXIN_ALLOWED_ATTR = [
  'class',
  'style',
  'href',
  'target',
  'rel',
  'title',
  'alt',
  'src',
  'width',
  'height',
  'data-src',
  'data-type',
  'data-w',
  'data-ratio',
  'data-s',
  'data-lazy-src',
  'id',
  'colspan',
  'rowspan',
  'align',
  'valign',
  'border',
  'cellpadding',
  'cellspacing',
  'frameborder',
  'scrolling',
  'controls',
  'preload',
  'poster',
  'loop',
  'muted',
  'autoplay',
  'color',
  'face',
  'size'
]

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: WEIXIN_ALLOWED_TAGS,
  ALLOWED_ATTR: WEIXIN_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  USE_PROFILES: { html: true }
}

export function sanitizeHtmlForWeChat(html: string): string {
  if (!html || typeof html !== 'string') return ''
  try {
    return DOMPurify.sanitize(html, PURIFY_CONFIG) as string
  } catch (err) {
    console.error('[sanitize] Failed to sanitize HTML:', err)
    return ''
  }
}

export function sanitizeHtmlLight(html: string): string {
  if (!html || typeof html !== 'string') return ''
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    }) as string
  } catch (err) {
    console.error('[sanitize] Failed to sanitize HTML:', err)
    return ''
  }
}
