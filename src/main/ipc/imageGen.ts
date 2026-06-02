import { ipcMain, safeStorage } from 'electron'
import { getDb } from '../db'
import {
  validateString,
  validateObject,
  validateArray
} from '../lib/validation'
import { isSafeExternalUrl } from '../lib/urlSafety'

async function generateViaOpenAI(
  apiBase: string, apiKey: string, model: string, prompt: string,
  bodyOverrides?: Record<string, unknown>,
): Promise<string[]> {
  // SSRF 防护：custom provider 的 apiBase 必须指向外网
  if (!isSafeExternalUrl(apiBase)) {
    throw new Error('apiBase 必须为指向公网的可信 URL，不能指向内网/本地')
  }
  const url = `${apiBase.replace(/\/+$/, '')}/images/generations`
  const defaultBody: Record<string, unknown> = {
    model,
    prompt: `微信公众号配图，简洁干净，适合中文排版风格。画面中不得出现任何水印、文字标识或AI生成标记。${prompt}`,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  }
  const body = { ...defaultBody, ...bodyOverrides }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`图像生成失败 (${resp.status}): ${text.slice(0, 300)}`)
  }

  const data = await resp.json()
  console.log('[imageGen] API response keys:', Object.keys(data))
  const images: string[] = []
  for (const item of data.data || []) {
    if (item.b64_json) {
      images.push(`data:image/png;base64,${item.b64_json}`)
    } else if (item.url) {
      // SSRF 防护：API 返回的图片 URL 也必须指向公网
      const itemUrl = String(item.url)
      if (!isSafeExternalUrl(itemUrl)) {
        console.error('[imageGen] 跳过内网/本地图片 URL:', itemUrl.slice(0, 80))
        continue
      }
      try {
        console.log('[imageGen] downloading image from URL:', itemUrl.slice(0, 80))
        const imgResp = await fetch(itemUrl, {
          signal: AbortSignal.timeout(30000),
          // 拒绝跟随 302 重定向
          redirect: 'manual',
        })
        if (imgResp.status >= 300 && imgResp.status < 400) {
          console.error('[imageGen] image redirect rejected')
          continue
        }
        if (imgResp.ok) {
          const buffer = await imgResp.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const ct = imgResp.headers.get('content-type') || 'image/png'
          images.push(`data:${ct};base64,${base64}`)
        } else {
          console.error('[imageGen] image download failed:', imgResp.status)
        }
      } catch (err) {
        console.error('[imageGen] image download error:', err)
      }
    }
  }
  console.log('[imageGen] total images extracted:', images.length)
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
  ipcMain.handle('image-gen:save-key', async (_event, providerId: unknown, apiKey: unknown, modelId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeApiKey = validateString(apiKey, 'apiKey', { minLength: 1, maxLength: 1024 })
    const safeModelId = validateString(modelId, 'modelId', { minLength: 1, maxLength: 200 })

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('当前系统不支持安全加密存储')
    }
    const db = getDb()
    const encrypted = safeStorage.encryptString(safeApiKey)
    db.prepare(`
      INSERT INTO image_gen_keys (provider_id, api_key, model_id, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(provider_id) DO UPDATE SET
        api_key = excluded.api_key,
        model_id = excluded.model_id,
        updated_at = unixepoch()
    `).run(safeProviderId, encrypted, safeModelId)
    return { success: true }
  })

  // Get API key
  ipcMain.handle('image-gen:get-key', async (_event, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const row = getDb()
      .prepare('SELECT api_key, model_id FROM image_gen_keys WHERE provider_id = ?')
      .get(safeProviderId) as { api_key: Buffer; model_id: string } | undefined
    if (!row) return null
    const apiKey = safeStorage.decryptString(row.api_key)
    return { api_key: apiKey, model_id: row.model_id }
  })

  // Delete API key
  ipcMain.handle('image-gen:delete-key', async (_event, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    getDb().prepare('DELETE FROM image_gen_keys WHERE provider_id = ?').run(safeProviderId)
    return { success: true }
  })

  // Generate images
  ipcMain.handle('image-gen:generate', async (_event, providerId: unknown, apiBase: unknown, modelId: unknown, prompt: unknown, bodyOverrides?: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeApiBase = validateString(apiBase, 'apiBase', { minLength: 1, maxLength: 500 })
    const safeModelId = validateString(modelId, 'modelId', { minLength: 1, maxLength: 200 })
    const safePrompt = validateString(prompt, 'prompt', { minLength: 1, maxLength: 4000 })
    const safeOverrides = bodyOverrides !== undefined
      ? validateObject<Record<string, unknown>>(bodyOverrides, 'bodyOverrides')
      : undefined

    const row = getDb()
      .prepare('SELECT api_key, model_id FROM image_gen_keys WHERE provider_id = ?')
      .get(safeProviderId) as { api_key: Buffer; model_id: string } | undefined

    if (!row) {
      throw new Error('PROVIDER_NOT_CONFIGURED')
    }

    const model = safeModelId || row.model_id
    const apiKey = safeStorage.decryptString(row.api_key)
    return await generateViaOpenAI(safeApiBase, apiKey, model, safePrompt, safeOverrides)
  })

  ipcMain.handle('image-gen:custom-list', async () => {
    return getDb().prepare('SELECT * FROM custom_image_gen_providers ORDER BY created_at DESC').all()
  })

  ipcMain.handle('image-gen:custom-save', async (_event, provider: unknown) => {
    const obj = validateObject<Record<string, unknown>>(provider, 'provider')
    const id = obj.id ? validateString(obj.id, 'id', { minLength: 1, maxLength: 100 }) : `custom-img-${Date.now()}`
    const name = validateString(obj.name, 'name', { minLength: 1, maxLength: 200 })
    const apiBase = validateString(obj.apiBase, 'apiBase', { minLength: 1, maxLength: 500 })
    const defaultModel = validateString(obj.defaultModel, 'defaultModel', { minLength: 1, maxLength: 200 })
    const models = validateArray(obj.models, 'models', {
      minLength: 0,
      maxLength: 100,
      itemValidator: (item, idx) => {
        const m = validateObject<Record<string, unknown>>(item, `models[${idx}]`)
        return {
          id: validateString(m.id, `models[${idx}].id`, { minLength: 1, maxLength: 200 }),
          name: validateString(m.name, `models[${idx}].name`, { minLength: 1, maxLength: 200 })
        }
      }
    })
    const docsUrl = obj.docsUrl ? validateString(obj.docsUrl, 'docsUrl', { allowEmpty: true, maxLength: 500 }) : ''
    const description = obj.description ? validateString(obj.description, 'description', { allowEmpty: true, maxLength: 1000 }) : ''

    const modelsJson = JSON.stringify(models)
    const db = getDb()
    db.prepare(`
      INSERT INTO custom_image_gen_providers (id, name, api_base, default_model, models_json, docs_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, api_base = excluded.api_base, default_model = excluded.default_model,
        models_json = excluded.models_json, docs_url = excluded.docs_url,
        description = excluded.description
    `).run(id, name, apiBase, defaultModel, modelsJson, docsUrl, description)
    return { id }
  })

  ipcMain.handle('image-gen:custom-delete', async (_event, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    getDb().prepare('DELETE FROM custom_image_gen_providers WHERE id = ?').run(safeProviderId)
    getDb().prepare('DELETE FROM image_gen_keys WHERE provider_id = ?').run(safeProviderId)
    return { success: true }
  })
}
