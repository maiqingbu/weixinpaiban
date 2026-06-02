import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const OpenAIProvider: AIProvider = {
  config: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o（最强）', license: '商用许可' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini（推荐）', license: '商用许可' },
      { id: 'o3-mini', name: 'o3-mini（推理）', license: '商用许可' },
      { id: 'o1', name: 'o1（深度推理）', license: '商用许可' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', license: '商用许可' },
    ],
    apiBase: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-...',
    license: '商用许可，需遵守 OpenAI 使用条款，国内需代理访问',
    description: 'OpenAI GPT 系列，全球领先的大模型（需科学上网）',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
