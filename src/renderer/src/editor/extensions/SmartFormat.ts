import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartFormat: {
      /** 一键智能排版：分析文章结构，自动设置段落/标题/图片样式 */
      smartFormat: () => ReturnType
    }
  }
}

// ── 标题检测规则 ──

/** 句子结束标点 */
const SENTENCE_END = /[。！？…~]$/

/** 编号模式：一、| 1. | （一）| 第X章 等 */
const NUMBERED_HEADING = /^[（(]?[一二三四五六七八九十百千万\d]+[）).、\s]/

/** 常见标题关键词 */
const TITLE_KEYWORDS = /前言|引言|结语|总结|结论|附录|参考|致谢|写在最后|写在前面|背景介绍|核心观点|划重点/

function isHeadingCandidate(text: string): boolean {
  if (!text || text.length > 40) return false
  if (SENTENCE_END.test(text)) return false
  return true
}

function isStrongHeadingCandidate(text: string): boolean {
  if (NUMBERED_HEADING.test(text)) return true
  if (TITLE_KEYWORDS.test(text)) return true
  return false
}

function determineHeadingLevel(text: string, prevIsHeading: boolean): 2 | 3 | 4 {
  if (isStrongHeadingCandidate(text)) {
    return prevIsHeading ? 3 : 2
  }
  return prevIsHeading ? 3 : 2
}

// ── 扩展实现 ──

export const SmartFormat = Extension.create({
  name: 'smartFormat',

  addCommands() {
    return {
      smartFormat:
        () =>
        ({ editor }) => {
          const { state } = editor
          const { doc, schema } = state

          // 单事务完成所有修改，避免多次 dispatch 导致冲突
          const tr = state.tr
          let prevIsHeading = false

          // 第一遍：识别标题段落
          const headingPositions: { pos: number; level: 2 | 3 | 4 }[] = []
          const visited = new Set<number>()

          doc.descendants((node, pos) => {
            if (visited.has(pos)) return true
            if (node.type.name === 'paragraph') {
              visited.add(pos)
              const text = node.textContent.trim()
              if (text && isHeadingCandidate(text)) {
                const level = determineHeadingLevel(text, prevIsHeading)
                headingPositions.push({ pos, level })
                prevIsHeading = true
              } else {
                prevIsHeading = false
              }
            }
            return true
          })

          // 第二遍：转换标题 + 收集需格式化节点
          for (const { pos, level } of headingPositions) {
            tr.setNodeMarkup(pos, schema.nodes.heading, { level })
          }

          // 第三遍：遍历最终文档，应用 body 段落样式 + 标题样式 + 图片居中
          // 使用 tr.doc 读取事务中间状态（已包含标题转换）
          const currentDoc = headingPositions.length > 0 ? tr.doc : doc
          currentDoc.descendants((node, pos) => {
            if (node.type.name === 'paragraph') {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight: '1.75',
                paragraphSpacing: '0.8em',
              })
            }
            if (node.type.name === 'heading') {
              const level = node.attrs.level
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight: level === 2 ? '1.4' : '1.5',
                paragraphSpacing: '1.2em',
              })
            }
            if (node.type.name === 'image') {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                float: 'center',
              })
            }
            return true
          })

          // 一次 dispatch 完成所有修改
          editor.view.dispatch(tr)

          // 将光标移到文档开头
          editor.commands.setTextSelection(0)

          // 返回 false 阻止 TipTap 包装链派发自己的事务
          return false
        },
    }
  },
})
