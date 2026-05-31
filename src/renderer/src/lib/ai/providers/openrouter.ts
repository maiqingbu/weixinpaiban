import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const OpenRouterProvider: AIProvider = {
  config: {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-4',
    models: [
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4（推荐）', license: '商用许可' },
      { id: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku 4.5（快速）', license: '商用许可' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', license: '商用许可' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', license: 'Llama 许可' },
    ],
    apiBase: 'https://openrouter.ai/api/v1',
    docsUrl: 'https://openrouter.ai/settings/keys',
    keyHint: 'sk-or-...',
    license: '模型聚合平台，各模型遵循原始提供商许可，国内需代理访问',
    description: '全球模型聚合平台，一个 Key 用遍所有主流模型（需科学上网）',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
