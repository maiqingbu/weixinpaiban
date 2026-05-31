import { getScoreLevel, getClickbaitLevel } from '@/lib/ai/titleAnalyzer'
import type { TitleScores, TitleAnalysis } from '@/lib/ai/titleAnalyzer'

interface ScoreCardProps {
  scores: TitleScores
  analysis: TitleAnalysis
}

const DIMENSIONS = [
  { key: 'attractiveness' as const, label: '吸引力', icon: '🎯' },
  { key: 'truthfulness' as const, label: '真实性', icon: '✅' },
  { key: 'clickbaitRisk' as const, label: '标题党风险', icon: '⚠️' },
  { key: 'platformFit' as const, label: '平台适配', icon: '📱' },
]

export function ScoreCard({ scores, analysis }: ScoreCardProps): React.JSX.Element {
  const getBarColor = (key: string, value: number) => {
    if (key === 'clickbaitRisk') {
      // Reversed: low score = green, high = red
      if (value <= 20) return 'bg-green-500'
      if (value <= 40) return 'bg-blue-500'
      if (value <= 60) return 'bg-yellow-500'
      return 'bg-red-500'
    }
    if (value >= 85) return 'bg-green-500'
    if (value >= 70) return 'bg-blue-500'
    if (value >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-3">
      {DIMENSIONS.map((dim) => {
        const value = scores[dim.key]
        const isClickbait = dim.key === 'clickbaitRisk'
        const level = isClickbait ? getClickbaitLevel(value) : getScoreLevel(value, false)
        const comment = analysis[dim.key] || ''

        return (
          <div key={dim.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {dim.icon} {dim.label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${level.color}`}>
                  {value}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${level.color} bg-opacity-10`}>
                  {level.label}
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-all ${getBarColor(dim.key, value)}`}
                style={{ width: `${value}%` }}
              />
            </div>
            {comment && (
              <p className="text-xs text-muted-foreground">{comment}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
