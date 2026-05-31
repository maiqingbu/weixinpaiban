import { ipcMain, safeStorage } from 'electron'
import { getDb } from '../db'

async function generateViaOpenAI(apiBase: string, apiKey: string, model: string, prompt: string): Promise<string[]> {
  const url = `${apiBase.replace(/\/+$/, '')}/images/generations`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: `微信公众号配图，简洁干净，适合中文排版风格。${prompt}`,
      n: 4,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`图像生成失败 (${resp.status}): ${text.slice(0, 200)}`)
  }

  const data = await resp.json()
  const images: string[] = []
  for (const item of data.data || []) {
    if (item.b64_json) {
      images.push(`data:image/png;base64,${item.b64_json}`)
    } else if (item.url) {
      // Some providers return URLs instead of base64
      try {
        const imgResp = await fetch(item.url, { signal: AbortSignal.timeout(30000) })
        if (imgResp.ok) {
          const buffer = await imgResp.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const ct = imgResp.headers.get('content-type') || 'image/png'
          images.push(`data:${ct};base64,${base64}`)
        }
      } catch { /* skip */ }
    }
  }
  return images
}

export function registerImageGenHandlers(): void {
  // List built-in providers
  ipcMain.handle('image-gen:list-providers', async () => {
    const db = getDb()
    const keys = db.prepare('SELECT provider_id, model_id FROM image_gen_keys').all() as Array<{
      provider_id: string
      model_id: string
    }>
    return { providers: [], keys }
  })

  // List configured providers (has saved API key)
  ipcMain.handle('image-gen:list-configured', async () => {
    return getDb().prepare('SELECT provider_id, model_id FROM image_gen_keys').all() as Array<{
      provider_id: string
      model_id: string
    }>
  })

  // Save API key
  ipcMain.handle('image-gen:save-key', async (_event, providerId: string, apiKey: string, modelId: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('当前系统不支持安全加密存储')
    }
    const db = getDb()
    const encrypted = safeStorage.encryptString(apiKey)
    db.prepare(`
      INSERT INTO image_gen_keys (provider_id, api_key, model_id, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(provider_id) DO UPDATE SET
        api_key = excluded.api_key,
        model_id = excluded.model_id,
        updated_at = unixepoch()
    `).run(providerId, encrypted, modelId)
    return { success: true }
  })

  // Get API key
  ipcMain.handle('image-gen:get-key', async (_event, providerId: string) => {
    const row = getDb()
      .prepare('SELECT api_key, model_id FROM image_gen_keys WHERE provider_id = ?')
      .get(providerId) as { api_key: Buffer; model_id: string } | undefined
    if (!row) return null
    const apiKey = safeStorage.decryptString(row.api_key)
    return { api_key: apiKey, model_id: row.model_id }
  })

  // Delete API key
  ipcMain.handle('image-gen:delete-key', async (_event, providerId: string) => {
    getDb().prepare('DELETE FROM image_gen_keys WHERE provider_id = ?').run(providerId)
    return { success: true }
  })

  // Generate images
  ipcMain.handle('image-gen:generate', async (_event, providerId: string, apiBase: string, modelId: string, prompt: string) => {
    const row = getDb()
      .prepare('SELECT api_key, model_id FROM image_gen_keys WHERE provider_id = ?')
      .get(providerId) as { api_key: Buffer; model_id: string } | undefined

    if (!row) {
      throw new Error('PROVIDER_NOT_CONFIGURED')
    }

    const model = modelId || row.model_id
    const apiKey = safeStorage.decryptString(row.api_key)
    return await generateViaOpenAI(apiBase, apiKey, model, prompt)
  })

  // ── Custom Image Gen Providers CRUD ──

  ipcMain.handle('image-gen:custom-list', async () => {
    return getDb().prepare('SELECT * FROM custom_image_gen_providers ORDER BY created_at DESC').all()
  })

  ipcMain.handle('image-gen:custom-save', async (_event, provider: {
    id?: string
    name: string
    apiBase: string
    defaultModel: string
    models: Array<{ id: string; name: string }>
    docsUrl?: string
    description?: string
  }) => {
    const db = getDb()
    const id = provider.id || `custom-img-${Date.now()}`
    const modelsJson = JSON.stringify(provider.models)
    db.prepare(`
      INSERT INTO custom_image_gen_providers (id, name, api_base, default_model, models_json, docs_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, api_base = excluded.api_base, default_model = excluded.default_model,
        models_json = excluded.models_json, docs_url = excluded.docs_url,
        description = excluded.description
    `).run(id, provider.name, provider.apiBase, provider.defaultModel, modelsJson, provider.docsUrl || '', provider.description || '')
    return { id }
  })

  ipcMain.handle('image-gen:custom-delete', async (_event, providerId: string) => {
    getDb().prepare('DELETE FROM custom_image_gen_providers WHERE id = ?').run(providerId)
    getDb().prepare('DELETE FROM image_gen_keys WHERE provider_id = ?').run(providerId)
    return { success: true }
  })
}
