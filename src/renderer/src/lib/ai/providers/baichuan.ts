import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const BaichuanProvider: AIProvider = {
  config: {
    id: 'baichuan',
    name: '百川智能',
    defaultModel: 'Baichuan4',
    models: [
      { id: 'Baichuan4', name: 'Baichuan4（最强）', license: '商用许可' },
      { id: 'Baichuan3-Turbo', name: 'Baichuan3 Turbo（推荐）', license: '商用许可' },
    ],
    apiBase: 'https://api.baichuan-ai.com/v1',
    docsUrl: 'https://platform.baichuan-ai.com/console/apikey',
    keyHint: 'sk-...',
    license: '商用许可，详情见百川智能开放平台服务协议',
    description: '中文大模型，擅长内容创作和知识问答',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
