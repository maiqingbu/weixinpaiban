import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { TinyMCEditor } from './TinyMCEditor'

interface TinyMCEDialogProps {
  open: boolean
  onClose: () => void
  initialContent: string
  onSave: (html: string) => void
}

function TinyMCEDialog({ open, onClose, initialContent, onSave }: TinyMCEDialogProps): React.JSX.Element | null {
  const [position, setPosition] = useState({ x: 40, y: 40 })
  const [size, setSize] = useState({ width: 1000, height: 650 })
  const [saved, setSaved] = useState(false)
  const [content, setContent] = useState(initialContent)
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 })
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startW: 0, startH: 0 })

  // 当 initialContent 变化时更新内容
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  // 拖动逻辑
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return
      setPosition({
        x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      })
    }
    const handleMouseUp = () => {
      dragRef.current.isDragging = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [position])

  // 缩放逻辑
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current.isResizing) return
      setSize({
        width: Math.max(700, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)),
        height: Math.max(450, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)),
      })
    }
    const handleMouseUp = () => {
      resizeRef.current.isResizing = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [size])

  // 保存
  const handleSave = useCallback(() => {
    onSave(content)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [content, onSave])

  // 内容变化
  const handleChange = useCallback((html: string) => {
    setContent(html)
  }, [])

  if (!open) return null

  return createPortal(
    <div
      className="fixed bg-background rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 9999,
      }}
    >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground cursor-move select-none shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">高级编辑器</span>
            <span className="text-xs opacity-70">拖动移动 · 右下角缩放 · 支持完整 HTML/CSS</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-primary hover:bg-white/90'
              }`}
              onClick={handleSave}
            >
              {saved ? '已保存' : '保存到文章'}
            </button>
            <button
              className="px-3 py-1.5 text-xs bg-white/20 text-white rounded hover:bg-white/30"
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 min-h-0">
          <TinyMCEditor
            initialContent={initialContent}
            onChange={handleChange}
          />
        </div>

        {/* 缩放手柄 */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-primary/10"
          onMouseDown={handleResizeStart}
        >
          <svg className="w-6 h-6 text-gray-500" viewBox="0 0 16 16">
            <path d="M14 14L14 8M14 14L8 14M10 14L14 10M14 14L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    , document.body)
}

export { TinyMCEDialog }
