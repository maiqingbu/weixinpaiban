import { safeStorage, ipcMain, shell } from 'electron'
import { getDb } from '../db'
import {
  validateString,
  validateAIInput,
  validateEnum,
  validateArray,
  validateObject,
  validateNumber,
  ValidationError
} from '../lib/validation'
import { isSafeExternalUrl } from '../lib/urlSafety'

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

  ipcMain.handle('ai:save-key', async (_event, providerId: unknown, apiKey: unknown, modelId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeApiKey = validateString(apiKey, 'apiKey', { minLength: 1, maxLength: 1024 })
    const safeModelId = validateString(modelId, 'modelId', { minLength: 1, maxLength: 200 })

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('当前系统不支持安全加密存储')
    }
    const encrypted = safeStorage.encryptString(safeApiKey)
    const db = getDb()
    db.prepare(`
      INSERT INTO ai_keys (provider_id, encrypted_key, model_id) VALUES (?, ?, ?)
      ON CONFLICT(provider_id) DO UPDATE SET encrypted_key = excluded.encrypted_key, model_id = excluded.model_id
    `).run(safeProviderId, encrypted, safeModelId)
    return { success: true }
  })

  ipcMain.handle('ai:get-key', async (_event, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const row = getDb()
      .prepare('SELECT encrypted_key, model_id FROM ai_keys WHERE provider_id = ?')
      .get(safeProviderId) as { encrypted_key: Buffer; model_id: string } | undefined
    if (!row) return null
    const apiKey = safeStorage.decryptString(row.encrypted_key)
    return { apiKey, modelId: row.model_id }
  })

  ipcMain.handle('ai:delete-key', async (_event, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    getDb().prepare('DELETE FROM ai_keys WHERE provider_id = ?').run(safeProviderId)
    return { success: true }
  })

  ipcMain.handle('ai:list-configured', async () => {
  const rows = getDb().prepare('SELECT provider_id, model_id FROM ai_keys').all() as Array<{
    provider_id: unknown
    model_id: unknown
  }>
  // 防御性过滤：虽然 ai_keys.provider_id 是 TEXT PRIMARY KEY 理论上保证 string，
  // 但老版本 / 升级后迁移 / SQLite type affinity 极端情况下可能存进来 null/number。
  // 这里过滤掉非 string 的行，避免脏数据流向 renderer 端的 store，间接导致
  // AIAssistant.generateSummary 等调用方把非 string provider_id 传给 ai:complete，
  // 在 main 端第 297 行 validateString 抛 ValidationError: providerId must be a string。
  return rows
    .filter(
      (r) =>
        typeof r.provider_id === 'string' &&
        r.provider_id.length > 0 &&
        r.provider_id.length <= 100
    )
    .map((r) => ({
      provider_id: r.provider_id as string,
      model_id: typeof r.model_id === 'string' ? r.model_id : ''
    }))
})

  // ── Custom Provider CRUD ──

  ipcMain.handle('ai:custom-list', async () => {
    return getDb().prepare('SELECT * FROM custom_providers ORDER BY created_at DESC').all()
  })

  ipcMain.handle('ai:custom-save', async (_event, provider: unknown) => {
    const obj = validateObject<Record<string, unknown>>(provider, 'provider')
    const id = obj.id ? validateString(obj.id, 'id', { minLength: 1, maxLength: 100 }) : `custom-${Date.now()}`
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
    const keyHint = obj.keyHint ? validateString(obj.keyHint, 'keyHint', { allowEmpty: true, maxLength: 200 }) : 'API Key'
    const description = obj.description ? validateString(obj.description, 'description', { allowEmpty: true, maxLength: 1000 }) : ''

    const modelsJson = JSON.stringify(models)
    const db = getDb()
    db.prepare(`
      INSERT INTO custom_providers (id, name, api_base, default_model, models_json, docs_url, key_hint, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, api_base = excluded.api_base, default_model = excluded.default_model,
        models_json = excluded.models_json, docs_url = excluded.docs_url, key_hint = excluded.key_hint,
        description = excluded.description
    `).run(id, name, apiBase, defaultModel, modelsJson, docsUrl, keyHint, description)
    return { id }
  })

  ipcMain.handle('ai:custom-delete', async (_event, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    getDb().prepare('DELETE FROM custom_providers WHERE id = ?').run(safeProviderId)
    getDb().prepare('DELETE FROM ai_keys WHERE provider_id = ?').run(safeProviderId)
    return { success: true }
  })

  // ── AI Completion (streaming) ──

  ipcMain.handle('ai:complete', async (event, providerId: unknown, requestId: unknown, opts: unknown) => {
  // 顶层 providerId 必须 string，否则 fallback 到 'deepseek' + warn，
  // 不再让 renderer 端的脏数据或 api:list-configured 边缘 case 把整个 AI 流程打挂。
  // 历史上这里是 validateString(...) 抛 ValidationError，导致：
  //   - AIAssistant.generateSummary 闪一下就关
  //   - ChecklistPanel 摘要失败
  //   - contentGenerator / AIBubbleMenu / Toolbar / titleAnalyzer 全部跑不了
  const safeProviderId =
    typeof providerId === 'string' && providerId.length > 0 && providerId.length <= 100
      ? providerId
      : (() => {
          console.warn(
            '[ai:complete] providerId is not a non-empty string, fallback to "deepseek". got:',
            providerId
          )
          return 'deepseek'
        })()
  // requestId 也要兜底（理论上 client.ts 一定生成 string，但 IPC 序列化极端情况兜一层）
  const safeRequestId =
    typeof requestId === 'string' && requestId.length > 0 && requestId.length <= 100
      ? requestId
      : `ai-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // ── 关键修复：所有同步路径的错误必须 send ai:error，绝不能让 invoke reject。
  // 历史 bug：之前 validateString(requestId) / validateAIInput(opts) / safeStorage.decryptString
  // 任何一个 throw 都会让 ipcRenderer.invoke 在 renderer 端 reject，绕过 ai:error 事件，
  // renderer 端 client.ts 等不到事件 → promise 永远 pending → ChecklistPanel "闪一下"
  // 后一直显示"正在生成..."，错误信息不显示。
  try {
    const input = validateAIInput(opts, 'opts')

    const keyData = getDb()
      .prepare('SELECT encrypted_key, model_id FROM ai_keys WHERE provider_id = ?')
      .get(safeProviderId) as { encrypted_key: Buffer; model_id: string } | undefined

    if (!keyData) {
      event.sender.send('ai:error', { requestId: safeRequestId, error: 'PROVIDER_NOT_CONFIGURED' })
      return { requestId: safeRequestId }
    }

    let apiKey: string
    try {
      apiKey = safeStorage.decryptString(keyData.encrypted_key)
    } catch (decryptErr) {
      const msg = decryptErr instanceof Error ? decryptErr.message : '密钥解密失败'
      event.sender.send('ai:error', { requestId: safeRequestId, error: `密钥解密失败: ${msg}` })
      return { requestId: safeRequestId }
    }

    const model = (input as any).model || keyData.model_id || getDefaultModelForProvider(safeProviderId)
    const apiBase = getApiBaseForProvider(safeProviderId)

    if (!apiBase) {
      event.sender.send('ai:error', { requestId: safeRequestId, error: `未知的 AI 服务商: ${safeProviderId}` })
      return { requestId: safeRequestId }
    }

    const controller = new AbortController()
    activeRequests.set(safeRequestId, controller)

    ;(async () => {
      try {
        const isClaude = CLAUDE_API_PROVIDERS.has(safeProviderId)
        const response = isClaude
          ? await claudeRequest(apiKey, model, input, controller.signal)
          : await openAIRequest(apiBase, apiKey, model, input, controller.signal)

        if (!response.ok) {
          let error = ''
          try {
            error = await response.text()
          } catch {
            error = `HTTP ${response.status}`
          }
          event.sender.send('ai:error', { requestId: safeRequestId, error: `请求失败 (${response.status}): ${error.slice(0, 300)}` })
          return
        }

        if (!input.stream) {
          const data = await response.json()
          const text = isClaude ? (data.content[0]?.text || '') : (data.choices[0].message.content)
          event.sender.send('ai:done', { requestId: safeRequestId, fullText: text })
          return
        }

        const reader = response.body!.getReader()
        const sendChunk = (text: string) => event.sender.send('ai:chunk', { requestId: safeRequestId, text })
        const fullText = isClaude
          ? await parseClaudeStream(reader, sendChunk)
          : await parseOpenAIStream(reader, sendChunk)

        event.sender.send('ai:done', { requestId: safeRequestId, fullText })
      } catch (e: unknown) {
        const err = e as Error
        if (err.name !== 'AbortError') {
          event.sender.send('ai:error', { requestId: safeRequestId, error: err.message || '请求失败' })
        } else {
          event.sender.send('ai:error', { requestId: safeRequestId, error: 'ABORTED' })
        }
      } finally {
        activeRequests.delete(safeRequestId)
      }
    })()

    return { requestId: safeRequestId }
  } catch (initErr: unknown) {
    // 兜底：任何 init 阶段意外 throw（validateAIInput 抛错等）都通过 ai:error 事件送出，
    // 而不是让 ipcRenderer.invoke 拒绝导致 renderer 端 promise 永远 pending。
    const err = initErr as Error
    console.error('[ai:complete] init error:', err)
    event.sender.send('ai:error', {
      requestId: safeRequestId,
      error: err.message || 'AI 请求初始化失败'
    })
    return { requestId: safeRequestId }
  }
})

  // ── AI Completion (simple, non-streaming) ──

  ipcMain.handle('ai:complete-simple', async (_event, providerId: unknown, opts: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const input = validateObject<Record<string, unknown>>(opts, 'opts')

    const messages = validateArray(input.messages, 'messages', {
      minLength: 1,
      maxLength: 200,
      itemValidator: (item, idx) => {
        const msg = validateObject<Record<string, unknown>>(item, `messages[${idx}]`)
        return {
          role: validateEnum(msg.role, ['system', 'user', 'assistant'], `messages[${idx}].role`),
          content: validateString(msg.content, `messages[${idx}].content`, { maxLength: 100 * 1024 })
        }
      }
    })
    const temperature = input.temperature !== undefined
      ? validateNumber(input.temperature, 'temperature', { min: 0, max: 2 })
      : undefined
    const maxTokens = input.maxTokens !== undefined
      ? validateNumber(input.maxTokens, 'maxTokens', { min: 1, max: 32000, integer: true })
      : undefined

    const keyData = getDb()
      .prepare('SELECT encrypted_key, model_id FROM ai_keys WHERE provider_id = ?')
      .get(safeProviderId) as { encrypted_key: Buffer; model_id: string } | undefined

    if (!keyData) throw new Error('PROVIDER_NOT_CONFIGURED')

    const apiKey = safeStorage.decryptString(keyData.encrypted_key)
    const model = keyData.model_id || getDefaultModelForProvider(safeProviderId)
    const apiBase = getApiBaseForProvider(safeProviderId)

    if (!apiBase) throw new Error(`未知的 AI 服务商: ${safeProviderId}`)

    const isClaude = CLAUDE_API_PROVIDERS.has(safeProviderId)
    const response = isClaude
      ? await claudeRequest(apiKey, model, { messages, temperature, maxTokens, stream: false })
      : await openAIRequest(apiBase, apiKey, model, { messages, temperature, maxTokens, stream: false })

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

  ipcMain.handle('ai:cancel', async (_event, requestId: unknown) => {
    const safeRequestId = validateString(requestId, 'requestId', { minLength: 1, maxLength: 100 })
    const controller = activeRequests.get(safeRequestId)
    if (controller) {
      controller.abort()
      activeRequests.delete(safeRequestId)
    }
    return { success: true }
  })

  ipcMain.handle('ai:open-external', async (_event, url: unknown) => {
    const safeUrl = validateString(url, 'url', { minLength: 1, maxLength: 2000 })
    if (!isSafeExternalUrl(safeUrl)) {
      throw new ValidationError('URL is not allowed (must be public http/https)', 'url')
    }
    shell.openExternal(safeUrl)
  })

  // ── Test connection ──

  ipcMain.handle('ai:test-connection', async (_event, providerId: unknown, apiKey: unknown): Promise<{ ok: boolean; error?: string }> => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeApiKey = validateString(apiKey, 'apiKey', { minLength: 1, maxLength: 1024 })
    const apiBase = getApiBaseForProvider(safeProviderId)
    const model = getDefaultModelForProvider(safeProviderId)
    if (!apiBase) return { ok: false, error: `未知的 AI 服务商: ${safeProviderId}` }

    try {
      const isClaude = CLAUDE_API_PROVIDERS.has(safeProviderId)
      const response = isClaude
        ? await claudeRequest(safeApiKey, 'claude-haiku-4-5-20251001', {
            messages: [{ role: 'user', content: 'hi' }],
            maxTokens: 5,
            stream: false,
          })
        : await openAIRequest(apiBase, safeApiKey, model, {
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
