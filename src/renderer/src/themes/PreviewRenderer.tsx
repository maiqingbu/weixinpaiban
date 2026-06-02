import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import type { Theme } from './types'

function cssPropsToString(props: React.CSSProperties): string {
  return Object.entries(props)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${cssKey}: ${value}`
    })
    .join('; ')
}

/**
 * 防止 CSS 内容中包含的 </style> 提前闭合 <style> 标签，
 * 进而允许后续 HTML 中注入 <script> 等可执行内容。
 * 通过把字符串 "</" 替换为 "<\/"（CSS 兼容转义）。
 */
function escapeStyleTag(css: string): string {
  return css.replace(/<\/(style)/gi, '<\\/$1')
}

function generateThemeCSS(theme: Theme): string {
  const s = theme.styles
  return `
.theme-${theme.id} { ${cssPropsToString(s.container)} }
.theme-${theme.id} p {
  ${cssPropsToString(s.p)}
  /* 空段落（用户手动换行）保持可见高度，避免 margin collapse 导致空白行消失 */
}
.theme-${theme.id} p:empty {
  min-height: 1.2em;
}
.theme-${theme.id} p:has(br:only-child) {
  min-height: 1.2em;
}
.theme-${theme.id} h1 { ${cssPropsToString(s.h1)} }
.theme-${theme.id} h2 { ${cssPropsToString(s.h2)} }
.theme-${theme.id} h3 { ${cssPropsToString(s.h3)} }
.theme-${theme.id} h4 { ${cssPropsToString(s.h4)} }
.theme-${theme.id} strong { ${cssPropsToString(s.strong)} }
.theme-${theme.id} em { ${cssPropsToString(s.em)} }
.theme-${theme.id} u { ${cssPropsToString(s.u)} }
.theme-${theme.id} s { ${cssPropsToString(s.s)} }
.theme-${theme.id} a { ${cssPropsToString(s.a)} }
.theme-${theme.id} ul { ${cssPropsToString(s.ul)} }
.theme-${theme.id} ol { ${cssPropsToString(s.ol)} }
.theme-${theme.id} li { ${cssPropsToString(s.li)} }
.theme-${theme.id} blockquote { ${cssPropsToString(s.blockquote)} }
.theme-${theme.id} code { ${cssPropsToString(s.code)} }
.theme-${theme.id} pre { ${cssPropsToString(s.pre)} }
.theme-${theme.id} pre code { ${cssPropsToString(s.preCode)} }
.theme-${theme.id} hr { ${cssPropsToString(s.hr)} }
.theme-${theme.id} img { ${cssPropsToString(s.img)} }
.theme-${theme.id} table { ${cssPropsToString(s.table)} }
.theme-${theme.id} th { ${cssPropsToString(s.th)} }
.theme-${theme.id} td { ${cssPropsToString(s.td)} }
.theme-${theme.id} ul[data-type="taskList"] { ${cssPropsToString(s.taskList)} }
.theme-${theme.id} ul[data-type="taskList"] li { ${cssPropsToString(s.taskItem)} }
.theme-${theme.id} ul[data-type="taskList"] li > label { display: none; }
.theme-${theme.id} ul[data-type="taskList"] li > div { flex: 1; }
.theme-${theme.id} .hljs { color: inherit; }
`
}

function placeholderDiv(text: string): string {
  return `<div style="display:flex;align-items:center;justify-content:center;height:180px;background:#f3f4f6;border:2px dashed #d1d5db;border-radius:8px;margin:16px 0;box-sizing:border-box;max-width:100%;"><span style="font-size:14px;color:#9ca3af;text-align:center;padding:0 24px;">🖼 ${text}</span></div>`
}

/**
 * 替换占位符为稳定元素：
 * 1. <!-- IMG:xxx --> 注释占位符
 * 2. via.placeholder.com / placehold.co 外部占位图片（国内不可达）
 */
function replaceImagePlaceholders(html: string): string {
  let result = html

  result = result.replace(
    /<!--\s*IMG:\s*(.*?)\s*-->/g,
    (_match, desc: string) => placeholderDiv(desc.trim() || '配图占位')
  )

  result = result.replace(
    /<img\b[^>]*\bsrc\s*=\s*"(https?:\/\/(?:via\.placeholder\.com|placehold\.co)[^"]*)"[^>]*>/gi,
    (_m, src: string) => {
      const text = decodeURIComponent(src.match(/text=([^&]*)/)?.[1] || '占位图片')
      return placeholderDiv(text)
    }
  )

  return result
}

function processTaskListCheckboxes(html: string): string {
  return html
    .replace(
      /<li>(\s*<label[^>]*>\s*<input[^>]*type="checkbox"[^>]*data-checked="true"[^>]*\/?>\s*<\/label>)/g,
      '<li><span style="margin-right:6px">✓</span>$1'
    )
    .replace(
      /<li>(\s*<label[^>]*>\s*<input[^>]*type="checkbox"[^>]*\/?>\s*<\/label>)/g,
      '<li><span style="margin-right:6px">▢</span>$1'
    )
}

/**
 * 展开样式块：将 <div data-styled-block="true" data-styled-html="..."> 替换为实际内容。
 * 在 DOMPurify 清洗前调用。
 */
function expandStyledBlocks(html: string): string {
  return html.replace(
    /<div([^>]*data-styled-block="true"[^>]*)\s*data-styled-html="([^"]*)"[^>]*>[^<]*<\/div>/g,
    (_match, _attrs, encodedHtml) => {
      return encodedHtml
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    }
  )
}

/**
 * 展开模板块：将 <section data-html="..."> 替换为包含实际内容的 section。
 * 在 DOMPurify 清洗前调用，确保模板内容不被剥离。
 * 同时读取 data-rotation，对图片应用旋转、对文字应用反向旋转。
 */
function expandTemplateBlocks(html: string): string {
  return html.replace(
    /<section([^>]*data-template-id="[^"]*"[^>]*)\s*data-html="([^"]*)"[^>]*>\s*<\/section>/g,
    (_match, attrs, encodedHtml) => {
      const content = encodedHtml
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      // 提取旋转角度
      const rotMatch = attrs.match(/data-rotation="(-?\d+)"/)
      const rotation = rotMatch ? parseInt(rotMatch[1], 10) : 0
      if (rotation !== 0) {
        return `<section${attrs}>${applyRotationToHtml(content, rotation)}</section>`
      }
      return `<section${attrs}>${content}</section>`
    }
  )
}

/**
 * 对模板 HTML 中的图片应用旋转、文字应用反向旋转。
 * 通过正则在 img 标签上注入 style，对纯文字元素注入反向旋转。
 */
function applyRotationToHtml(html: string, angle: number): string {
  const imgTransform = `transform:rotate(${angle}deg);transform-origin:center center;`
  const textTransform = `transform:rotate(${-angle}deg);`

  // 给 <img 标签注入旋转样式（合并到已有 style 或新增）
  let result = html.replace(/<img\b([^>]*?)\bstyle="([^"]*)"([^>]*)/gi, (_m, before, style, after) => {
    if (style.includes('transform')) return _m // 已有 transform，跳过
    return `<img${before}style="${imgTransform}${style}"${after}`
  })
  result = result.replace(/<img(?![^>]*\bstyle=)(\s)/gi, (_m, sp) => {
    return `<img style="${imgTransform}"${sp}`
  })

  // 给纯文字标签注入反向旋转
  const textTags = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'em', 'strong', 'b', 'i', 'u', 'label', 'a']
  for (const tag of textTags) {
    // 已有 style 属性的：合并
    const reStyle = new RegExp(`<${tag}\\b([^>]*?)\\bstyle="([^"]*)"([^>]*)`, 'gi')
    result = result.replace(reStyle, (_m, before, style, after) => {
      if (style.includes('transform')) return _m
      return `<${tag}${before}style="${textTransform}${style}"${after}`
    })
    // 没有 style 属性的：新增
    const reNoStyle = new RegExp(`<${tag}(?![^>]*\\bstyle=)(\\s|>)`, 'gi')
    result = result.replace(reNoStyle, (_m, after) => {
      return `<${tag} style="${textTransform}"${after}`
    })
  }
  return result
}

