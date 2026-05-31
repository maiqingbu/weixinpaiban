import Fuse from 'fuse.js'
import { buildSearchIndex, countWords, type SearchableArticle } from './indexer'
import { useAppStore } from '@/store/useAppStore'

function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('p, div, h1, h2, h3, h4, blockquote, li, section, td, th').forEach((el) => {
    el.appendChild(document.createTextNode('\n'))
  })
  return div.innerText.replace(/\n+/g, '\n').trim()
}

let searchIndex: Fuse<SearchableArticle> | null = null

export function getSearchIndex(): Fuse<SearchableArticle> {
  if (!searchIndex) {
    const articles = useAppStore.getState().articles
    searchIndex = buildSearchIndex(articles)
  }
  return searchIndex
}

export function resetSearchIndex(): void {
  searchIndex = null
}

export function updateArticleInIndex(article: {
  id: number
  title: string
  content: string
  updated_at: number
  last_opened_at: number
}): void {
  if (!searchIndex) return
  const items = (searchIndex as any)._docs as SearchableArticle[]
  const idx = items.findIndex((i) => i.id === article.id)

  const newItem: SearchableArticle = {
    id: article.id,
    title: article.title || '无标题文章',
    plainText: htmlToText(article.content || ''),
    updatedAt: article.updated_at,
    lastOpenedAt: article.last_opened_at,
    wordCount: countWords(article.content || ''),
  }

  if (idx >= 0) {
    searchIndex.removeAt(idx)
  }
  searchIndex.add(newItem)
}

export function removeArticleFromIndex(id: number): void {
  if (!searchIndex) return
  const items = (searchIndex as any)._docs as SearchableArticle[]
  const idx = items.findIndex((i) => i.id === id)
  if (idx >= 0) {
    searchIndex.removeAt(idx)
  }
}
