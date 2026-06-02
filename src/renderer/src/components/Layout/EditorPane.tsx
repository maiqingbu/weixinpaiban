import { useCallback, useEffect, useState } from 'react'
import { useEditor } from '@/editor/hooks/useEditor'
import { Editor } from '@/editor/Editor'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function EditorPane(): React.JSX.Element {
  const editor = useEditor()
  const editorContent = useAppStore((s) => s.editorContent)
  const currentArticleId = useAppStore((s) => s.currentArticleId)
  const articles = useAppStore((s) => s.articles)
  const setEditorContent = useAppStore((s) => s.setEditorContent)
  const setAdvancedEditorContent = useAppStore((s) => s.setAdvancedEditorContent)
  const { toast } = useToast()
  const [guideOpen, setGuideOpen] = useState(false)

  // 获取当前文章的内容
  const currentArticle = articles.find(a => a.id === currentArticleId)
  const articleContent = currentArticle?.content || ''

  // 高级编辑器初始内容：优先用该文章上次保存到高级编辑器的内容（advanced_content），
  // 否则回退到标准编辑器 content，再次回退到当前编辑 state。
  const advancedInitialContent =
    currentArticle?.advanced_content || articleContent || editorContent

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
      // 同步标准编辑器内容，确保切回后预览实时更新
      window.dispatchEvent(new CustomEvent('load-article', { detail: { content: html } }))
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

  // 高级编辑器窗口关闭时强制刷新预览
  useEffect(() => {
    const handler = () => {
      const html = useAppStore.getState().editorContent
      window.dispatchEvent(new CustomEvent('load-article', { detail: { content: html } }))
    }
    window.api.editorOnClosed(handler)
    return () => {
      window.api.editorOffClosed(handler)
    }
  }, [])

  // 打开高级编辑器独立窗口
  const handleOpenAdvanced = useCallback(() => {
    window.api.editorOpen(advancedInitialContent)
  }, [advancedInitialContent])

  const guideText = `【必读文件】

━━━━━━━━━━━━━━━━━━━━━━━━

▎功能与模型配置说明

本应用部分功能需要配置对应的大语言模型才能使用：

• AI 智能生成 / AI 改写 —— 需要配置 AI 模型（在设置中选择 deepseek、OpenAI 或其他兼容接口的模型）
• AI 图片生成 —— 需要配置图片生成模型（支持 OpenAI 兼容的图片接口）
• 图片上传到图床 —— 需要配置图床（支持 SM.MS、GitHub、自定义图床上传接口）

如未配置对应模型，相关功能按钮将不可用或使用受限。

关于图片占位：AI 生成的文章会使用 <!-- IMG:描述 --> 占位符标记图片位置，预览中会显示为虚线框占位卡片，你可以后续点击这些位置替换为真实图片。

━━━━━━━━━━━━━━━━━━━━━━━━

▎标准编辑器（左侧面板）
- 基于富文本编辑器，适合日常排版和文字编辑
- 所见即所得，操作直观
- 编辑内容实时同步到右侧预览面板
- 支持主题切换、模板插入、AI 智能生成等功能

▎高级编辑器（独立窗口）
- 基于 TinyMCE 的完整 HTML/CSS 编辑器
- 打开后是独立窗口，不会阻塞主界面操作
- 支持更丰富的排版能力：表格、图片、字体、颜色等
- 编辑内容需要手动保存才会同步到数据库

━━━━━━━━━━━━━━━━━━━━━━━━

▎两个编辑器的关系
- 两者编辑的是同一篇文章的 content 字段
- 切换编辑器时，以数据库中最新的 content 为准
- 预览面板根据当前激活的编辑器显示对应内容

━━━━━━━━━━━━━━━━━━━━━━━━

▎重要操作提醒

请每次使用高级编辑器对文章进行修改后点击「保存到文章」才能完成修改，预览也会同步刷新。

在关闭高级编辑器后，请选择一下左侧文章让标准编辑器刷新一下，预览也会同步刷新。

高级编辑器中，选中图片后右键可以更换和修改图片。`

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
        <button
          onClick={() => setGuideOpen(true)}
          className="px-3 py-1 rounded text-xs font-medium border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        >
          必读文件
        </button>
        <span className="text-[10px] text-muted-foreground">
          独立窗口编辑，支持完整 HTML/CSS
        </span>
      </div>

      {/* 标准编辑器 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor editor={editor} />
      </div>

      {/* 必读文件弹窗 */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-[560px] gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>必读文件</DialogTitle>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto p-6 text-sm leading-relaxed text-foreground whitespace-pre-line">
            {guideText}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { EditorPane }
