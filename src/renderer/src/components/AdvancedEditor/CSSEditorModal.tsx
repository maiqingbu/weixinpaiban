import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'

interface CSSEditorModalProps {
  open: boolean
  css: string
  onClose: () => void
  onSave: (css: string) => void
}

export function CSSEditorModal({ open, css, onClose, onSave }: CSSEditorModalProps) {
  const [value, setValue] = useState(css)

  const handleSave = useCallback(() => {
    onSave(value)
    onClose()
  }, [value, onSave, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-[800px] h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">编辑 CSS 样式</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            language="css"
            value={value}
            onChange={(val) => setValue(val || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-md border border-border hover:bg-muted"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