interface PreviewRendererProps {
  html: string
  theme: Theme
}

function PreviewRenderer({ html, theme }: PreviewRendererProps): React.JSX.Element {
  const cleanHtml = useMemo(() => {
    const expanded = expandStyledBlocks(expandTemplateBlocks(html))
    const withPlaceholders = replaceImagePlaceholders(expanded)
    const sanitized = DOMPurify.sanitize(withPlaceholders, {
      ADD_ATTR: ['data-type', 'data-checked', 'class', 'data-template-id', 'data-material-id', 'data-editable', 'data-editable-img', 'data-html', 'data-styled-block', 'data-styled-html', 'data-rotation', 'contenteditable', 'style'],
      ADD_TAGS: ['span'],
    })
    return processTaskListCheckboxes(sanitized)
  }, [html])

  const themeCSS = useMemo(() => {
    if (theme.customCss && theme.customCss.includes('.wx-root {')) {
      // Custom theme with complete raw CSS
      return theme.customCss.replace(/\.wx-root/g, `.theme-${theme.id}`)
    }
    // Preset theme: base styles + optional custom CSS enhancements
    const base = generateThemeCSS(theme)
    const columnsFix = `
.theme-${theme.id} [data-columns-container] {
  width: 100%;
}
.theme-${theme.id} [data-columns-container][data-direction="vertical"] > [data-column] {
  flex: 1 1 auto !important;
  width: 100% !important;
  min-width: 0 !important;
}
.theme-${theme.id} [data-column] {
  min-width: 0;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-break: break-word;
}
.theme-${theme.id} [data-column] img {
  max-width: 100%;
  height: auto;
  display: block;
}
`
    if (theme.customCss) {
      const scoped = theme.customCss.replace(/\.wx-root/g, `.theme-${theme.id}`)
      return base + '\n' + columnsFix + '\n' + scoped
    }
    return base + '\n' + columnsFix
  }, [theme])

  const isEmpty = !cleanHtml || cleanHtml === '<p></p>' || cleanHtml === '<p><br></p>'

  if (isEmpty) {
    return (
      <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: '14px', padding: '60px 20px' }}>
        在左侧编辑器开始写作，预览会同步显示
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: escapeStyleTag(themeCSS) }} />
      <div
        className={`theme-${theme.id}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    </>
  )
}

export { PreviewRenderer }
