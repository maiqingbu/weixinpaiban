import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, AlertCircle, ChevronRight, Gauge } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  analyzeTitle,
  computeOverallScore,
  getOverallLevel,
  getCacheKey,
  getCachedResult,
  setCachedResult,
  invalidateCache,
} from '@/lib/ai/titleAnalyzer'
import type { TitleAnalysisResult } from '@/lib/ai/titleAnalyzer'
import { ScoreCard } from './ScoreCard'
import { SuggestionList } from './SuggestionList'
import { RadarChart } from './RadarChart'

interface TitleAnalyzerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** If provided externally, use this title instead of reading from article */
  externalTitle?: string
  /** Open the AI title generation dialog */
  onOpenAiTitle?: () => void
}

export function TitleAnalyzer({
  open,
  onOpenChange,
  externalTitle,
  onOpenAiTitle,
}: TitleAnalyzerProps): React.JSX.Element {
  const [result, setResult] = useState<TitleAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawProgress, setRawProgress] = useState('')
  const cancelRef = useRef<(() => void) | null>(null)
  const { toast } = useToast()

  const articles = useAppStore((s) => s.articles)
  const currentArticleId = useAppStore((s) => s.currentArticleId)
  const editor = useAppStore((s) => s.editorInstance)
  const setCurrentArticleTitle = useAppStore((s) => s.setCurrentArticleTitle)

  const article = useMemo(
    () => articles.find((a) => a.id === currentArticleId) ?? null,
    [articles, currentArticleId]
  )

  const currentTitle = externalTitle ?? article?.title ?? ''

  const cacheKey = useMemo(() => {
    if (!article) return ''
    const content = editor?.getHTML?.() ?? ''
    return getCacheKey(article.id, currentTitle, content)
  }, [article, currentTitle, editor])

  const runAnalysis = useCallback(async (forceRefresh = false) => {
    if (!article || !editor || !currentTitle) return

    // Validate min length
    const chineseCount = (currentTitle.match(/[一-鿿㐀-䶿豈-﫿]/g) || []).length
    if (chineseCount < 5) {
      setError('标题过短，至少需要 5 个汉字才能进行有效分析')
      return
    }

    // Check cache
    if (!forceRefresh && cacheKey) {
      const cached = getCachedResult(cacheKey)
      if (cached) {
        setResult(cached)
        setError(null)
        return
      }
    }

    // Check AI configured
    const providers = await window.api?.aiListConfigured?.()
    if (!providers || providers.length === 0) {
      setError('请先在设置中配置智能服务商')
      return
    }
    const providerId = providers[0].provider_id

    setIsAnalyzing(true)
    setError(null)
    setRawProgress('')
    if (forceRefresh && cacheKey) invalidateCache(cacheKey)

    try {
      const analysis = await analyzeTitle(
        providerId,
        currentTitle,
        editor.getHTML(),
        (chunk) => setRawProgress((prev) => prev + chunk),
      )
      setResult(analysis)
      if (cacheKey) setCachedResult(cacheKey, analysis)
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('aborted') || msg.includes('ABORTED')) {
        setError(null)
      } else if (msg.includes('JSON') || msg.includes('格式')) {
        setError('AI 返回格式异常 [重试]')
      } else if (msg.includes('网络') || msg.includes('fetch') || msg.includes('Network')) {
        setError('AI 服务异常 [重试]')
      } else {
        setError(msg)
      }
    } finally {
      setIsAnalyzing(false)
      setRawProgress('')
    }
  }, [article, editor, currentTitle, cacheKey])

  useEffect(() => {
    if (open) {
      runAnalysis(false)
    } else {
      // Cancel any in-progress request
      cancelRef.current?.()
      setError(null)
      setRawProgress('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseTitle = useCallback(
    (title: string) => {
      if (!article || !editor) return

      // Update article in DB
      window.api?.articleUpdate?.(article.id, { title })

      // Update H1 heading in editor
      const { doc } = editor.state
      let h1Pos = -1
      doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.attrs.level === 1 && h1Pos === -1) {
          h1Pos = pos
        }
      })

      if (h1Pos >= 0) {
        const node = doc.nodeAt(h1Pos)
        if (node) {
          editor.chain().focus()
            .deleteRange({ from: h1Pos, to: h1Pos + node.nodeSize })
            .insertContentAt(h1Pos, { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] })
            .run()
        }
      } else {
        editor.chain().focus()
          .insertContentAt(0, { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] })
          .run()
      }

      // Update store (also updates articles array)
      setCurrentArticleTitle?.(title)
      toast({ title: '标题已更新', description: title })

      // Re-run analysis for the new title
      runAnalysis(true)
    },
    [article, editor, setCurrentArticleTitle, toast, runAnalysis]
  )

  const overallScore = result ? computeOverallScore(result.scores) : 0
  const overallLevel = getOverallLevel(overallScore)

  const titleWordCount = (currentTitle.match(/[一-鿿㐀-䶿豈-﫿]/g) || []).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] max-w-full overflow-y-auto p-0 sm:max-w-[480px]">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              标题分析
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-5 space-y-5">
          {/* Current title */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              当前标题
            </h4>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium">{currentTitle || '（无标题）'}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{titleWordCount} 字</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={isAnalyzing || !currentTitle}
                onClick={() => runAnalysis(true)}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
                重新分析
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">正在分析标题...</p>
              {rawProgress && (
                <p className="text-xs text-muted-foreground max-h-20 overflow-y-auto px-4">
                  {rawProgress.slice(-200)}
                </p>
              )}
            </div>
          )}

          {/* Error state */}
          {error && !isAnalyzing && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={() => runAnalysis(true)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                重试
              </Button>
            </div>
          )}

          {/* Results */}
          {result && !isAnalyzing && !error && (
            <>
              {/* Overall score */}
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-4">
                <div className="text-4xl font-bold">{overallScore}</div>
                <div className={`text-sm font-semibold ${overallLevel.color}`}>
                  {overallLevel.star} {overallLevel.label}
                </div>
              </div>

              {/* Radar chart */}
              <div className="flex justify-center">
                <RadarChart scores={result.scores} size={240} />
              </div>

              {/* Detailed scores */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  详细评分
                </h4>
                <ScoreCard scores={result.scores} analysis={result.analysis} />
              </div>

              {/* Overall comment */}
              {result.overallComment && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    智能综合评语
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.overallComment}
                  </p>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    候选标题（{result.suggestions.length} 个）
                  </h4>
                  <SuggestionList
                    suggestions={result.suggestions}
                    currentTitle={currentTitle}
                    onUseTitle={handleUseTitle}
                  />
                </div>
              )}

              {/* Link to AI title generator */}
              {onOpenAiTitle && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => {
                    onOpenChange(false)
                    onOpenAiTitle?.()
                  }}
                >
                  还想要更多候选？智能起标题
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

