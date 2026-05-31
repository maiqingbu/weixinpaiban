/**
 * ColumnsContainer 节点扩展
 *
 * 使用 ReactNodeViewRenderer 渲染交互式分栏容器：
 * - Flex/Grid 容器布局
 * - 列宽拖拽手柄（hover 变蓝，拖拽实时更新，双击恢复等分）
 * - 浮动工具栏（加列、删列、切换布局等）
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ColumnsContainerView } from './ColumnsContainerView'
import type { ColumnContent } from '@/lib/materials/columns'

// 声明命令类型扩展
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnsContainer: {
      insertColumns: (
        layout: string,
        widths: number[],
        content: ColumnContent[],
        direction?: string
      ) => ReturnType
      deleteColumnsContainer: () => ReturnType
    }
  }
}

export const ColumnsContainer = Node.create({
  name: 'columnsContainer',
  group: 'block',
  content: 'column+',
  isolating: true,
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      layout: { default: 'cols-2' },
      widths: {
        default: [50, 50],
        parseHTML: (el) => {
          try {
            const val = el.getAttribute('data-widths')
            return val ? JSON.parse(val) : [50, 50]
          } catch {
            return [50, 50]
          }
        },
      },
      gap: { default: 16 },
      direction: {
        default: 'horizontal',
        parseHTML: (el) => {
          const explicit = el.getAttribute('data-direction')
          if (explicit) return explicit
          // 兼容旧数据：grid / timeline 布局默认为 vertical
          const layout = el.getAttribute('data-layout') || ''
          if (['grid-2x2', 'grid-3x3', 'timeline'].includes(layout)) return 'vertical'
          return 'horizontal'
        },
        renderHTML: (attrs) => {
          return { 'data-direction': attrs.direction }
        },
      },
    }
  },

  parseHTML() {
    return [{
      tag: 'section[data-columns-container]',
      getAttrs: (el: HTMLElement) => {
        const layout = el.getAttribute('data-layout') || 'cols-2'
        let direction = el.getAttribute('data-direction') || 'horizontal'
        // 兼容旧数据
        if (['grid-2x2', 'grid-3x3', 'timeline'].includes(layout) && !el.hasAttribute('data-direction')) {
          direction = 'vertical'
        }
        let widths = [50, 50]
        try {
          const val = el.getAttribute('data-widths')
          if (val) widths = JSON.parse(val)
        } catch {}
        return { layout, direction, widths, gap: parseInt(el.getAttribute('data-gap') || '16') }
      },
    }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const widths = node.attrs.widths as number[]
    const gap = node.attrs.gap as number
    const layout = node.attrs.layout as string
    const direction = node.attrs.direction as string
    const flexDirection = direction === 'vertical' ? 'column' : 'row'

    const style = `display:flex;flex-direction:${flexDirection};gap:${gap}px;margin:1.5em 0;align-items:flex-start;`

    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-columns-container': '',
        'data-layout': layout,
        'data-direction': direction,
        'data-widths': JSON.stringify(widths),
        style,
      }),
      0,
    ]
  },

  addNodeView() {
    // @ts-expect-error — TipTap NodeViewRenderer type mismatch with custom view props
    return ReactNodeViewRenderer(ColumnsContainerView)
  },

  addCommands() {
    return {
      insertColumns:
        (layout, widths, content, direction) =>
        ({ tr, state, dispatch }) => {
          try {
            const { schema } = state

            if (!schema.nodes.columnsContainer || !schema.nodes.column) {
              console.warn('[ColumnsContainer] Schema nodes not found')
              return false
            }

            // Determine direction from layout if not explicitly provided
            const dir = direction || (layout.startsWith('grid') ? 'vertical' : 'horizontal')

            const columnNodes = widths.map((width, index) => {
              const columnContent = content[index] || []
              const innerNodes: any[] = []

              for (const item of columnContent) {
                try {
                  switch (item.type) {
                    case 'paragraph':
                      innerNodes.push(
                        schema.nodes.paragraph.create(null, schema.text(item.text || ''))
                      )
                      break
                    case 'heading': {
                      const level = item.level || 3
                      innerNodes.push(
                        schema.nodes.heading.create({ level }, schema.text(item.text || ''))
                      )
                      break
                    }
                    case 'image':
                      innerNodes.push(
                        schema.nodes.image.create({ src: item.src || '', alt: item.text || '' })
                      )
                      break
                    default:
                      innerNodes.push(
                        schema.nodes.paragraph.create(null, schema.text(''))
                      )
                  }
                } catch (err) {
                  console.warn('[ColumnsContainer] Failed to create inner node:', item, err)
                  innerNodes.push(schema.nodes.paragraph.create(null, schema.text('')))
                }
              }

              if (innerNodes.length === 0) {
                innerNodes.push(schema.nodes.paragraph.create(null, schema.text('')))
              }

              return schema.nodes.column.create({ width }, innerNodes)
            })

            const containerNode = schema.nodes.columnsContainer.create(
              { layout, widths, gap: 16, direction: dir },
              columnNodes
            )

            if (dispatch) {
              tr.replaceSelectionWith(containerNode)
            }
            return true
          } catch (err) {
            console.error('[ColumnsContainer] insertColumns error:', err)
            return false
          }
        },

      deleteColumnsContainer:
        () =>
        ({ tr, state, dispatch }) => {
          try {
            const { $from } = state.selection
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d)
              if (node.type.name === 'columnsContainer') {
                const pos = $from.before(d)
                if (dispatch) {
                  tr.delete(pos, pos + node.nodeSize)
                }
                return true
              }
            }
          } catch (err) {
            console.error('[ColumnsContainer] deleteColumnsContainer error:', err)
          }
          return false
        },
    }
  },
})
