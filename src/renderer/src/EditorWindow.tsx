import { useEffect, useState, useCallback, useRef } from 'react'
import { TinyMCEditor } from './components/AdvancedEditor/TinyMCEditor'

function EditorWindow(): React.JSX.Element {
  // 仅保存外部（主窗口）推送的内容，用于初始化/更新编辑器
  const [externalContent, setExternalContent] = useState('')
  // 编辑器当前内容存 ref，避免回流触发 TinyMCE React 内部 setContent
  const contentRef = useRef('')
  const [saved, setSaved] = useState(false)
  // 外部推送内容时递增 key，强制 TinyMCE 重新挂载以显示新文章
  const [editorKey, setEditorKey] = useState(0)

  useEffect(() => {
    const handler = (_event: any, html: string) => {
      contentRef.current = html
      setExternalContent(html)
      setEditorKey(k => k + 1)
    }
    window.api.editorOnSetContent(handler)
    window.api.editorReady()

    // 窗口关闭时（macOS X 按钮 / Cmd+W）自动保存
    const onBeforeUnload = () => {
      window.api.editorSave(contentRef.current)
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    // 注意：不在 cleanup 中移除 set-content 监听。
    // React 18 StrictMode 下 useEffect 会执行 mount → cleanup → mount，
    // 同步移除再注册会与 Electron 极快的 IPC 时序产生竞态：
    //   - 第二次 mount 之前，主进程的 set-content 消息可能已到达 renderer
    //   - 此时 handler 已被移除，新 handler 尚未注册 → 消息丢失 → 编辑器空白
    // 不移除 handler 不会造成泄漏：window 关闭时整个 renderer 进程销毁，所有 ipcRenderer listener 自动清理。
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
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
    window.api.editorSave(contentRef.current)
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
          key={editorKey}
          initialContent={externalContent}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

export default EditorWindow
