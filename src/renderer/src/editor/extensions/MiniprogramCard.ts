import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MiniprogramCardView } from './MiniprogramCardView'

export const MiniprogramCard = Node.create({
  name: 'miniprogramCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      coverUrl: { default: '' },
      title: { default: '小程序名称' },
      description: { default: '小程序描述' },
      appid: { default: '' },
      path: { default: '' },
      displayStyle: { default: 'card' },
    }
  },

  parseHTML() {
    return [
      { tag: 'mp-miniprogram' },
      { tag: 'section[data-miniprogram-card]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, {
      'data-miniprogram-card': '',
      'data-title': HTMLAttributes.title || '小程序名称',
      'data-description': HTMLAttributes.description || '',
      'data-appid': HTMLAttributes.appid || '',
      'data-path': HTMLAttributes.path || '',
      'data-display-style': HTMLAttributes.displayStyle || 'card',
    }), 0]
  },

  addNodeView() {
    // @ts-expect-error — TipTap NodeViewRenderer type mismatch with custom view props
    return ReactNodeViewRenderer(MiniprogramCardView)
  },

  addCommands() {
    return {
      insertMiniprogramCard: (attrs: Record<string, string>) => ({ chain }) =>
        chain().focus().insertContent({
          type: this.name,
          attrs,
        }).run(),
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    miniprogramCard: {
      insertMiniprogramCard: (attrs: Record<string, string>) => ReturnType
    }
  }
}
