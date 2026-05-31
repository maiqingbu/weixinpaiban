import { useMemo } from 'react'
import type { TitleScores } from '@/lib/ai/titleAnalyzer'

interface RadarChartProps {
  scores: TitleScores
  size?: number
}

const AXES = [
  { key: 'attractiveness' as const, label: '吸引力' },
  { key: 'truthfulness' as const, label: '真实性' },
  { key: 'antiClickbait' as const, label: '反标题党' },
  { key: 'platformFit' as const, label: '平台适配' },
]

export function RadarChart({ scores, size = 240 }: RadarChartProps): React.JSX.Element {
  const data = useMemo(() => {
    const values = [
      scores.attractiveness,
      scores.truthfulness,
      100 - scores.clickbaitRisk,  // reverse for display
      scores.platformFit,
    ]
    return AXES.map((axis, i) => ({
      ...axis,
      value: Math.max(0, Math.min(100, values[i])),
    }))
  }, [scores])

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.35
  const levels = 5

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / data.length - Math.PI / 2
    const r = (value / 100) * radius
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const getGridPoint = (index: number, level: number) => {
    const angle = (Math.PI * 2 * index) / data.length - Math.PI / 2
    const r = (level / levels) * radius
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const dataPoints = data.map((d, i) => getPoint(i, d.value))
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const labelPoints = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
    const lr = radius + 28
    return {
      x: cx + lr * Math.cos(angle),
      y: cy + lr * Math.sin(angle),
      label: d.label,
      value: d.value,
    }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {Array.from({ length: levels }, (_, level) => (
        <polygon
          key={level}
          points={data.map((_, i) => {
            const p = getGridPoint(i, level + 1)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none"
          stroke="var(--border-color, #e2e8f0)"
          strokeWidth={1}
        />
      ))}

      {/* Axes */}
      {data.map((_, i) => {
        const center = getPoint(i, 0)
        const outer = getGridPoint(i, levels)
        return (
          <line
            key={`axis-${i}`}
            x1={center.x}
            y1={center.y}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--border-color, #e2e8f0)"
            strokeWidth={1}
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(59,130,246,0.25)"
        stroke="#3b82f6"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
      ))}

      {/* Labels */}
      {labelPoints.map((lp, i) => (
        <text
          key={`label-${i}`}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-current"
          style={{ fontSize: 11, opacity: 0.7 }}
        >
          {lp.label} {lp.value}
        </text>
      ))}
    </svg>
  )
}
