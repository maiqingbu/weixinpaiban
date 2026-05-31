import { useEffect, useState, useCallback, useRef } from 'react'
import { TinyMCEditor } from './components/AdvancedEditor/TinyMCEditor'

function EditorWindow(): React.JSX.Element {
  // 仅保存外部（主窗口）推送的内容，用于初始化/更新编辑器
  const [externalContent, setExternalContent] = useState('')
  // 编辑器当前内容存 ref，避免回流触发 TinyMCE React 内部 setContent
  const contentRef = useRef('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const handler = (_event: any, html: string) => {
      contentRef.current = html
      setExternalContent(html)
    }
    window.api.editorOnSetContent(handler)
    window.api.editorReady()
    return () => {
      window.api.editorOffSetContent(handler)
    }
  }, [])

  const handleChange = useCallback((html: string) => {
    contentRef.current = html
  }, [])

  const handleSave = useCallback(() => {
    window.api.editorSave(contentRef.current)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const handleClose = useCallback(() => {
    window.api.editorClose()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">高级编辑器</span>
          <span className="text-xs opacity-60">独立窗口 · 支持完整 HTML/CSS</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
            onClick={handleSave}
          >
            {saved ? '已保存' : '保存到文章'}
          </button>
          <button
            className="px-3 py-1.5 text-xs bg-white/20 text-white rounded hover:bg-white/30"
            onClick={handleClose}
          >
            关闭
          </button>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 min-h-0">
        <TinyMCEditor
          initialContent={externalContent}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

export default EditorWindow
