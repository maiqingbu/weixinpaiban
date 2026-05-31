import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { TitleSuggestion } from '@/lib/ai/titleAnalyzer'
import { getStyleEmoji } from '@/lib/ai/titleAnalyzer'

interface SuggestionListProps {
  suggestions: TitleSuggestion[]
  currentTitle: string
  onUseTitle: (title: string) => void
}

function countChineseWords(text: string): number {
  const chineseChars = (text.match(/[一-鿿㐀-䶿豈-﫿]/g) || []).length
  return chineseChars
}

export function SuggestionList({ suggestions, currentTitle, onUseTitle }: SuggestionListProps): React.JSX.Element {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const handleCopy = async (title: string, idx: number) => {
    await navigator.clipboard.writeText(title)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  // Filter out suggestions identical to current title
  const filtered = suggestions.filter((s) => s.title !== currentTitle)

  if (filtered.length === 0) return <></>

  return (
    <div className="space-y-2">
      {filtered.map((s, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-3 space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{getStyleEmoji(s.style)}</span>
            <span className="text-xs font-medium text-muted-foreground">{s.style}</span>
          </div>
          <p className="text-sm font-medium leading-snug">{s.title}</p>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground space-x-2">
              <span>{countChineseWords(s.title)} 字</span>
              {s.reason && <span>· {s.reason}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onUseTitle(s.title)}
            >
              使用
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleCopy(s.title, i)}
            >
              {copiedIdx === i ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
