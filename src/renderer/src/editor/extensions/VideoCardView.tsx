import { NodeViewWrapper } from '@tiptap/react'

interface VideoCardAttrs {
  coverUrl: string
  title: string
  account: string
  duration: string
  finderUserName: string
  feedId: string
}

function VideoCardView({ node, selected, deleteNode, updateAttributes }: {
  node: { attrs: VideoCardAttrs }
  selected: boolean
  deleteNode: () => void
  updateAttributes: (attrs: Partial<VideoCardAttrs>) => void
}): React.JSX.Element {
  const { coverUrl, title, account, duration } = node.attrs

  return (
    <NodeViewWrapper>
      <section
        data-video-card=""
        contentEditable={false}
        style={{
          border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
          margin: '1.5em 0',
          background: '#fff',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {/* 16:9 封面 */}
        <div style={{
          position: 'relative',
          paddingBottom: '56.25%',
          background: coverUrl ? `url(${coverUrl}) center / cover` : '#f3f4f6',
        }}>
          {/* 播放按钮 */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 4 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          {/* 时长 */}
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            padding: '2px 6px', borderRadius: 4,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: 12,
          }}>{duration}</div>
          {/* 视频号标识 */}
          <div style={{
            position: 'absolute', top: 8, left: 8,
            padding: '4px 8px', borderRadius: 12,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            视频号
          </div>
        </div>
        {/* 底部信息 */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 4, lineHeight: 1.4 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{account}</div>
        </div>
        {/* 选中时的操作按钮 */}
        {selected && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            display: 'flex', gap: 4,
          }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('edit-video-card', { detail: { attrs: node.attrs, updateAttributes } }))}
              style={{
                background: '#fff', border: '1px solid #d1d5db', borderRadius: 4,
                padding: '2px 6px', cursor: 'pointer', fontSize: 12,
              }}
              title="编辑"
            >
              编辑
            </button>
            <button
              onClick={deleteNode}
              style={{
                background: '#fff', border: '1px solid #d1d5db', borderRadius: 4,
                padding: '2px 6px', cursor: 'pointer', fontSize: 12, color: '#ef4444',
              }}
              title="删除"
            >
              删除
            </button>
          </div>
        )}
      </section>
    </NodeViewWrapper>
  )
}

export { VideoCardView }
export type { VideoCardAttrs }
