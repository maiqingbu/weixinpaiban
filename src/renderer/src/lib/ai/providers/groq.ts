import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const GroqProvider: AIProvider = {
  config: {
    id: 'groq',
    name: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B（推荐）', license: '开源 Llama 许可' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', license: 'Llama 许可' },
      { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', license: 'Llama 许可' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B（极速）', license: '开源 Llama 许可' },
    ],
    apiBase: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_...',
    license: '开源模型，推理由 Groq 提供，国内需代理访问',
    description: 'Groq LPU 推理，Llama 4 支持，速度极快（需科学上网）',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
