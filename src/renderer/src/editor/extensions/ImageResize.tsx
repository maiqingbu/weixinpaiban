import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { useCallback, useRef, useState } from 'react'
import { AlignLeft, AlignRight, AlignCenter, Maximize2, GripVertical, Crop, Pencil } from 'lucide-react'

// ── React component ──

function ResizableImageComponent({ node, updateAttributes, selected, editor }: any) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const resizeRef = useRef<{
    startX: number; startY: number; startW: number; startH: number; corner: string
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const floatVal = node.attrs.float || null
  const pixelW = node.attrs.width || null
  const pixelH = node.attrs.height || null

  const onImageLoad = useCallback(() => {
    if (imgRef.current) {
      const nw = imgRef.current.naturalWidth
      const nh = imgRef.current.naturalHeight
      setNaturalSize({ w: nw, h: nh })
      if (!pixelW && !pixelH) {
        const maxW = editor?.view?.dom?.clientWidth ? editor.view.dom.clientWidth - 64 : 600
        const w = Math.min(nw, maxW)
        const h = Math.round((w / nw) * nh)
        updateAttributes({ width: w, height: h })
      }
    }
  }, [editor, pixelW, pixelH, updateAttributes])

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (!imgRef.current || !naturalSize) return

      const currentW = imgRef.current.clientWidth
      const currentH = imgRef.current.clientHeight
      resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: currentW, startH: currentH, corner }

      const aspect = naturalSize.w / naturalSize.h
      const onMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return
        const { startX, startY, startW, startH, corner } = resizeRef.current
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const freeForm = ev.shiftKey
        let newW = startW, newH = startH

        switch (corner) {
          case 'se': newW = startW + dx; newH = freeForm ? startH + dy : Math.round(newW / aspect); break
          case 'sw': newW = startW - dx; newH = freeForm ? startH + dy : Math.round(newW / aspect); break
          case 'ne': newW = startW + dx; newH = freeForm ? startH - dy : Math.round(newW / aspect); break
          case 'nw': newW = startW - dx; newH = freeForm ? startH - dy : Math.round(newW / aspect); break
          case 'e':  newW = startW + dx; newH = freeForm ? startH : Math.round(newW / aspect); break
          case 'w':  newW = startW - dx; newH = freeForm ? startH : Math.round(newW / aspect); break
          case 's':  newH = startH + dy; newW = freeForm ? startW : Math.round(newH * aspect); break
          case 'n':  newH = startH - dy; newW = freeForm ? startW : Math.round(newH * aspect); break
        }
        newW = Math.max(40, Math.round(newW))
        newH = Math.max(30, Math.round(newH))
        if (imgRef.current) {
          imgRef.current.style.width = `${newW}px`
          imgRef.current.style.height = `${newH}px`
        }
      }
      const onMouseUp = () => {
        if (resizeRef.current && imgRef.current) {
          updateAttributes({
            width: Math.round(imgRef.current.clientWidth),
            height: Math.round(imgRef.current.clientHeight),
          })
        }
        resizeRef.current = null
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = cornerToCursor(corner)
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [naturalSize, updateAttributes]
  )

  const setFloat = (f: string | null) => {
    updateAttributes({ float: f })
  }

  const displayW = pixelW || naturalSize?.w || 400
  const displayH = pixelH || naturalSize?.h || 300

  // Build wrapper style
  const wrapperStyle: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    lineHeight: 0,
    ...(floatVal === 'left' ? { float: 'left', marginRight: 12, marginBottom: 8 } : {}),
    ...(floatVal === 'right' ? { float: 'right', marginLeft: 12, marginBottom: 8 } : {}),
    ...(floatVal === 'center' ? { display: 'block', marginLeft: 'auto', marginRight: 'auto' } : {}),
    maxWidth: floatVal ? '60%' : '100%',
  }

  return (
    <NodeViewWrapper
      className={`image-resize-wrapper ${selected ? 'is-selected' : ''} ${floatVal ? `float-${floatVal}` : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={wrapperStyle}
      data-drag-handle=""
    >
      {/* 拖拽手柄 — 选中后出现在图片上方 */}
      {selected && (
        <div
          className="image-drag-handle"
          contentEditable={false}
          data-drag-handle=""
          onMouseDown={() => {
            // 不阻止事件，让 ProseMirror 处理拖拽
            setIsDragging(true)
            const onUp = () => {
              setIsDragging(false)
              document.removeEventListener('mouseup', onUp)
            }
            document.addEventListener('mouseup', onUp)
          }}
        >
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      )}
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        style={{ width: displayW, height: displayH, display: 'block' }}
        onLoad={onImageLoad}
        draggable={false}
      />
      {selected && (
        <>
          {/* Resize handles */}
          <Handle pos="nw" onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'nw')} />
          <Handle pos="ne" onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'ne')} />
          <Handle pos="sw" onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'sw')} />
          <Handle pos="se" onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'se')} />
          <Handle pos="n"  onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'n')} />
          <Handle pos="s"  onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 's')} />
          <Handle pos="e"  onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'e')} />
          <Handle pos="w"  onMouseDown={(e: React.MouseEvent) => onHandleMouseDown(e, 'w')} />
          {/* Size badge */}
          <div className="resize-indicator">{displayW} × {displayH}</div>
          {/* Float toolbar */}
          <div className="image-float-toolbar">
            <button
              type="button"
              className={`float-btn ${floatVal === 'left' ? 'active' : ''}`}
              title="左浮动（文字环绕右侧）"
              onClick={() => setFloat(floatVal === 'left' ? null : 'left')}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`float-btn ${floatVal === 'center' ? 'active' : ''}`}
              title="居中"
              onClick={() => setFloat(floatVal === 'center' ? null : 'center')}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`float-btn ${floatVal === 'right' ? 'active' : ''}`}
              title="右浮动（文字环绕左侧）"
              onClick={() => setFloat(floatVal === 'right' ? null : 'right')}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <span className="float-toolbar-divider" />
            <button
              type="button"
              className="float-btn"
              title="恢复默认（独占一行）"
              onClick={() => setFloat(null)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <span className="float-toolbar-divider" />
            <button
              type="button"
              className="float-btn"
              title="裁剪图片"
              onClick={() => {
                const imgEl = imgRef.current
                window.dispatchEvent(
                  new CustomEvent('image:crop', {
                    detail: { src: node.attrs.src, element: imgEl },
                  })
                )
              }}
            >
              <Crop className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="float-btn"
              title="编辑图片"
              onClick={() => {
                const imgEl = imgRef.current
                window.dispatchEvent(
                  new CustomEvent('image:edit', {
                    detail: { src: node.attrs.src, element: imgEl },
                  })
                )
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </NodeViewWrapper>
  )
}

function Handle({ pos, onMouseDown }: { pos: string; onMouseDown: (e: React.MouseEvent) => void }) {
  return <div className={`resize-handle ${pos}`} onMouseDown={onMouseDown} />
}

function cornerToCursor(c: string): string {
  const map: Record<string, string> = {
    nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
    n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
  }
  return map[c] || 'move'
}

// ── TipTap Node extension ──

const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    /** 从 style 字符串提取 CSS 属性值（兼容 renderHTML 把属性写成内联样式的行为） */
    const parseStyle = (el: HTMLElement | string, prop: string): string | null => {
      if (typeof el === 'string') return null
      const style = el.getAttribute('style') || ''
      const regex = new RegExp(`${prop}:\\s*([^;]+)`)
      const m = style.match(regex)
      return m ? m[1].trim() : null
    }

    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const styleW = parseStyle(el, 'width')
          if (styleW) { const n = parseInt(styleW, 10); if (n > 0) return n }
          if (typeof el !== 'string') { const w = el.getAttribute('width'); if (w) return parseInt(w, 10) }
          return null
        },
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const styleH = parseStyle(el, 'height')
          if (styleH) { const n = parseInt(styleH, 10); if (n > 0) return n }
          if (typeof el !== 'string') { const h = el.getAttribute('height'); if (h) return parseInt(h, 10) }
          return null
        },
      },
      float: {
        default: null,
        renderHTML: (attrs) => attrs.float ? { 'data-float': attrs.float } : {},
        parseHTML: (el) => {
          if (typeof el !== 'string') {
            const f = el.getAttribute('data-float')
            if (f) return f
            // 回退：从 style 中解析 float
            const styleFloat = parseStyle(el, 'float')
            if (styleFloat === 'left' || styleFloat === 'right') return styleFloat
            // 居中检测
            const style = el.getAttribute('style') || ''
            if (/display:\s*block/.test(style) && /margin-left:\s*auto/.test(style)) return 'center'
          }
          return null
        },
      },
    }
  },

  // Override renderHTML to emit inline styles for preview sync
  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes }
    const styles: string[] = []
    const f = attrs['data-float']

    if (attrs.width) {
      styles.push(`width:${attrs.width}px`)
      delete attrs.width
    }
    if (attrs.height) {
      styles.push(`height:${attrs.height}px`)
      delete attrs.height
    }
    if (f === 'left') {
      styles.push('float:left;margin:4px 16px 8px 0;max-width:60%')
      delete attrs['data-float']
    } else if (f === 'right') {
      styles.push('float:right;margin:4px 0 8px 16px;max-width:60%')
      delete attrs['data-float']
    } else if (f === 'center') {
      styles.push('display:block;margin-left:auto;margin-right:auto')
      delete attrs['data-float']
    } else {
      delete attrs['data-float']
    }

    if (styles.length) {
      const existing = (attrs.style || '') as string
      attrs.style = existing ? `${existing};${styles.join(';')}` : styles.join(';')
    }

    return ['img', attrs] as ['img', Record<string, any>]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },

  parseHTML() {
    /** 从 style 字符串提取 CSS 值 */
    const fromStyle = (style: string, prop: string): string | null => {
      const m = style.match(new RegExp(`${prop}:\\s*([^;]+)`))
      return m ? m[1].trim() : null
    }

    return [{
      tag: 'img[src]',
      getAttrs: (el) => {
        if (typeof el === 'string') return {}
        const img = el as HTMLImageElement
        const style = img.getAttribute('style') || ''

        // width/height 优先从 style 解析（renderHTML 将其写入 style 并删除 HTML 属性）
        const styleW = fromStyle(style, 'width')
        const styleH = fromStyle(style, 'height')
        const width = styleW ? parseInt(styleW, 10) : (img.getAttribute('width') ? parseInt(img.getAttribute('width')!, 10) : null)
        const height = styleH ? parseInt(styleH, 10) : (img.getAttribute('height') ? parseInt(img.getAttribute('height')!, 10) : null)

        // float: data-float 属性 > style 中的 float > display:block+margin:auto（居中）
        let float = img.getAttribute('data-float') || null
        if (!float) {
          const styleFloat = fromStyle(style, 'float')
          if (styleFloat === 'left' || styleFloat === 'right') float = styleFloat
          else if (/display:\s*block/.test(style) && /margin-left:\s*auto/.test(style)) float = 'center'
        }

        return { src: img.getAttribute('src'), alt: img.getAttribute('alt'), title: img.getAttribute('title'), width, height, float }
      },
    }]
  },
})

export { ResizableImage }
