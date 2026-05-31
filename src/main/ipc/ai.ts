import { safeStorage, ipcMain, shell } from 'electron'
import { getDb } from '../db'

// Active requests for cancellation
const activeRequests = new Map<string, AbortController>()

// Built-in provider API bases
const BUILTIN_API_BASES: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  moonshot: 'https://api.moonshot.cn/v1',
  baichuan: 'https://api.baichuan-ai.com/v1',
  minimax: 'https://api.minimax.chat/v1',
  stepfun: 'https://api.stepfun.com/v1',
  yi: 'https://api.lingyiwanwu.com/v1',
  hunyuan: 'https://api.hunyuan.cloud.tencent.com/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
  claude: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

const BUILTIN_DEFAULT_MODELS: Record<string, string> = {
  deepseek: 'deepseek-v4-pro',
  qwen: 'qwen-plus',
  doubao: 'doubao-pro-32k',
  zhipu: 'glm-4-flash',
  moonshot: 'moonshot-v1-8k',
  baichuan: 'Baichuan4',
  minimax: 'abab6.5s-chat',
  stepfun: 'step-1-flash',
  yi: 'yi-lightning',
  hunyuan: 'hunyuan-turbos-latest',
  siliconflow: 'deepseek-ai/DeepSeek-V3',
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'anthropic/claude-sonnet-4',
}

// Providers that use Claude Messages API instead of OpenAI Chat Completions
const CLAUDE_API_PROVIDERS = new Set(['claude'])

function getApiBaseForProvider(providerId: string): string | null {
  if (BUILTIN_API_BASES[providerId]) return BUILTIN_API_BASES[providerId]
  const row = getDb()
    .prepare('SELECT api_base FROM custom_providers WHERE id = ?')
    .get(providerId) as { api_base: string } | undefined
  return row?.api_base || null
}

function getDefaultModelForProvider(providerId: string): string {
  if (BUILTIN_DEFAULT_MODELS[providerId]) return BUILTIN_DEFAULT_MODELS[providerId]
  const row = getDb()
    .prepare('SELECT default_model FROM custom_providers WHERE id = ?')
    .get(providerId) as { default_model: string } | undefined
  return row?.default_model || ''
}

// ── Claude Messages API request ──

async function claudeRequest(
  apiKey: string,
  model: string,
  opts: { messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number; stream?: boolean },
  signal?: AbortSignal,
): Promise<Response> {
  const systemMsg = opts.messages.find((m) => m.role === 'system')
  const nonSystemMsgs = opts.messages.filter((m) => m.role !== 'system')

  const body: Record<string, any> = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
    stream: opts.stream ?? true,
  }
  if (systemMsg) body.system = systemMsg.content
  if (opts.temperature !== undefined) body.temperature = opts.temperature

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  })
}

// ── OpenAI-compatible request ──

async function openAIRequest(
  apiBase: string,
  apiKey: string,
  model: string,
  opts: { messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number; stream?: boolean },
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2000,
      stream: opts.stream ?? true,
    }),
    signal,
  })
}

// ── SSE stream parsing for OpenAI format ──

async function parseOpenAIStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  sendChunk: (text: string) => void,
): Promise<string> {
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return fullText
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices[0]?.delta?.content || ''
        if (delta) {
          fullText += delta
          sendChunk(delta)
        }
      } catch {
        // ignore
      }
    }
  }
  return fullText
}

// ── SSE stream parsing for Claude format ──

