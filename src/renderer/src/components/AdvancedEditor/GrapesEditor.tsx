import { useEffect, useRef } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import type { AdvancedEditorProps } from './types'

function GrapesEditor({ initialContent, onChange }: AdvancedEditorProps): React.JSX.Element {
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const skipUpdateRef = useRef(false)

  // 初始化 GrapesJS
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return

    const editor = grapesjs.init({
      container: containerRef.current,
      height: '100%',
      width: 'auto',
      storageManager: false, // 禁用本地存储，由应用管理
      panels: { defaults: [] }, // 隐藏默认面板，精简界面
      deviceManager: {
        devices: [
          { name: '桌面', width: '' },
          { name: '手机', width: '375px' },
        ],
      },
      style: `
        .gjs-cv-canvas { width: 100%; height: 100%; }
        .gjs-frame { width: 100%; height: 100%; }
      `,
    })

    // 加载初始内容
    if (initialContent) {
      editor.setComponents(initialContent)
    }

    // 监听内容变化
    editor.on('component:update', () => {
      if (skipUpdateRef.current) {
        skipUpdateRef.current = false
        return
      }
      const html = editor.getHtml()
      const css = editor.getCss()
      // 将 CSS 内联到 HTML 中（公众号不支持外部样式表）
      const fullHtml = css ? `<style>${css}</style>${html}` : html
      onChange?.(fullHtml)
    })

    editorRef.current = editor

    return () => {
      editor.destroy()
      editorRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 文章切换时重新加载内容
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    skipUpdateRef.current = true
    if (initialContent) {
      editor.setComponents(initialContent)
    } else {
      editor.setComponents('')
    }
  }, [initialContent])

  return (
    <div className="grapes-editor-wrapper h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30 shrink-0">
        <button
          className="px-2 py-0.5 text-xs rounded hover:bg-accent"
          onClick={() => editorRef.current?.runCommand('core:undo')}
          title="撤销"
        >
          撤销
        </button>
        <button
          className="px-2 py-0.5 text-xs rounded hover:bg-accent"
          onClick={() => editorRef.current?.runCommand('core:redo')}
          title="重做"
        >
          重做
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          className="px-2 py-0.5 text-xs rounded hover:bg-accent"
          onClick={() => {
            const editor = editorRef.current
            if (editor) {
              const html = editor.getHtml()
              const css = editor.getCss()
              const fullHtml = css ? `<style>${css}</style>${html}` : html
              onChange?.(fullHtml)
            }
          }}
          title="导出 HTML"
        >
          导出
        </button>
      </div>

      {/* 编辑器容器 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 400 }}
      />
    </div>
  )
}

export { GrapesEditor }
