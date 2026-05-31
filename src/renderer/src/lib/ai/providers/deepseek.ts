import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const DeepSeekProvider: AIProvider = {
  config: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3（推荐）', license: 'MIT 开源' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1（推理增强）', license: 'MIT 开源' },
    ],
    apiBase: 'https://api.deepseek.com',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyHint: 'sk-...',
    license: 'MIT 开源许可，商用免费',
    description: '国产开源大模型，中文创作能力强，性价比极高',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
