import DOMPurify from 'dompurify'
import type { CustomMaterialKind } from '../types'

// detectMaterialKind 需要返回 'columns' 类型，扩展类型定义

/**
 * 清洁 HTML：剥掉 ProseMirror 注入的临时属性，再用 DOMPurify 兜底清洗
 * - 移除 <script> / <iframe> / <object> / <embed> 等危险标签
 * - 移除所有 on* 事件属性
 * - 移除 javascript: 协议的链接
 */
export function cleanHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  // 1. 移除 ProseMirror 临时属性（保留 data-column、data-columns-container 等结构属性）
  const stripped = html.replace(
    /\s(data-pm-slice|data-pm-type|data-node-view-content|data-id|data-type)[^"']*(?:"[^"]*"|'[^']*')?/gi,
    ''
  )
  // 2. DOMPurify 兜底：只允许可视化标签，禁止脚本/事件/javascript: 链接
  const ALLOWED_TAGS = [
    'a', 'b', 'i', 'em', 'strong', 'u', 's', 'code', 'pre', 'br', 'hr',
    'p', 'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'q', 'cite', 'abbr', 'mark', 'small', 'sub', 'sup', 'time',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    'img', 'figure', 'figcaption', 'video', 'audio', 'source',
    'ruby', 'rp', 'rt',
    'details', 'summary',
    'del', 'ins', 'kbd', 'samp', 'var', 'wbr',
  ]
  try {
    return DOMPurify.sanitize(stripped, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: [
        'class', 'style', 'href', 'target', 'rel', 'title', 'alt', 'src',
        'width', 'height', 'colspan', 'rowspan', 'align', 'valign',
        'id', 'data-columns-container', 'data-column', 'data-template-id',
        'data-material-id', 'data-styled-block', 'data-styled-html', 'data-rotation',
        'data-html', 'data-editable', 'data-editable-img', 'data-type', 'data-checked',
        'controls', 'preload', 'poster', 'loop', 'muted', 'autoplay',
      ],
      ALLOW_DATA_ATTR: true,
      KEEP_CONTENT: true,
      ALLOW_UNKNOWN_PROTOCOLS: false, // 禁止 javascript: / data: 等危险协议
    }) as string
  } catch (err) {
    console.error('[converter] Failed to sanitize HTML:', err)
    return stripped
  }
}

/**
 * 自动判断素材类型
 * - 包含 data-template-id → template（锁定样式）
 * - 包含 data-columns-container → columns（分栏布局）
 * - 单行 <hr> 或 <section> 且文字 < 30 字 → divider
 * - 其他 → snippet
 */
export function detectMaterialKind(html: string): CustomMaterialKind {
  try {
    // 检查是否包含 templateBlock 节点
    if (html.includes('data-template-id') || html.includes('data-material-id')) {
      return 'template'
    }

    // 检查是否是分栏布局
    if (html.includes('data-columns-container')) {
      return 'columns'
    }

    // 检查是否是分割线类
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const text = tempDiv.textContent || ''

    if (html.trim().startsWith('<hr') || html.trim() === '<hr/>') {
      return 'divider'
    }

    const sections = tempDiv.querySelectorAll('section')
    if (sections.length === 1 && text.trim().length < 30 && !tempDiv.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, table, img')) {
      return 'divider'
    }
  } catch {
    // ignore parse errors
  }

  return 'snippet'
}

/**
 * 生成缩略图 HTML
 * 策略：提取纯文本 + 第一个元素的背景色，生成简洁的缩略图
 */
export function generateThumbnail(html: string): string {
  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const text = (tempDiv.textContent || '').trim().slice(0, 20) || '自定义素材'

    // 提取第一个元素的背景色
    const firstEl = tempDiv.firstElementChild as HTMLElement | null
    const bgStyle = firstEl?.style?.background || firstEl?.style?.backgroundColor || '#f5f5f5'

    return `<div style="background:${bgStyle};padding:8px 12px;border-radius:4px;font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${text}</div>`
  } catch {
    return '<div style="padding:8px 12px;font-size:12px;color:#999;">自定义素材</div>'
  }
}

/**
 * 为 template 类型素材自动添加 data-editable 标记
 * 策略：把所有"纯文本子节点"的父元素自动加上 data-editable
 */
export function addEditableMarkers(html: string): string {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // 找到所有包含纯文本的叶子元素
  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_ELEMENT)
  const elements: Element[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const el = node as Element
    // 跳过已有 data-editable 的
    if (el.hasAttribute('data-editable')) continue
    // 检查是否只包含文本（没有子元素）
    if (el.children.length === 0 && el.textContent && el.textContent.trim().length > 0) {
      elements.push(el)
    }
  }

  // 给这些元素加 data-editable
  for (const el of elements) {
    el.setAttribute('data-editable', 'true')
  }

  return tempDiv.innerHTML
}

/**
 * 将选中的 HTML 转换为可保存的素材数据
 */
export function selectionToMaterialData(html: string, name: string, keywords: string[]): {
  name: string
  kind: CustomMaterialKind
  keywords: string[]
  thumbnail: string
  html: string
} {
  const cleanedHtml = cleanHtml(html)
  const kind = detectMaterialKind(cleanedHtml)
  const finalHtml = kind === 'template' ? addEditableMarkers(cleanedHtml) : cleanedHtml
  const thumbnail = generateThumbnail(finalHtml)

  return {
    name,
    kind,
    keywords,
    thumbnail,
    html: finalHtml,
  }
}
