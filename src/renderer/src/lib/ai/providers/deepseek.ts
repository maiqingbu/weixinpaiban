import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const DeepSeekProvider: AIProvider = {
  config: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-v4-pro',
    models: [
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro（推荐）', license: 'MIT 开源' },
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', license: 'MIT 开源' },
    ],
    apiBase: 'https://api.deepseek.com',
    docsUrl: 'https://api-docs.deepseek.com/zh-cn/',
    keyHint: 'sk-...',
    license: 'MIT 开源许可，商用免费',
    description: 'DeepSeek V4，1M 上下文，支持思考模式，中文创作能力顶级',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
