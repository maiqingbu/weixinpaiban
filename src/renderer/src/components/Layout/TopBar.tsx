import { useState, useCallback, useEffect, useRef } from 'react'
import { Copy, Download, Link2, Loader2, Search, Settings, Sparkles, ClipboardCheck, Gauge, ExternalLink, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { exportForWechat, htmlToText } from '@/lib/exporter'
import { resolveTheme } from '@/lib/resolveTheme'
import { countBase64Images } from '@/lib/imageUpload'
import { ExportDialog } from '@/components/ExportDialog'
import { PreviewLinkDialog } from '@/components/PreviewLinkDialog'
import { SettingsDialog } from '@/components/Settings'

import { MaterialPanel } from '@/components/MaterialPanel'
import { SearchDialog } from '@/components/GlobalSearch'
import { ChecklistPanel } from '@/components/ChecklistPanel'
import { TitleAnalyzer } from '@/components/TitleAnalyzer'
import { VideoCardDialog } from '@/components/InsertCardDialog/VideoCardDialog'
import { MiniprogramCardDialog } from '@/components/InsertCardDialog/MiniprogramCardDialog'
import { ReadMoreSettings } from '@/components/ReadMoreSettings'
import { AIAssistant } from '@/components/AIAssistant'
import { ContentGeneratorPanel, generateContent, extractAndApplyLayout } from '@/lib/contentGenerator'
import type { ContentGenConfig } from '@/lib/contentGenerator'

/** 竖线分隔符 */
function VDivider() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />
}

