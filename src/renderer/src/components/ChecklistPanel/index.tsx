import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CircleCheck, RotateCw, Loader2, Sparkles } from 'lucide-react'
import { runChecklist } from '@/lib/checklist/runner'
import type { ChecklistResult } from '@/lib/checklist/types'
import { ChecklistItemRow } from './ChecklistItem'
import { htmlToText } from '@/lib/exporter'
import { countWords } from '@/lib/search/indexer'
import { useAppStore } from '@/store/useAppStore'
import { createAIComplete } from '@/lib/ai'
import { PROMPTS } from '@/lib/ai/prompts'

interface ChecklistPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 读取图床和 AI 配置状态（异步，返回可缓存结果） */
async function fetchConfigState(): Promise<{ imageHostConfigured: boolean; imageHostProvider: string; aiConfigured: boolean }> {
  let imageHostConfigured = false
  let imageHostProvider = ''
  let aiConfigured = false

  try {
    const providers = await window.api?.imageHostListConfigured?.()
    if (providers && providers.length > 0) {
      imageHostConfigured = true
      imageHostProvider = providers[0] || ''
    }
  } catch { /* ignore */ }

  try {
    const aiList = await window.api?.aiListConfigured?.()
    if (aiList && aiList.length > 0) {
      aiConfigured = true
    }
  } catch { /* ignore */ }

  return { imageHostConfigured, imageHostProvider, aiConfigured }
}

