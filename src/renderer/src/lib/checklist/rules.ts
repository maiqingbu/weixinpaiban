import type { Editor } from '@tiptap/core'
import type { ChecklistItem } from './types'
import type { Article } from '@/store/useAppStore'

export interface CheckContext {
  editor: Editor
  article: Article
  plainText: string
  wordCount: number
  typoCount: number
  sensitiveCount: number
  /** 图床是否已配置 */
  imageHostConfigured: boolean
  /** 图床提供商名称 */
  imageHostProvider: string
  /** AI 是否已配置 */
  aiConfigured: boolean
}

/** Dispatch event to open AI summary dialog */
function triggerAIGenerateSummary() {
  window.dispatchEvent(new CustomEvent('open-ai-summary'))
}

/** Dispatch event to open Title Analyzer */
function triggerOpenTitleAnalyzer() {
  window.dispatchEvent(new CustomEvent('open-title-analysis'))
}

/** Dispatch event to scroll to first typo */
function focusFirstTypo(editor: Editor) {
  editor.commands.setTextSelection({ from: 0, to: 0 })
  editor.commands.scrollIntoView()
  window.dispatchEvent(new CustomEvent('open-proofread'))
}

/** Dispatch event to scroll to first sensitive word */
function focusFirstSensitive(editor: Editor) {
  editor.commands.setTextSelection({ from: 0, to: 0 })
  editor.commands.scrollIntoView()
  window.dispatchEvent(new CustomEvent('open-proofread'))
}

