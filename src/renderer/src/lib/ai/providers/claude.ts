import type { AIProvider, AICompletionOptions } from '../types'

export const ClaudeProvider: AIProvider = {
  config: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4（最强）', license: '商用许可' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4（推荐）', license: '商用许可' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5（快速）', license: '商用许可' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', license: '商用许可' },
    ],
    apiBase: 'https://api.anthropic.com',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'sk-ant-...',
    license: '商用许可，详情见 Anthropic 服务条款，国内需代理访问',
    description: 'Anthropic 出品，擅长长文写作、代码和推理（需科学上网）',
  },
  async complete(apiKey: string, model: string, opts: AICompletionOptions): Promise<string> {
    // Claude Messages API — 不兼容 OpenAI 格式
    const systemMsg = opts.messages.find((m) => m.role === 'system')
    const nonSystemMsgs = opts.messages.filter((m) => m.role !== 'system')

    const body: Record<string, any> = {
      model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
    }
    if (systemMsg) body.system = systemMsg.content
    if (opts.temperature !== undefined) body.temperature = opts.temperature

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude 调用失败 (${response.status}): ${error}`)
    }

    if (!opts.stream) {
      const data = await response.json()
      return data.content[0]?.text || ''
    }

    // SSE stream
    const reader = response.body!.getReader()
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
            if (text) fullText += text
          }
        } catch {
          // ignore
        }
      }
    }
    return fullText
  },
  async testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) {
        const error = await response.text()
        return { ok: false, error: `HTTP ${response.status}: ${error.slice(0, 200)}` }
      }
      return { ok: true }
    } catch (e: unknown) {
      const err = e as Error
      return { ok: false, error: err.message }
    }
  },
}