export function ChecklistPanel({ open, onOpenChange }: ChecklistPanelProps): React.JSX.Element {
  const [result, setResult] = useState<ChecklistResult | null>(null)
  const [checking, setChecking] = useState(false)
  const editor = useAppStore((s) => s.editorInstance)
  const articles = useAppStore((s) => s.articles)
  const currentArticleId = useAppStore((s) => s.currentArticleId)
  const configStateRef = useRef<{ imageHostConfigured: boolean; imageHostProvider: string; aiConfigured: boolean }>({
    imageHostConfigured: false,
    imageHostProvider: '',
    aiConfigured: false,
  })

  const article = useMemo(
    () => articles.find((a) => a.id === currentArticleId) ?? null,
    [articles, currentArticleId]
  )

  const runCheck = useCallback(async () => {
    if (!article) {
      console.warn('[ChecklistPanel] article is null, cannot run check')
      return
    }
    if (!editor) {
      console.warn('[ChecklistPanel] editor is null, cannot run check')
      return
    }
    setChecking(true)

    // 并行获取实时配置状态
    const configState = await fetchConfigState()
    configStateRef.current = configState

    requestAnimationFrame(() => {
      const html = (editor as any).getHTML()
      const plainText = htmlToText(html)
      const wordCount = countWords(plainText)

      const res = runChecklist({
        editor: editor as any,
        article: article as any,
        plainText,
        wordCount,
        typoCount: 0,
        sensitiveCount: 0,
        ...configState,
      })
      setResult(res)
      setChecking(false)
    })
  }, [editor, article])

  // 打开面板时自动检查
  useEffect(() => {
    if (open) runCheck()
  }, [open, runCheck])

  // 监听配置变化事件，自动重检（面板打开时）
  useEffect(() => {
    if (!open) return

    const handleConfigChange = () => {
      // 延迟重检，等待配置写入完成
      setTimeout(() => runCheck(), 500)
    }

    window.addEventListener('image-host-config-changed', handleConfigChange)
    window.addEventListener('ai-config-changed', handleConfigChange)
    window.addEventListener('settings-closed', handleConfigChange)

    return () => {
      window.removeEventListener('image-host-config-changed', handleConfigChange)
      window.removeEventListener('ai-config-changed', handleConfigChange)
      window.removeEventListener('settings-closed', handleConfigChange)
    }
  }, [open, runCheck])

  // 监听文章内容变化（编辑后自动重检，防抖 2 秒）
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      if (open && editor && article) runCheck()
    }, 2000)
    return () => clearTimeout(timer)
  }, [article?.content, article?.summary, article?.cover_image, article?.read_more_url]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI 摘要生成 ──
  const [summaryGenerating, setSummaryGenerating] = useState(false)
  const [summaryResult, setSummaryResult] = useState('')

  const generateSummary = useCallback(async () => {
    if (!editor || !article) return
    setSummaryGenerating(true)
    setSummaryResult('')
    try {
      const html = (editor as any).getHTML()
      const plainText = htmlToText(html)
      if (plainText.length < 100) {
        setSummaryResult('文章内容太短，无法生成摘要')
        return
      }
      const providers = await window.api?.aiListConfigured?.()
      const providerId = providers?.[0]?.provider_id || 'deepseek'
      const aiComplete = createAIComplete()
      const req = aiComplete(providerId, {
        messages: [
          { role: 'system', content: PROMPTS.summary.system },
          { role: 'user', content: plainText.slice(0, 6000) },
        ],
        temperature: 0.7,
        maxTokens: 300,
      })
      const resultText = await req.promise
      setSummaryResult(resultText)
      // 保存到文章
      await window.api?.articleUpdate?.(article.id, { summary: resultText })
      useAppStore.getState().updateArticle(article.id, { summary: resultText })
      // 重检
      setTimeout(() => runCheck(), 300)
    } catch (err: any) {
      setSummaryResult(err.message || '生成失败')
    } finally {
      setSummaryGenerating(false)
    }
  }, [editor, article, runCheck])

  // 监听 open-ai-summary 事件（来自 checklist 规则的 action 按钮）
  useEffect(() => {
    if (!open) return
    const handler = () => generateSummary()
    window.addEventListener('open-ai-summary', handler)
    return () => window.removeEventListener('open-ai-summary', handler)
  }, [open, generateSummary])

  const summary = result?.summary
  const items = result?.items ?? []

  // Group items by section
  const errorItems = items.filter((i) => i.severity === 'error')
  const warningItems = items.filter((i) => i.severity === 'warning')
  const infoItems = items.filter((i) => i.severity === 'info')

  const failedErrorCount = errorItems.filter((i) => !i.passed).length
  const failedWarningCount = warningItems.filter((i) => !i.passed).length
  const failedInfoCount = infoItems.filter((i) => !i.passed).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] max-w-full overflow-y-auto p-0 sm:max-w-[420px]">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
          <SheetTitle className="flex items-center justify-between">
            <span>发布检查</span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-5">
          {/* Summary bar */}
          {summary && (
            <div className="mb-5 rounded-lg border border-border bg-card p-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">
                  {summary.passed}/{summary.total}
                </span>
                <span className="text-sm text-muted-foreground">通过</span>
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                {failedErrorCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {failedErrorCount} 项错误
                  </span>
                )}
                {failedWarningCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                    {failedWarningCount} 项警告
                  </span>
                )}
                {failedInfoCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {failedInfoCount} 项提示
                  </span>
                )}
                {failedErrorCount === 0 && failedWarningCount === 0 && failedInfoCount === 0 && (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CircleCheck className="h-3.5 w-3.5" />
                    全部通过
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              正在检查...
            </div>
          )}

          {/* Error items */}
          {errorItems.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-600">
                必查项
              </h3>
              <div className="space-y-2">
                {errorItems.map((item) => (
                  <ChecklistItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Warning items */}
          {warningItems.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-600">
                建议项
              </h3>
              <div className="space-y-2">
                {warningItems.map((item) => (
                  <ChecklistItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Info items */}
          {infoItems.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                可选项
              </h3>
              <div className="space-y-2">
                {infoItems.map((item) => (
                  <ChecklistItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* AI 摘要生成 */}
          {(summaryGenerating || summaryResult) && (
            <div className="mb-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-medium">智能摘要</span>
                {summaryGenerating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              {summaryGenerating && !summaryResult && (
                <p className="text-xs text-muted-foreground">正在生成...</p>
              )}
              {summaryResult && (
                <p className="text-sm text-foreground leading-relaxed">{summaryResult}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={runCheck} disabled={checking}>
              <RotateCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? '检查中...' : '重新检查'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={generateSummary} disabled={summaryGenerating}>
              <Sparkles className={`h-3.5 w-3.5 ${summaryGenerating ? 'animate-spin' : ''}`} />
              {summaryGenerating ? '生成中...' : '智能生成摘要'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