export const CHECK_RULES: Array<(ctx: CheckContext) => ChecklistItem> = [
  // ===== 必查项 =====
  (ctx) => {
    const html = ctx.editor.getHTML()
    // Find the first content element in the article body (ignore empty/whitespace-only nodes)
    let firstHeadingText = ''
    let firstElementTag = ''
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const body = doc.body
      // Walk children to find the first element with visible text content
      for (const child of body.children) {
        const text = (child.textContent || '').replace(/ /g, ' ').trim()
        if (text.length > 0) {
          firstElementTag = child.tagName.toLowerCase()
          if (firstElementTag === 'h1' || firstElementTag === 'h2') {
            firstHeadingText = text
          }
          break
        }
      }
    } catch {
      // Fallback: try to match first H1/H2 at document start
      const m = html.match(/<(h[12])[ >][^>]*>([\s\S]*?)<\/\1>/i)
      if (m) {
        firstElementTag = m[1].toLowerCase()
        firstHeadingText = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()
      }
    }
    const hasHeadingAtStart = firstHeadingText.length > 0
    const articleTitle = ctx.article.title?.trim()
    const hasArticleTitle = !!articleTitle && articleTitle !== '无标题文章'
    const hasTitle = hasHeadingAtStart || hasArticleTitle
    const detail = !hasTitle
      ? '文章开头缺少标题（请在文章最前面添加 H1 或 H2 标题，或设置文章标题）'
      : hasHeadingAtStart
        ? hasArticleTitle
          ? `当前标题：${articleTitle}`
          : `检测到文章开头 ${firstElementTag.toUpperCase()}：${firstHeadingText.slice(0, 30)}${firstHeadingText.length > 30 ? '...' : ''}（建议同时设置文章标题字段）`
        : `当前标题：${articleTitle}（文章开头未检测到 H1/H2 标题）`
    return {
      id: 'title-not-empty',
      title: '标题不为空',
      severity: 'error',
      passed: hasTitle,
      detail,
      action: hasTitle
        ? {
            label: '想优化标题质量？标题分析 →',
            handler: () => triggerOpenTitleAnalyzer(),
          }
        : undefined,
    }
  },

  (ctx) => ({
    id: 'word-count-min',
    title: '文章字数 ≥ 300',
    severity: 'error',
    passed: ctx.wordCount >= 300,
    detail: `当前字数：${ctx.wordCount}`,
  }),

  (ctx) => {
    const base64Imgs = ctx.editor.getHTML().match(/<img[^>]*src="data:image\//g) || []
    const count = base64Imgs.length
    if (count === 0) {
      return {
        id: 'no-base64-images',
        title: '图片已上传图床（非 base64）',
        severity: 'warning',
        passed: true,
        detail: '通过',
      }
    }
    // 有 base64 图片：根据图床配置状态给出不同提示
    if (ctx.imageHostConfigured) {
      return {
        id: 'no-base64-images',
        title: '图片已上传图床（非 base64）',
        severity: 'warning',
        passed: false,
        detail: `${count} 张图仍为 base64 嵌入，图床（${ctx.imageHostProvider}）已配置，建议上传以减小文章体积`,
        action: {
          label: '前往上传',
          handler: () => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'image-host' } })),
        },
      }
    }
    return {
      id: 'no-base64-images',
      title: '图片已上传图床（非 base64）',
      severity: 'warning',
      passed: false,
      detail: `${count} 张图未上传图床，base64 嵌入会使公众号文章体积膨胀，影响加载速度。请先配置图床`,
      action: {
        label: '配置图床 →',
        handler: () => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'image-host' } })),
      },
    }
  },

  // ===== 建议项 =====
  (ctx) => ({
    id: 'has-summary',
    title: '摘要已填写',
    severity: 'warning',
    passed: !!ctx.article.summary?.trim() && ctx.article.summary.length >= 20,
    detail: !ctx.article.summary?.trim()
      ? '建议在 AI 助手中点"写摘要"生成'
      : ctx.article.summary.length < 20
        ? '摘要过短，建议至少 20 字'
        : `当前摘要：${ctx.article.summary.slice(0, 30)}...`,
    action: !ctx.article.summary?.trim()
      ? {
          label: 'AI 生成摘要',
          handler: () => triggerAIGenerateSummary(),
        }
      : undefined,
  }),

  (ctx) => ({
    id: 'has-cover',
    title: '封面已设置',
    severity: 'warning',
    passed: !!ctx.article.cover_image,
    detail: ctx.article.cover_image ? '已设置' : '未设置封面图（公众号文章建议设置）',
  }),

  (ctx) => {
    const html = ctx.editor.getHTML()
    const hasReadMoreUrl = !!ctx.article.read_more_url
    const hasFollowGuide =
      /关注/.test(html) &&
        (/点赞/.test(html) || /在看/.test(html) || /分享/.test(html)) ||
      /阅读原文/.test(html) ||
      html.includes('data-template-id="follow"') ||
      html.includes('data-template-id="qrcode"') ||
      hasReadMoreUrl
    return {
      id: 'has-follow-guide',
      title: '文末有关注引导或阅读原文',
      severity: 'warning',
      passed: hasFollowGuide,
      detail: hasFollowGuide
        ? hasReadMoreUrl
          ? '已配置阅读原文链接'
          : '通过'
        : '建议在文末插入关注引导模板（素材库 → 模板 → 关注引导）',
      action: hasReadMoreUrl
        ? undefined
        : {
            label: '配置阅读原文',
            handler: () => window.dispatchEvent(new CustomEvent('open-read-more-settings')),
          },
    }
  },

  (ctx) => ({
    id: 'no-typos',
    title: '错别字检测已通过',
    severity: 'warning',
    passed: ctx.typoCount === 0,
    detail:
      ctx.typoCount === 0
        ? '未发现错别字'
        : `发现 ${ctx.typoCount} 个疑似错别字未处理`,
    action: ctx.typoCount > 0
      ? {
          label: '跳转查看',
          handler: () => focusFirstTypo(ctx.editor),
        }
      : undefined,
  }),

  (ctx) => ({
    id: 'no-sensitive',
    title: '敏感词检测已通过',
    severity: 'warning',
    passed: ctx.sensitiveCount === 0,
    detail:
      ctx.sensitiveCount === 0
        ? '未发现敏感词'
        : `发现 ${ctx.sensitiveCount} 个敏感词未处理`,
    action: ctx.sensitiveCount > 0
      ? {
          label: '跳转查看',
          handler: () => focusFirstSensitive(ctx.editor),
        }
      : undefined,
  }),

  // ===== 可选项 =====
  (ctx) => ({
    id: 'word-count-optimal',
    title: '字数适中（800-3000）',
    severity: 'info',
    passed: ctx.wordCount >= 800 && ctx.wordCount <= 3000,
    detail:
      ctx.wordCount < 800
        ? `字数偏少（${ctx.wordCount}），可能内容不够丰富`
        : ctx.wordCount > 3000
          ? `字数偏多（${ctx.wordCount}），读者可能没耐心读完`
          : `当前字数：${ctx.wordCount}（理想范围）`,
  }),

  (ctx) => {
    const html = ctx.editor.getHTML()
    const imgCount = (html.match(/<img/g) || []).length
    const paras = ctx.plainText.split(/\n+/).filter((p) => p.trim()).length
    const ratio = paras > 0 ? imgCount / paras : 0
    return {
      id: 'image-text-ratio',
      title: '合理的图文比例',
      severity: 'info',
      passed: ratio >= 0.1 && ratio <= 0.5,
      detail:
        imgCount === 0
          ? '一张图都没有，建议至少配 1-2 张'
          : ratio < 0.1
            ? `图片偏少（${imgCount} 张 / ${paras} 段）`
            : ratio > 0.5
              ? `图片偏多（${imgCount} 张 / ${paras} 段），可能影响阅读`
              : `图文比例适中（${imgCount} 张 / ${paras} 段）`,
    }
  },

  (ctx) => {
    const html = ctx.editor.getHTML()
    // Check if the first content element is H1 or H2
    let hasHeadingAtStart = false
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      for (const child of doc.body.children) {
        const text = (child.textContent || '').replace(/ /g, ' ').trim()
        if (text.length > 0) {
          const tag = child.tagName.toLowerCase()
          if (tag === 'h1' || tag === 'h2') {
            hasHeadingAtStart = true
          }
          break
        }
      }
    } catch {
      // Fallback
      hasHeadingAtStart = /^\s*<(h[12])[ >]/.test(html)
    }
    return {
      id: 'has-headings',
      title: '文章开头有 H1 或 H2 标题',
      severity: 'info',
      passed: hasHeadingAtStart,
      detail: hasHeadingAtStart ? '通过' : '建议在文章开头添加 H1 或 H2 标题，提升阅读体验',
    }
  },
]
