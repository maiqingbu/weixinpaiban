import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const YiProvider: AIProvider = {
  config: {
    id: 'yi',
    name: '零一万物',
    defaultModel: 'yi-large',
    models: [
      { id: 'yi-large', name: 'Yi Large（最强）', license: '商用许可' },
      { id: 'yi-large-turbo', name: 'Yi Large Turbo', license: '商用许可' },
      { id: 'yi-medium', name: 'Yi Medium', license: '商用许可' },
      { id: 'yi-lightning', name: 'Yi Lightning（推荐，极速）', license: '商用许可' },
      { id: 'yi-vision', name: 'Yi Vision（多模态）', license: '商用许可' },
    ],
    apiBase: 'https://api.lingyiwanwu.com/v1',
    docsUrl: 'https://platform.lingyiwanwu.com/apikeys',
    keyHint: '...',
    license: '商用许可，详情见零一万物开放平台服务协议',
    description: '零一万物 Yi 大模型，性价比高，支持多模态',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