function TopBar(): React.JSX.Element {
  const [isExporting, setIsExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [titleAnalysisOpen, setTitleAnalysisOpen] = useState(false)
  const [videoCardOpen, setVideoCardOpen] = useState(false)
  const [miniprogramCardOpen, setMiniprogramCardOpen] = useState(false)
  const [readMoreOpen, setReadMoreOpen] = useState(false)
  const [contentGenOpen, setContentGenOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genStatus, setGenStatus] = useState('')
  const genCancelRef = useRef<(() => void) | null>(null)
  const { toast } = useToast()
  const editor = useAppStore((s) => s.editorInstance)

  const handleCopy = useCallback(async () => {
    if (isExporting) {
      toast({ title: '正在导出中，请稍候...' })
      return
    }

    const editorContent = useAppStore.getState().editorContent
    if (!editorContent || editorContent.trim() === '<p></p>' || editorContent.trim() === '<p><br></p>') {
      toast({ title: '编辑器内容为空', variant: 'destructive' })
      return
    }

    setIsExporting(true)
    try {
      const themeId = useAppStore.getState().currentThemeId
      const theme = await resolveTheme(themeId)

      const exported = await exportForWechat(editorContent, theme)
      if (!exported) {
        toast({ title: '导出内容为空', variant: 'destructive' })
        return
      }

      const b64Count = countBase64Images(editorContent)
      if (b64Count > 3) {
        toast({
          title: `文档包含 ${b64Count} 张未上传图片，体积可能很大`,
          description: '建议先上传到图床',
          variant: 'destructive',
        })
      }

      const plainText = htmlToText(exported)

      if (window.api?.debugSaveExport) {
        window.api.debugSaveExport(exported).then(({ filePath }) => {
          console.log(`[debug] Export saved to: ${filePath}`)
        })
      }

      const result = await window.api?.copyToWechat(exported, plainText)
      if (result?.success) {
        const hasEmbedCards = /data-video-card|data-miniprogram-card/.test(editorContent)
        const article = useAppStore.getState().articles.find(a => a.id === useAppStore.getState().currentArticleId)
        const readMoreUrl = article?.read_more_url
        const descParts = ['打开公众号后台粘贴即可']
        if (hasEmbedCards) descParts.unshift('如有视频号/小程序卡片，请在公众号后台关联真实内容')
        if (readMoreUrl) descParts.push(`阅读原文：${readMoreUrl}`)

        toast({
          title: '已复制到剪贴板',
          description: descParts.join('。'),
        })
      } else {
        toast({ title: '复制失败', variant: 'destructive' })
      }
    } catch (err) {
      console.error('[copy-to-wechat] Error:', err)
      toast({ title: '复制失败', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, toast])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        handleCopy()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setChecklistOpen(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setTitleAnalysisOpen(true)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleCopy])

  // Event listeners
  useEffect(() => {
    const openSettings = () => setSettingsOpen(true)
    const openTitle = () => setTitleAnalysisOpen(true)
    const openVideo = () => setVideoCardOpen(true)
    const openMini = () => setMiniprogramCardOpen(true)
    const openReadMore = () => setReadMoreOpen(true)
    const openContentGen = () => setContentGenOpen(true)

    window.addEventListener('open-settings', openSettings)
    window.addEventListener('open-title-analysis', openTitle)
    window.addEventListener('open-video-card-dialog', openVideo)
    window.addEventListener('open-miniprogram-card-dialog', openMini)
    window.addEventListener('open-read-more-settings', openReadMore)
    window.addEventListener('open-content-generator', openContentGen)

    return () => {
      window.removeEventListener('open-settings', openSettings)
      window.removeEventListener('open-title-analysis', openTitle)
      window.removeEventListener('open-video-card-dialog', openVideo)
      window.removeEventListener('open-miniprogram-card-dialog', openMini)
      window.removeEventListener('open-read-more-settings', openReadMore)
      window.removeEventListener('open-content-generator', openContentGen)
    }
  }, [])

  const handleOpenAiTitle = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-ai-title-dialog'))
  }, [])

  const handleContentGenerate = useCallback(async (config: ContentGenConfig) => {
    setContentGenOpen(false)
    setGenerating(true)
    setGenProgress(0)
    setGenStatus('正在生成…')

    const providerId = useAppStore.getState().configuredProviders?.[0]?.provider_id || 'deepseek'
    const targetChars = config.length === 'short' ? 2400 : config.length === 'long' ? 9000 : 4500
    let accumulated = ''

    const result = generateContent({
      config,
      providerId,
      enableWebSearch: config.enableWebSearch,
      onStatus: (status) => setGenStatus(status),
      onChunk: (chunk) => {
        accumulated += chunk
        const pct = Math.min(95, Math.round((accumulated.length / targetChars) * 100))
        setGenProgress(pct)
        setGenStatus(`正在生成… ${pct}%`)
      },
    })

    genCancelRef.current = result.cancel

    try {
      const rawOutput = await result.promise
      setGenProgress(96)
      setGenStatus('正在提取内容…')

      const html = extractAndApplyLayout(rawOutput, config.layout?.htmlTemplate)

      // AI 生成内容注入高级编辑器（保留完整内联 CSS 样式）
      // CKEditor 标准编辑器会剥离/修改内联样式，高级编辑器保留原始 HTML
      const store = useAppStore.getState()
      store.setAdvancedEditorContent(html)
      store.setEditorContent(html)

      // 自动创建文章并保存到数据库
      try {
        const article = await window.api.articleCreate()
        const title = config.topic || `${config.industry?.name || ''}${config.contentType?.name || ''}`
        await window.api.articleUpdate(article.id, { title, content: html })
        store.setCurrentArticleId(article.id)
        store.setCurrentArticleTitle(title)
        window.dispatchEvent(new CustomEvent('load-article', { detail: { id: article.id, content: html } }))
        window.dispatchEvent(new CustomEvent('articles-changed'))
      } catch (saveErr) {
        console.error('[ContentGen] Failed to save article:', saveErr)
        // 生成成功但保存失败时不影响编辑器内容，仅提示
        toast({ title: '内容已注入编辑器', description: '但自动保存失败，请手动保存', variant: 'destructive' })
      }

      setGenProgress(100)
      setGenStatus('生成完成！')
      toast({ title: '内容生成成功', description: '已注入高级编辑器，可继续编辑' })
    } catch (err: any) {
      if (err?.message?.includes('cancel') || err?.name === 'AbortError') {
        toast({ title: '已取消生成' })
      } else {
        console.error('[ContentGen] Error:', err)
        toast({ title: '生成失败', description: err?.message || '未知错误', variant: 'destructive' })
      }
    } finally {
      genCancelRef.current = null
      setGenerating(false)
      setTimeout(() => { setGenProgress(0); setGenStatus('') }, 3000)
    }
  }, [toast])

  return (
    <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      {/* ── 左侧：标题 ── */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">微信公众号排版</span>
      </div>

      {/* ── 右侧：按功能分组 ── */}
      <div className="flex items-center gap-1">

        {/* ━━ ① 工具组 ━━ */}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSearchOpen(true)}>
          <Search className="h-3.5 w-3.5" />
          搜索
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMaterialOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" />
          素材库
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTitleAnalysisOpen(true)}>
          <Gauge className="h-3.5 w-3.5" />
          标题分析
        </Button>

        <VDivider />

        {/* ━━ ② AI 组 ━━ */}
        {editor && <AIAssistant editor={editor as any} />}
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
          onClick={() => setContentGenOpen(true)}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {generating ? genStatus || '生成中…' : '智能生成'}
        </Button>

        <VDivider />

        {/* ━━ ③ 发布组 ━━ */}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
          <Download className="h-3.5 w-3.5" />
          导出
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
          <Link2 className="h-3.5 w-3.5" />
          预览
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setReadMoreOpen(true)}>
          <ExternalLink className="h-3.5 w-3.5" />
          原文链接
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setChecklistOpen(true)}>
          <ClipboardCheck className="h-3.5 w-3.5" />
          发布检查
        </Button>

        <VDivider />

        {/* ━━ ④ 主操作 ━━ */}
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleCopy}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {isExporting ? '导出中...' : '复制到公众号'}
        </Button>

        <VDivider />

        {/* ━━ ⑤ 设置 ━━ */}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-3.5 w-3.5" />
          设置
        </Button>
      </div>

      {/* ── Progress Bar ── */}
      {generating && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
              style={{ width: `${genProgress}%` }}
            />
          </div>
          <div className="absolute -bottom-8 right-4 flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs shadow-sm z-50">
            <Loader2 className="h-3 w-3 animate-spin text-fuchsia-500" />
            <span className="text-muted-foreground">{genStatus}</span>
            <button
              className="ml-1 text-muted-foreground hover:text-destructive"
              onClick={() => genCancelRef.current?.()}
            >
              取消
            </button>
          </div>
        </>
      )}

      {/* ── Dialogs ── */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <ChecklistPanel open={checklistOpen} onOpenChange={setChecklistOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <PreviewLinkDialog open={previewOpen} onOpenChange={setPreviewOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <MaterialPanel open={materialOpen} onOpenChange={setMaterialOpen} />
      <TitleAnalyzer open={titleAnalysisOpen} onOpenChange={setTitleAnalysisOpen} onOpenAiTitle={handleOpenAiTitle} />
      <VideoCardDialog open={videoCardOpen} onOpenChange={setVideoCardOpen} editor={editor as any} />
      <MiniprogramCardDialog open={miniprogramCardOpen} onOpenChange={setMiniprogramCardOpen} editor={editor as any} />
      <ReadMoreSettings open={readMoreOpen} onOpenChange={setReadMoreOpen} />
      {contentGenOpen && (
        <ContentGeneratorPanel
          onGenerate={handleContentGenerate}
          onClose={() => setContentGenOpen(false)}
        />
      )}
    </div>
  )
}

export { TopBar }
