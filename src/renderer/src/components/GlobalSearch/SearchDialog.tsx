import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
// @ts-expect-error — used as namespace for Fuse.FuseResult type
import Fuse from 'fuse.js'
import { getSearchIndex } from '@/lib/search/searcher'
import type { SearchableArticle } from '@/lib/search/indexer'
import { SearchResultItem } from './SearchResultItem'
import { useAppStore } from '@/store/useAppStore'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentArticles, setRecentArticles] = useState<SearchableArticle[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)

  // Debounce query: 200ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  const setCurrentArticleId = useAppStore((s) => s.setCurrentArticleId)
  const setEditorContent = useAppStore((s) => s.setEditorContent)
  const articles = useAppStore((s) => s.articles)

  // Build recent articles list
  useEffect(() => {
    if (!open) return
    const sorted = [...articles]
      .sort((a, b) => (b.last_opened_at || b.updated_at) - (a.last_opened_at || a.updated_at))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: a.title || '无标题文章',
        plainText: '',
        updatedAt: a.updated_at,
        lastOpenedAt: a.last_opened_at,
        wordCount: 0,
      }))
    setRecentArticles(sorted)
  }, [open, articles])

  // Search results (debounced)
  const results = useMemo(() => {
    // @ts-expect-error — Fuse used as namespace for FuseResult type
    if (!debouncedQuery.trim()) return [] as Fuse.FuseResult<SearchableArticle>[]
    const index = getSearchIndex()
    return index.search(debouncedQuery.trim()).slice(0, 30)
  }, [debouncedQuery])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Clear query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Scroll into view on selection change
  useEffect(() => {
    if (!itemsRef.current) return
    const selected = itemsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const openArticle = useCallback(
    (id: number) => {
      const article = articles.find((a) => a.id === id)
      if (article) {
        setCurrentArticleId(id)
        setEditorContent(article.content || '<p></p>')
        window.api?.articleUpdateLastOpened(id)
      }
      onOpenChange(false)
    },
    [articles, setCurrentArticleId, setEditorContent, onOpenChange]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const maxIndex = query.trim() ? results.length - 1 : recentArticles.length - 1
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, maxIndex))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (debouncedQuery.trim() && results[selectedIndex]) {
            openArticle(results[selectedIndex].item.id)
          } else if (!query.trim() && recentArticles[selectedIndex]) {
            openArticle(recentArticles[selectedIndex].id)
          }
          break
      }
    },
    [query, debouncedQuery, results, recentArticles, selectedIndex, openArticle]
  )

  const showResults = debouncedQuery.trim().length >= 2
  const showRecent = !query.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[600px] gap-0 p-0"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>全文搜索</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章标题或正文..."
            className="border-none p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Results area */}
        <div ref={itemsRef} className="max-h-[400px] overflow-y-auto p-3">
          {/* Search results */}
          {showResults && results.length > 0 && (
            <>
              <div className="mb-2 px-1 text-xs text-muted-foreground">
                {results.length} 个结果
              </div>
              <div className="flex flex-col gap-1.5">
                {results.map((r, i) => (
                  <div key={r.item.id} data-index={i}>
                    <SearchResultItem
                      item={r}
                      query={query.trim()}
                      selected={i === selectedIndex}
                      onSelect={() => openArticle(r.item.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* No results */}
          {showResults && results.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              未找到匹配的文章
            </div>
          )}

          {/* Recent articles */}
          {showRecent && (
            <>
              <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                最近打开
              </div>
              {recentArticles.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  输入关键词搜索文章
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {recentArticles.map((a, i) => (
                    <button
                      key={a.id}
                      data-index={i}
                      type="button"
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        i === selectedIndex
                          ? 'border-primary/30 bg-accent'
                          : 'border-transparent hover:bg-accent/50'
                      }`}
                      onClick={() => openArticle(a.id)}
                    >
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground/70">
                        {a.updatedAt
                          ? new Date(a.updatedAt * 1000).toLocaleDateString('zh-CN')
                          : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Hint when typing too little */}
          {query.trim().length === 1 && debouncedQuery.trim().length < 2 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              继续输入以搜索文章
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ 选择</span>
          <span>⏎ 打开</span>
          <span>Esc 关闭</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