async function parseClaudeStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  sendChunk: (text: string) => void,
): Promise<string> {
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta') {
          const text = parsed.delta?.text || ''
          if (text) {
            fullText += text
            sendChunk(text)
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return fullText
}

export function registerAiHandlers(): void {
  // ── AI Key CRUD ──

  ipcMain.handle('ai:save-key', async (_event, providerId: string, apiKey: string, modelId: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('当前系统不支持安全加密存储')
    }
    const encrypted = safeStorage.encryptString(apiKey)
    const db = getDb()
    db.prepare(`
      INSERT INTO ai_keys (provider_id, encrypted_key, model_id) VALUES (?, ?, ?)
      ON CONFLICT(provider_id) DO UPDATE SET encrypted_key = excluded.encrypted_key, model_id = excluded.model_id
    `).run(providerId, encrypted, modelId)
    return { success: true }
  })

  ipcMain.handle('ai:get-key', async (_event, providerId: string) => {
    const row = getDb()
      .prepare('SELECT encrypted_key, model_id FROM ai_keys WHERE provider_id = ?')
      .get(providerId) as { encrypted_key: Buffer; model_id: string } | undefined
    if (!row) return null
    const apiKey = safeStorage.decryptString(row.encrypted_key)
    return { apiKey, modelId: row.model_id }
  })

  ipcMain.handle('ai:delete-key', async (_event, providerId: string) => {
    getDb().prepare('DELETE FROM ai_keys WHERE provider_id = ?').run(providerId)
    return { success: true }
  })

  ipcMain.handle('ai:list-configured', async () => {
    return getDb().prepare('SELECT provider_id, model_id FROM ai_keys').all() as Array<{
      provider_id: string
      model_id: string
    }>
  })

  // ── Custom Provider CRUD ──

  ipcMain.handle('ai:custom-list', async () => {
    return getDb().prepare('SELECT * FROM custom_providers ORDER BY created_at DESC').all()
  })

  ipcMain.handle('ai:custom-save', async (_event, provider: {
    id?: string
    name: string
    apiBase: string
    defaultModel: string
    models: Array<{ id: string; name: string }>
    docsUrl?: string
    keyHint?: string
    description?: string
  }) => {
    const db = getDb()
    const id = provider.id || `custom-${Date.now()}`
    const modelsJson = JSON.stringify(provider.models)
    db.prepare(`
      INSERT INTO custom_providers (id, name, api_base, default_model, models_json, docs_url, key_hint, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, api_base = excluded.api_base, default_model = excluded.default_model,
        models_json = excluded.models_json, docs_url = excluded.docs_url, key_hint = excluded.key_hint,
        description = excluded.description
    `).run(id, provider.name, provider.apiBase, provider.defaultModel, modelsJson, provider.docsUrl || '', provider.keyHint || 'API Key', provider.description || '')
    return { id }
  })

  ipcMain.handle('ai:custom-delete', async (_event, providerId: string) => {
    getDb().prepare('DELETE FROM custom_providers WHERE id = ?').run(providerId)
    getDb().prepare('DELETE FROM ai_keys WHERE provider_id = ?').run(providerId)
    return { success: true }
  })

  // ── AI Completion (streaming) ──

  ipcMain.handle('ai:complete', async (event, providerId: string, requestId: string, opts: any) => {
    const keyData = getDb()
      .prepare('SELECT encrypted_key, model_id FROM ai_keys WHERE provider_id = ?')
      .get(providerId) as { encrypted_key: Buffer; model_id: string } | undefined

    if (!keyData) {
      event.sender.send('ai:error', { requestId, error: 'PROVIDER_NOT_CONFIGURED' })
      return { requestId }
    }

    const apiKey = safeStorage.decryptString(keyData.encrypted_key)
    const model = opts.model || keyData.model_id || getDefaultModelForProvider(providerId)
    const apiBase = getApiBaseForProvider(providerId)

    if (!apiBase) {
      event.sender.send('ai:error', { requestId, error: `未知的 AI 服务商: ${providerId}` })
      return { requestId }
    }

    const controller = new AbortController()
    activeRequests.set(requestId, controller)

    ;(async () => {
      try {
        const isClaude = CLAUDE_API_PROVIDERS.has(providerId)
        const response = isClaude
          ? await claudeRequest(apiKey, model, opts, controller.signal)
          : await openAIRequest(apiBase, apiKey, model, opts, controller.signal)

        if (!response.ok) {
          const error = await response.text()
          event.sender.send('ai:error', { requestId, error: `请求失败 (${response.status}): ${error.slice(0, 300)}` })
          return
        }

        if (!opts.stream) {
          const data = await response.json()
          const text = isClaude ? (data.content[0]?.text || '') : (data.choices[0].message.content)
          event.sender.send('ai:done', { requestId, fullText: text })
          return
        }

        const reader = response.body!.getReader()
        const sendChunk = (text: string) => event.sender.send('ai:chunk', { requestId, text })
        const fullText = isClaude
          ? await parseClaudeStream(reader, sendChunk)
          : await parseOpenAIStream(reader, sendChunk)

        event.sender.send('ai:done', { requestId, fullText })
      } catch (e: unknown) {
        const err = e as Error
        if (err.name !== 'AbortError') {
          event.sender.send('ai:error', { requestId, error: err.message || '请求失败' })
        } else {
          event.sender.send('ai:error', { requestId, error: 'ABORTED' })
        }
      } finally {
        activeRequests.delete(requestId)
      }
    })()

    return { requestId }
  })

  // ── AI Completion (simple, non-streaming) ──

  ipcMain.handle('ai:complete-simple', async (_event, providerId: string, opts: { messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number }) => {
    const keyData = getDb()
      .prepare('SELECT encrypted_key, model_id FROM ai_keys WHERE provider_id = ?')
      .get(providerId) as { encrypted_key: Buffer; model_id: string } | undefined

    if (!keyData) throw new Error('PROVIDER_NOT_CONFIGURED')

    const apiKey = safeStorage.decryptString(keyData.encrypted_key)
    const model = keyData.model_id || getDefaultModelForProvider(providerId)
    const apiBase = getApiBaseForProvider(providerId)

    if (!apiBase) throw new Error(`未知的 AI 服务商: ${providerId}`)

    const isClaude = CLAUDE_API_PROVIDERS.has(providerId)
    const response = isClaude
      ? await claudeRequest(apiKey, model, { ...opts, stream: false })
      : await openAIRequest(apiBase, apiKey, model, { ...opts, stream: false })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`请求失败 (${response.status}): ${errText.slice(0, 300)}`)
    }

    const data = await response.json()
    const text = isClaude ? (data.content[0]?.text || '') : (data?.choices?.[0]?.message?.content || '')
    if (!text) {
      console.error('[ai:complete-simple] Empty content. Raw response:', JSON.stringify(data).slice(0, 1000))
    }
    return { text, _raw: JSON.stringify(data).slice(0, 500) }
  })

  ipcMain.handle('ai:cancel', async (_event, requestId: string) => {
    const controller = activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      activeRequests.delete(requestId)
    }
    return { success: true }
  })

  ipcMain.handle('ai:open-external', async (_event, url: string) => {
    shell.openExternal(url)
  })

  // ── Test connection ──

  ipcMain.handle('ai:test-connection', async (_event, providerId: string, apiKey: string) => {
    const apiBase = getApiBaseForProvider(providerId)
    const model = getDefaultModelForProvider(providerId)
    if (!apiBase) return { ok: false, error: `未知的 AI 服务商: ${providerId}` }

    try {
      const isClaude = CLAUDE_API_PROVIDERS.has(providerId)
      const response = isClaude
        ? await claudeRequest(apiKey, 'claude-haiku-4-5-20251001', {
            messages: [{ role: 'user', content: 'hi' }],
            maxTokens: 5,
            stream: false,
          })
        : await openAIRequest(apiBase, apiKey, model, {
            messages: [{ role: 'user', content: 'hi' }],
            maxTokens: 5,
            stream: false,
          })

      if (!response.ok) {
        const error = await response.text()
        return { ok: false, error: `请求失败 (${response.status}): ${error.slice(0, 200)}` }
      }
      return { ok: true }
    } catch (e: unknown) {
      const err = e as Error
      return { ok: false, error: err.message || '网络连接失败' }
    }
  })
}
