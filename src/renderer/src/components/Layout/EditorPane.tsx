import { useCallback, useEffect } from 'react'
import { useEditor } from '@/editor/hooks/useEditor'
import { Editor } from '@/editor/Editor'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'

function EditorPane(): React.JSX.Element {
  const editor = useEditor()
  const editorContent = useAppStore((s) => s.editorContent)
  const advancedEditorContent = useAppStore((s) => s.advancedEditorContent)
  const currentArticleId = useAppStore((s) => s.currentArticleId)
  const articles = useAppStore((s) => s.articles)
  const setEditorContent = useAppStore((s) => s.setEditorContent)
  const setAdvancedEditorContent = useAppStore((s) => s.setAdvancedEditorContent)
  const { toast } = useToast()

  // 获取当前文章的内容
  const currentArticle = articles.find(a => a.id === currentArticleId)
  const articleContent = currentArticle?.content || ''

  // 计算高级编辑器的初始内容
  const advancedInitialContent = advancedEditorContent || editorContent || articleContent

  // 当文章切换时，推送内容到编辑器窗口
  useEffect(() => {
    if (advancedInitialContent) {
      window.api.editorPushContent(advancedInitialContent)
    }
  }, [advancedInitialContent])

  // 监听编辑器窗口保存的内容
  useEffect(() => {
    const handler = (_event: any, html: string) => {
      setAdvancedEditorContent(html)
      setEditorContent(html)
      if (currentArticleId) {
        window.api.articleUpdate(currentArticleId, { advanced_content: html }).then(() => {
          toast({ title: '保存成功', description: '高级编辑器内容已保存' })
        }).catch(() => {
          toast({ title: '保存失败', description: '请重试', variant: 'destructive' })
        })
      }
    }
    window.api.editorOnSaved(handler)
    return () => {
      window.api.editorOffSaved(handler)
    }
  }, [currentArticleId, setAdvancedEditorContent, setEditorContent, toast])

  // 打开高级编辑器独立窗口
  const handleOpenAdvanced = useCallback(() => {
    window.api.editorOpen(advancedInitialContent)
  }, [advancedInitialContent])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border bg-muted/30 shrink-0">
        <button
          onClick={handleOpenAdvanced}
          className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm shadow-indigo-500/25 hover:from-violet-600 hover:to-indigo-600 hover:shadow-indigo-500/40"
        >
          高级编辑器
        </button>
        <span className="text-[10px] text-muted-foreground">
          独立窗口编辑，支持完整 HTML/CSS
        </span>
      </div>

      {/* 标准编辑器 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor editor={editor} />
      </div>
    </div>
  )
}

export { EditorPane }
