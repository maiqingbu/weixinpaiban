import type Database from 'better-sqlite3'

export interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'create_initial_tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL DEFAULT '',
          advanced_content TEXT DEFAULT '',
          theme_id TEXT,
          summary TEXT DEFAULT '',
          cover_image TEXT DEFAULT '',
          read_more_url TEXT DEFAULT '',
          read_more_text TEXT DEFAULT '阅读原文',
          last_opened_at INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_last_opened ON articles(last_opened_at DESC);

        CREATE TABLE IF NOT EXISTS article_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          word_count INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_snapshots_article_id ON article_snapshots(article_id);
        CREATE INDEX IF NOT EXISTS idx_snapshots_created ON article_snapshots(created_at DESC);

        CREATE TABLE IF NOT EXISTS saved_styles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          styles TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_styles_created_at ON saved_styles(created_at DESC);

        CREATE TABLE IF NOT EXISTS custom_themes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          css TEXT NOT NULL,
          base_theme_id TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS read_more_links (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT DEFAULT '',
          is_default INTEGER NOT NULL DEFAULT 0,
          use_count INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_read_more_default ON read_more_links(is_default);

        CREATE TABLE IF NOT EXISTS ai_keys (
          provider_id TEXT PRIMARY KEY,
          encrypted_key BLOB NOT NULL,
          model_id TEXT DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS custom_providers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          api_base TEXT NOT NULL,
          default_model TEXT NOT NULL DEFAULT '',
          models_json TEXT NOT NULL DEFAULT '[]',
          docs_url TEXT DEFAULT '',
          key_hint TEXT DEFAULT 'API Key',
          description TEXT DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS custom_material_groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS custom_materials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          keywords TEXT NOT NULL DEFAULT '[]',
          thumbnail TEXT DEFAULT '',
          html TEXT NOT NULL,
          group_id TEXT,
          use_count INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_materials_group ON custom_materials(group_id);

        CREATE TABLE IF NOT EXISTS image_gen_keys (
          provider_id TEXT PRIMARY KEY,
          api_key BLOB NOT NULL,
          model_id TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS custom_image_gen_providers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          api_base TEXT NOT NULL,
          default_model TEXT NOT NULL DEFAULT '',
          models_json TEXT NOT NULL DEFAULT '[]',
          docs_url TEXT DEFAULT '',
          description TEXT DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS image_host_configs (
          provider_id TEXT PRIMARY KEY,
          encrypted_config BLOB NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS image_host_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL DEFAULT ''
        );
      `)
    }
  },
  {
    id: 2,
    name: 'add_article_columns',
    up: (db) => {
      addColumnIfNotExists(db, 'articles', 'summary', "TEXT DEFAULT ''")
      addColumnIfNotExists(db, 'articles', 'cover_image', "TEXT DEFAULT ''")
      addColumnIfNotExists(db, 'articles', 'last_opened_at', 'INTEGER DEFAULT 0')
    }
  },
  {
    id: 3,
    name: 'add_read_more_columns',
    up: (db) => {
      addColumnIfNotExists(db, 'articles', 'read_more_url', "TEXT DEFAULT ''")
      addColumnIfNotExists(db, 'articles', 'read_more_text', "TEXT DEFAULT '阅读原文'")
    }
  },
  {
    id: 4,
    name: 'add_advanced_content',
    up: (db) => {
      addColumnIfNotExists(db, 'articles', 'advanced_content', "TEXT DEFAULT ''")
    }
  }
]

function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`[migration] Added column ${table}.${column}`)
  }
}

export function runMigrations(db: Database.Database): { applied: number[]; skipped: number[] } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  const appliedRows = db.prepare('SELECT id FROM schema_migrations').all() as Array<{ id: number }>
  const appliedIds = new Set(appliedRows.map((r) => r.id))

  const applied: number[] = []
  const skipped: number[] = []

  for (const migration of MIGRATIONS) {
    if (appliedIds.has(migration.id)) {
      skipped.push(migration.id)
      continue
    }

    try {
      const tx = db.transaction(() => {
        migration.up(db)
        db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(
          migration.id,
          migration.name
        )
      })
      tx()
      applied.push(migration.id)
      console.log(`[migration] Applied: ${migration.id} - ${migration.name}`)
    } catch (err) {
      console.error(`[migration] Failed: ${migration.id} - ${migration.name}`, err)
      throw new Error(
        `Migration ${migration.id} (${migration.name}) failed: ${(err as Error).message}`
      )
    }
  }

  return { applied, skipped }
}
