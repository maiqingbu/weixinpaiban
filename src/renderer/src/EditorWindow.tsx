import { useEffect, useState, useCallback } from 'react'
import { TinyMCEditor } from './components/AdvancedEditor/TinyMCEditor'

function EditorWindow(): React.JSX.Element {
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // 监听主窗口发来的初始内容
    const handler = (_event: any, html: string) => {
      setContent(html)
    }
    window.api.editorOnSetContent(handler)
    // 通知主进程编辑器已就绪，可以接收内容
    window.api.editorReady()
    return () => {
      window.api.editorOffSetContent(handler)
    }
  }, [])

  const handleChange = useCallback((html: string) => {
    setContent(html)
  }, [])

  const handleSave = useCallback(() => {
    window.api.editorSave(content)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [content])

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
          initialContent={content}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

export default EditorWindow
