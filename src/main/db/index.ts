import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export interface Article {
  id: number
  title: string
  content: string
  advanced_content: string
  theme_id: string | null
  summary: string
  cover_image: string
  read_more_url: string
  read_more_text: string
  last_opened_at: number
  created_at: number
  updated_at: number
}

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'wx.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  // Run schema migrations (idempotent, ordered)
  const migrationResult = runMigrations(db)
  if (migrationResult.applied.length > 0) {
    console.log(`[db] Applied migrations: ${migrationResult.applied.join(', ')}`)
  }

  // Backfill encryption for legacy plain-text image_gen_keys (one-time)
  migrateImageGenKeysToEncrypted(db)

  return db
}

function migrateImageGenKeysToEncrypted(db: Database.Database): void {
  try {
    const cols = db.prepare("PRAGMA table_info('image_gen_keys')").all() as Array<{ name: string; type: string }>
    const apiKeyCol = cols.find((c) => c.name === 'api_key')
    if (!apiKeyCol || apiKeyCol.type.toUpperCase() !== 'TEXT') return

    const { safeStorage } = require('electron')
    if (!safeStorage.isEncryptionAvailable()) return

    const rows = db.prepare('SELECT provider_id, api_key FROM image_gen_keys').all() as Array<{ provider_id: string; api_key: string }>
    if (rows.length === 0) return

    const tx = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS image_gen_keys_new (
          provider_id TEXT PRIMARY KEY,
          api_key BLOB NOT NULL,
          model_id TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `)
      for (const row of rows) {
        try {
          const encrypted = safeStorage.encryptString(row.api_key)
          db.prepare('INSERT INTO image_gen_keys_new (provider_id, api_key, model_id, created_at, updated_at) SELECT provider_id, ?, model_id, created_at, updated_at FROM image_gen_keys WHERE provider_id = ?')
            .run(encrypted, row.provider_id)
        } catch {
          console.warn(`[db] Failed to encrypt provider ${row.provider_id}, skipping`)
        }
      }
      db.exec('DROP TABLE image_gen_keys')
      db.exec('ALTER TABLE image_gen_keys_new RENAME TO image_gen_keys')
    })
    tx()
    console.log(`[db] Migrated ${rows.length} image_gen_keys to encrypted format`)
  } catch (err) {
    console.error('[db] image_gen_keys migration failed:', err)
  }
}

function articleColumns(): string {
  return 'id, title, content, advanced_content, theme_id, summary, cover_image, read_more_url, read_more_text, last_opened_at, created_at, updated_at'
}

export function listArticles(): Article[] {
  const db = getDb()
  return db
    .prepare(`SELECT ${articleColumns()} FROM articles ORDER BY updated_at DESC`)
    .all() as Article[]
}

export function createArticle(): Article {
  const db = getDb()
  return db
    .prepare(
      `INSERT INTO articles (title, content) VALUES ('', '') RETURNING ${articleColumns()}`
    )
    .get() as Article
}

export function getArticle(id: number): Article | null {
  const db = getDb()
  return (
    db
      .prepare(`SELECT ${articleColumns()} FROM articles WHERE id = ?`)
      .get(id) as Article | undefined | null
  ) ?? null
}

export function updateArticle(
  id: number,
  data: { title?: string; content?: string; advanced_content?: string; theme_id?: string; summary?: string; read_more_url?: string; read_more_text?: string }
): Article {
  const db = getDb()
  const existing = getArticle(id)
  if (!existing) {
    throw new Error(`Article ${id} not found`)
  }

  const title = data.title ?? existing.title
  const content = data.content ?? existing.content
  const advanced_content = data.advanced_content ?? existing.advanced_content
  const theme_id = data.theme_id !== undefined ? data.theme_id : existing.theme_id
  const summary = data.summary !== undefined ? data.summary : existing.summary
  const read_more_url = data.read_more_url !== undefined ? data.read_more_url : existing.read_more_url
  const read_more_text = data.read_more_text !== undefined ? data.read_more_text : existing.read_more_text

  return db
    .prepare(
      `UPDATE articles SET title = ?, content = ?, advanced_content = ?, theme_id = ?, summary = ?, read_more_url = ?, read_more_text = ?, updated_at = unixepoch() WHERE id = ? RETURNING ${articleColumns()}`
    )
    .get(title, content, advanced_content, theme_id, summary, read_more_url, read_more_text, id) as Article
}

export function deleteArticle(id: number): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Saved Styles ──

export interface SavedStyle {
  id: number
  name: string
  styles: string // JSON
  created_at: number
}

export function listSavedStyles(): SavedStyle[] {
  return getDb().prepare('SELECT id, name, styles, created_at FROM saved_styles ORDER BY created_at DESC').all() as SavedStyle[]
}

export function createSavedStyle(name: string, styles: string): SavedStyle {
  return getDb().prepare('INSERT INTO saved_styles (name, styles) VALUES (?, ?) RETURNING id, name, styles, created_at').get(name, styles) as SavedStyle
}

export function updateSavedStyle(id: number, name: string): SavedStyle {
  return getDb().prepare('UPDATE saved_styles SET name = ? WHERE id = ? RETURNING id, name, styles, created_at').get(name, id) as SavedStyle
}

export function deleteSavedStyle(id: number): boolean {
  return getDb().prepare('DELETE FROM saved_styles WHERE id = ?').run(id).changes > 0
}

// ── Article Snapshots ──

export interface ArticleSnapshot {
  id: number
  article_id: number
  content: string
  word_count: number
  created_at: number
}

export function listSnapshots(articleId: number): ArticleSnapshot[] {
  return getDb()
    .prepare('SELECT id, article_id, content, word_count, created_at FROM article_snapshots WHERE article_id = ? ORDER BY created_at DESC LIMIT 30')
    .all(articleId) as ArticleSnapshot[]
}

export function createSnapshot(articleId: number, content: string, wordCount: number): ArticleSnapshot {
  // Enforce 30 max per article - delete oldest beyond limit
  getDb().prepare(`
    DELETE FROM article_snapshots WHERE article_id = ? AND id NOT IN (
      SELECT id FROM article_snapshots WHERE article_id = ? ORDER BY created_at DESC LIMIT 30
    )
  `).run(articleId, articleId)

  return getDb()
    .prepare('INSERT INTO article_snapshots (article_id, content, word_count) VALUES (?, ?, ?) RETURNING id, article_id, content, word_count, created_at')
    .get(articleId, content, wordCount) as ArticleSnapshot
}

export function getSnapshot(id: number): ArticleSnapshot | null {
  return (getDb().prepare('SELECT id, article_id, content, word_count, created_at FROM article_snapshots WHERE id = ?').get(id) as ArticleSnapshot | undefined | null) ?? null
}

export function getLatestSnapshotTime(articleId: number): number | null {
  const row = getDb().prepare('SELECT created_at FROM article_snapshots WHERE article_id = ? ORDER BY created_at DESC LIMIT 1').get(articleId) as { created_at: number } | undefined
  return row?.created_at ?? null
}

// ── Custom Themes ──

export interface CustomTheme {
  id: string
  name: string
  css: string
  base_theme_id: string | null
  created_at: number
  updated_at: number
}

export function listCustomThemes(): CustomTheme[] {
  return getDb().prepare('SELECT id, name, css, base_theme_id, created_at, updated_at FROM custom_themes ORDER BY updated_at DESC').all() as CustomTheme[]
}

export function createCustomTheme(id: string, name: string, css: string, baseThemeId: string | null): CustomTheme {
  return getDb().prepare('INSERT INTO custom_themes (id, name, css, base_theme_id) VALUES (?, ?, ?, ?) RETURNING id, name, css, base_theme_id, created_at, updated_at').get(id, name, css, baseThemeId) as CustomTheme
}

export function updateCustomTheme(id: string, name: string, css: string): CustomTheme {
  return getDb().prepare('UPDATE custom_themes SET name = ?, css = ?, updated_at = unixepoch() WHERE id = ? RETURNING id, name, css, base_theme_id, created_at, updated_at').get(name, css, id) as CustomTheme
}

export function deleteCustomTheme(id: string): boolean {
  return getDb().prepare('DELETE FROM custom_themes WHERE id = ?').run(id).changes > 0
}

export function duplicateCustomTheme(sourceId: string, newName: string): CustomTheme {
  const source = getDb().prepare('SELECT css, base_theme_id FROM custom_themes WHERE id = ?').get(sourceId) as { css: string; base_theme_id: string } | undefined
  if (!source) throw new Error('Source theme not found')
  const newId = `custom-${Date.now()}`
  return createCustomTheme(newId, newName, source.css, source.base_theme_id)
}

// ── Custom Materials ──

export interface CustomMaterial {
  id: string
  name: string
  kind: string
  keywords: string // JSON array
  thumbnail: string
  html: string
  group_id: string | null
  created_at: number
  updated_at: number
  use_count: number
}

export interface CustomMaterialGroup {
  id: string
  name: string
  sort_order: number
  created_at: number
}

export function listCustomMaterials(): CustomMaterial[] {
  return getDb().prepare('SELECT * FROM custom_materials ORDER BY use_count DESC, updated_at DESC').all() as CustomMaterial[]
}

export function getCustomMaterial(id: string): CustomMaterial | null {
  return (getDb().prepare('SELECT * FROM custom_materials WHERE id = ?').get(id) as CustomMaterial | undefined) ?? null
}

export function saveCustomMaterial(m: {
  id?: string
  name: string
  kind: string
  keywords: string[]
  thumbnail: string
  html: string
  group_id?: string | null
}): { id: string } {
  const db = getDb()
  const id = m.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = Math.floor(Date.now() / 1000)
  const keywordsJson = JSON.stringify(m.keywords)

  db.prepare(`
    INSERT INTO custom_materials (id, name, kind, keywords, thumbnail, html, group_id, created_at, updated_at, use_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      kind = excluded.kind,
      keywords = excluded.keywords,
      thumbnail = excluded.thumbnail,
      html = excluded.html,
      group_id = excluded.group_id,
      updated_at = excluded.updated_at
  `).run(id, m.name, m.kind, keywordsJson, m.thumbnail, m.html, m.group_id ?? null, now, now)

  return { id }
}

export function deleteCustomMaterial(id: string): boolean {
  return getDb().prepare('DELETE FROM custom_materials WHERE id = ?').run(id).changes > 0
}

export function incrementMaterialUse(id: string): void {
  getDb().prepare('UPDATE custom_materials SET use_count = use_count + 1 WHERE id = ?').run(id)
}

export function updateCustomMaterialMeta(id: string, data: { name?: string; keywords?: string[]; group_id?: string | null }): boolean {
  const existing = getCustomMaterial(id)
  if (!existing) return false
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const name = data.name ?? existing.name
  const keywords = data.keywords !== undefined ? JSON.stringify(data.keywords) : existing.keywords
  const groupId = data.group_id !== undefined ? data.group_id : existing.group_id
  db.prepare('UPDATE custom_materials SET name = ?, keywords = ?, group_id = ?, updated_at = ? WHERE id = ?').run(name, keywords, groupId, now, id)
  return true
}

export function updateCustomMaterialHtml(id: string, html: string, thumbnail: string): boolean {
  const now = Math.floor(Date.now() / 1000)
  return getDb().prepare('UPDATE custom_materials SET html = ?, thumbnail = ?, updated_at = ? WHERE id = ?').run(html, thumbnail, now, id).changes > 0
}

export function duplicateCustomMaterial(sourceId: string): { id: string } | null {
  const source = getCustomMaterial(sourceId)
  if (!source) return null
  return saveCustomMaterial({
    name: source.name + '（副本）',
    kind: source.kind,
    keywords: JSON.parse(source.keywords || '[]'),
    thumbnail: source.thumbnail,
    html: source.html,
    group_id: source.group_id,
  })
}

// ── Custom Material Groups ──

export function listCustomMaterialGroups(): CustomMaterialGroup[] {
  return getDb().prepare('SELECT * FROM custom_material_groups ORDER BY sort_order ASC, created_at ASC').all() as CustomMaterialGroup[]
}

export function createCustomMaterialGroup(name: string): CustomMaterialGroup {
  const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const now = Math.floor(Date.now() / 1000)
  // 获取最大 sort_order
  const maxRow = getDb().prepare('SELECT MAX(sort_order) as max_sort FROM custom_material_groups').get() as { max_sort: number | null }
  const sortOrder = (maxRow?.max_sort ?? -1) + 1
  return getDb().prepare('INSERT INTO custom_material_groups (id, name, sort_order, created_at) VALUES (?, ?, ?, ?) RETURNING *').get(id, name, sortOrder, now) as CustomMaterialGroup
}

export function renameCustomMaterialGroup(id: string, newName: string): boolean {
  return getDb().prepare('UPDATE custom_material_groups SET name = ? WHERE id = ?').run(newName, id).changes > 0
}

export function deleteCustomMaterialGroup(id: string, alsoDeleteMaterials: boolean): void {
  if (alsoDeleteMaterials) {
    getDb().prepare('DELETE FROM custom_materials WHERE group_id = ?').run(id)
  } else {
    // 将组内素材移到未分组
    getDb().prepare('UPDATE custom_materials SET group_id = NULL WHERE group_id = ?').run(id)
  }
  getDb().prepare('DELETE FROM custom_material_groups WHERE id = ?').run(id)
}

export function reorderCustomMaterialGroups(ids: string[]): void {
  const db = getDb()
  const stmt = db.prepare('UPDATE custom_material_groups SET sort_order = ? WHERE id = ?')
  const transaction = db.transaction((items: string[]) => {
    for (let i = 0; i < items.length; i++) {
      stmt.run(i, items[i])
    }
  })
  transaction(ids)
}

export function moveMaterialToGroup(materialId: string, groupId: string | null): boolean {
  const now = Math.floor(Date.now() / 1000)
  return getDb().prepare('UPDATE custom_materials SET group_id = ?, updated_at = ? WHERE id = ?').run(groupId, now, materialId).changes > 0
}

// ── Read More Links ──

export interface ReadMoreLink {
  id: string
  name: string
  url: string
  description: string
  is_default: number
  use_count: number
  created_at: number
  updated_at: number
}

export function listReadMoreLinks(): ReadMoreLink[] {
  return getDb().prepare('SELECT * FROM read_more_links ORDER BY use_count DESC').all() as ReadMoreLink[]
}

export function saveReadMoreLink(link: {
  id?: string
  name: string
  url: string
  description?: string
  isDefault?: boolean
}): { id: string } {
  const db = getDb()
  const id = link.id || `rml-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const now = Math.floor(Date.now() / 1000)
  const isDefault = link.isDefault ? 1 : 0

  db.prepare(`
    INSERT INTO read_more_links (id, name, url, description, is_default, use_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      url = excluded.url,
      description = excluded.description,
      is_default = excluded.is_default,
      updated_at = excluded.updated_at
  `).run(id, link.name, link.url, link.description ?? '', isDefault, now, now)

  if (link.isDefault) {
    db.prepare('UPDATE read_more_links SET is_default = 0 WHERE id != ?').run(id)
  }

  return { id }
}

export function deleteReadMoreLink(id: string): boolean {
  return getDb().prepare('DELETE FROM read_more_links WHERE id = ?').run(id).changes > 0
}

export function getDefaultReadMoreLink(): ReadMoreLink | null {
  return (getDb().prepare('SELECT * FROM read_more_links WHERE is_default = 1 LIMIT 1').get() as ReadMoreLink | undefined) ?? null
}

export function incrementReadMoreLinkUse(id: string): void {
  getDb().prepare('UPDATE read_more_links SET use_count = use_count + 1 WHERE id = ?').run(id)
}
