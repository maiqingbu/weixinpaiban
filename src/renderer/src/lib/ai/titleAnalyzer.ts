import { createAIComplete } from './client'
import { buildTitleAnalysisPrompt, simpleHash } from './titlePrompts'

export interface TitleScores {
  attractiveness: number
  truthfulness: number
  clickbaitRisk: number
  platformFit: number
}

export interface TitleAnalysis {
  attractiveness: string
  truthfulness: string
  clickbaitRisk: string
  platformFit: string
}

export interface TitleSuggestion {
  title: string
  style: string
  reason: string
}

export interface TitleAnalysisResult {
  scores: TitleScores
  analysis: TitleAnalysis
  overallComment: string
  suggestions: TitleSuggestion[]
}

// Field name compatibility — AI may use alternate names
function normalizeScores(raw: Record<string, any>): TitleScores {
  return {
    attractiveness: raw.attractiveness ?? raw.attraction ?? raw.attractive ?? 0,
    truthfulness: raw.truthfulness ?? raw.truth ?? raw.accuracy ?? 0,
    clickbaitRisk: raw.clickbaitRisk ?? raw.clickbait_risk ?? raw.clickbait ?? 0,
    platformFit: raw.platformFit ?? raw.platform_fit ?? raw.platform ?? 0,
  }
}

function parseAIResponse(response: string): TitleAnalysisResult {
  const cleaned = response.replace(/```json\s*|\s*```/g, '').trim()
  const raw = JSON.parse(cleaned)

  const scores = normalizeScores(raw.scores || {})

  const analysis: TitleAnalysis = {
    attractiveness: raw.analysis?.attractiveness ?? raw.analysis?.attraction ?? '',
    truthfulness: raw.analysis?.truthfulness ?? raw.analysis?.truth ?? '',
    clickbaitRisk: raw.analysis?.clickbaitRisk ?? raw.analysis?.clickbait_risk ?? raw.analysis?.clickbait ?? '',
    platformFit: raw.analysis?.platformFit ?? raw.analysis?.platform_fit ?? raw.analysis?.platform ?? '',
  }

  const suggestions: TitleSuggestion[] = (Array.isArray(raw.suggestions) ? raw.suggestions : [])
    .map((s: any) => ({
      title: s.title || '',
      style: s.style || '稳健派',
      reason: s.reason || '',
    }))
    .filter((s: TitleSuggestion) => s.title)

  return {
    scores,
    analysis,
    overallComment: raw.overallComment ?? raw.overall_comment ?? '',
    suggestions,
  }
}

// Session cache — avoid re-calling AI for same article+title
const resultCache = new Map<string, TitleAnalysisResult>()

export function getCacheKey(articleId: number, title: string, content: string): string {
  return `ta-${articleId}-${simpleHash(title + content.slice(0, 500))}`
}

export function getCachedResult(key: string): TitleAnalysisResult | null {
  return resultCache.get(key) ?? null
}

export function setCachedResult(key: string, result: TitleAnalysisResult): void {
  resultCache.set(key, result)
}

export function invalidateCache(key: string): void {
  resultCache.delete(key)
}

export function clearAllCache(): void {
  resultCache.clear()
}

export async function analyzeTitle(
  providerId: string,
  title: string,
  articleContent: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
): Promise<TitleAnalysisResult> {
  const prompt = buildTitleAnalysisPrompt(title, articleContent)
  const aiComplete = createAIComplete()

  const request = aiComplete(
    providerId,
    {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: true,
      signal,
    },
    onChunk,
  )

  const response = await request.promise

  return parseAIResponse(response)
}

export function getScoreLevel(score: number, isReverse = false): { label: string; color: string } {
  const s = isReverse ? 100 - score : score
  if (s >= 85) return { label: '优秀', color: 'text-green-600' }
  if (s >= 70) return { label: '良好', color: 'text-blue-600' }
  if (s >= 50) return { label: '一般', color: 'text-yellow-600' }
  return { label: '较差', color: 'text-red-600' }
}

export function getClickbaitLevel(risk: number): { label: string; color: string } {
  if (risk <= 20) return { label: '低风险', color: 'text-green-600' }
  if (risk <= 40) return { label: '轻微', color: 'text-blue-600' }
  if (risk <= 60) return { label: '中等', color: 'text-yellow-600' }
  return { label: '高风险', color: 'text-red-600' }
}

export function computeOverallScore(scores: TitleScores): number {
  return Math.round(
    scores.attractiveness * 0.35 +
    scores.truthfulness * 0.30 +
    (100 - scores.clickbaitRisk) * 0.20 +
    scores.platformFit * 0.15
  )
}

export function getOverallLevel(score: number): { label: string; color: string; star: string } {
  if (score >= 90) return { label: '优秀', color: 'text-green-600', star: '⭐' }
  if (score >= 75) return { label: '良好', color: 'text-blue-600', star: '⭐' }
  if (score >= 60) return { label: '一般', color: 'text-yellow-600', star: '⭐' }
  return { label: '较差', color: 'text-red-600', star: '⭐' }
}

const STYLE_EMOJI: Record<string, string> = {
  '稳健派': '🛡',
  '数字派': '🔢',
  '悬念派': '🎭',
  '吸引派': '⚡',
  '直白派': '📰',
}

export function getStyleEmoji(style: string): string {
  for (const [key, emoji] of Object.entries(STYLE_EMOJI)) {
    if (style.includes(key)) return emoji
  }
  return '📌'
}
