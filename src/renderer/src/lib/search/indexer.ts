import Fuse from 'fuse.js'
import type { Article } from '@/store/useAppStore'

export interface SearchableArticle {
  id: number
  title: string
  plainText: string
  updatedAt: number
  lastOpenedAt: number
  wordCount: number
}

function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('p, div, h1, h2, h3, h4, blockquote, li, section, td, th').forEach((el) => {
    el.appendChild(document.createTextNode('\n'))
  })
  return div.innerText.replace(/\n+/g, '\n').trim()
}

export function countWords(html: string): number {
  const text = htmlToText(html)
  const chinese = (text.match(/[一-鿿㐀-䶿]/g) || []).length
  const english = text
    .replace(/[一-鿿㐀-䶿]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return chinese + english
}

export function buildSearchIndex(articles: Article[]): Fuse<SearchableArticle> {
  const items: SearchableArticle[] = articles.map((a) => ({
    id: a.id,
    title: a.title || '无标题文章',
    plainText: htmlToText(a.content || ''),
    updatedAt: a.updated_at,
    lastOpenedAt: a.last_opened_at,
    wordCount: countWords(a.content || ''),
  }))

  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 2.0 },
      { name: 'plainText', weight: 1.0 },
    ],
    includeMatches: true,
    threshold: 0.3,
    minMatchCharLength: 2,
    ignoreLocation: true,
  })
}
