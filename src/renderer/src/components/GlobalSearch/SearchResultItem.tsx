// @ts-expect-error — used as namespace for Fuse.FuseResult type
import Fuse from 'fuse.js'
import type { SearchableArticle } from '@/lib/search/indexer'

interface SearchResultItemProps {
  // @ts-expect-error — Fuse used as namespace for FuseResult type
  item: Fuse.FuseResult<SearchableArticle>
  query: string
  selected: boolean
  onSelect: () => void
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((p, i) =>
    regex.test(p)
      ? <mark key={i} className="rounded bg-yellow-200 px-0.5 text-foreground">{p}</mark>
      : p
  )
}

export function SearchResultItem({
  item,
  query,
  selected,
  onSelect,
}: SearchResultItemProps): React.JSX.Element {
  const article = item.item
  const titleMatch = item.matches?.find((m) => m.key === 'title')
  const bodyMatch = item.matches?.find((m) => m.key === 'plainText')

  const matchedTitle = titleMatch
    ? titleMatch.value!
    : article.title

  // Build snippet with context around match
  const snippet = (() => {
    if (!bodyMatch || bodyMatch.indices.length === 0) return ''
    const idx = bodyMatch.indices[0][0]
    const start = Math.max(0, idx - 30)
    const end = Math.min(article.plainText.length, bodyMatch.indices[0][1] + 30)
    const prefix = start > 0 ? '...' : ''
    const suffix = end < article.plainText.length ? '...' : ''
    return prefix + article.plainText.slice(start, end) + suffix
  })()

  const dateStr = article.updatedAt
    ? new Date(article.updatedAt * 1000).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      })
    : ''

  return (
    <button
      type="button"
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-primary/30 bg-accent'
          : 'border-transparent hover:bg-accent/50'
      }`}
      onClick={onSelect}
    >
      <div className="text-sm font-medium">
        {query ? highlightMatch(matchedTitle, query) : matchedTitle}
      </div>
      {snippet && (
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {query ? highlightMatch(snippet, query) : snippet}
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
        {dateStr && <span>{dateStr}</span>}
        <span>{article.wordCount} 字</span>
      </div>
    </button>
  )
}
