import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VideoCardView } from './VideoCardView'

export const VideoCard = Node.create({
  name: 'videoCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      coverUrl: { default: '' },
      title: { default: '视频号视频' },
      account: { default: '@视频号' },
      duration: { default: '00:30' },
      finderUserName: { default: '' },
      feedId: { default: '' },
    }
  },

  parseHTML() {
    return [
      { tag: 'mp-common-videosnap' },
      { tag: 'section[data-video-card]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, {
      'data-video-card': '',
      'data-title': HTMLAttributes.title || '视频号视频',
      'data-account': HTMLAttributes.account || '@视频号',
      'data-duration': HTMLAttributes.duration || '',
      'data-finder-username': HTMLAttributes.finderUserName || '',
      'data-feed-id': HTMLAttributes.feedId || '',
      style: 'border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:1.5em 0;background:#fff;',
    }), 0]
  },

  addNodeView() {
    // @ts-expect-error — TipTap NodeViewRenderer type mismatch with custom view props
    return ReactNodeViewRenderer(VideoCardView)
  },

  addCommands() {
    return {
      insertVideoCard: (attrs: Record<string, string>) => ({ chain }) =>
        chain().focus().insertContent({
          type: this.name,
          attrs,
        }).run(),
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoCard: {
      insertVideoCard: (attrs: Record<string, string>) => ReturnType
    }
  }
}
