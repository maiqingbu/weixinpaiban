import { NodeViewWrapper } from '@tiptap/react'

interface MiniprogramCardAttrs {
  coverUrl: string
  title: string
  description: string
  appid: string
  path: string
  displayStyle: 'card' | 'text'
}

function MiniprogramCardView({ node, selected, deleteNode, updateAttributes }: {
  node: { attrs: MiniprogramCardAttrs }
  selected: boolean
  deleteNode: () => void
  updateAttributes: (attrs: Partial<MiniprogramCardAttrs>) => void
}): React.JSX.Element {
  const { coverUrl, title, description, displayStyle } = node.attrs

  if (displayStyle === 'text') {
    return (
      <NodeViewWrapper>
        <section
          data-miniprogram-card=""
          contentEditable={false}
          style={{
            border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '10px 14px',
            margin: '1em 0',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h12v16zM8 8h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
          </svg>
          <span style={{ fontSize: 14, color: '#1f2937' }}>{title}</span>

          {selected && (
            <div style={{ position: 'absolute', top: 4, right: 8, display: 'flex', gap: 4 }}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('edit-miniprogram-card', { detail: { attrs: node.attrs, updateAttributes } }))}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, padding: '1px 5px', cursor: 'pointer', fontSize: 11 }}
              >
                编辑
              </button>
              <button
                onClick={deleteNode}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, padding: '1px 5px', cursor: 'pointer', fontSize: 11, color: '#ef4444' }}
              >
                删除
              </button>
            </div>
          )}
        </section>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <section
        data-miniprogram-card=""
        contentEditable={false}
        style={{
          border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
          margin: '1.5em 0',
          background: '#fff',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        {/* 大图 5:4 */}
        <div style={{
          position: 'relative',
          paddingBottom: '80%',
          background: coverUrl ? `url(${coverUrl}) center / cover` : '#f3f4f6',
        }}>
          {!coverUrl && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9ca3af', fontSize: 13,
            }}>
              封面图占位
            </div>
          )}
        </div>
        {/* 底部信息 */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 2, lineHeight: 1.4 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{description}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#6b7280',
            borderTop: '1px solid #f3f4f6', paddingTop: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#6b7280">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h12v16zM8 8h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
            </svg>
            小程序
          </div>
        </div>
        {/* 选中时操作按钮 */}
        {selected && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('edit-miniprogram-card', { detail: { attrs: node.attrs, updateAttributes } }))}
              style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12 }}
            >
              编辑
            </button>
            <button
              onClick={deleteNode}
              style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}
            >
              删除
            </button>
          </div>
        )}
      </section>
    </NodeViewWrapper>
  )
}

export { MiniprogramCardView }
export type { MiniprogramCardAttrs }
