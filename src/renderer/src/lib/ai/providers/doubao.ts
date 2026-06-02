import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const DoubaoProvider: AIProvider = {
  config: {
    id: 'doubao',
    name: '豆包',
    defaultModel: 'doubao-pro-32k',
    models: [
      { id: 'doubao-pro-256k', name: 'Doubao Pro 256K（超长文本）', license: '商用许可' },
      { id: 'doubao-pro-32k', name: 'Doubao Pro 32K（推荐）', license: '商用许可' },
      { id: 'doubao-lite-32k', name: 'Doubao Lite 32K（快速）', license: '商用许可' },
      { id: 'doubao-seed-2.0-256k', name: 'Seed 2.0 256K（最新）', license: '商用许可' },
    ],
    apiBase: 'https://ark.cn-beijing.volces.com/api/v3',
    docsUrl: 'https://www.volcengine.com/docs/82379/1099455',
    keyHint: '请填写火山方舟 API Key',
    license: '商用许可，详情见火山方舟平台服务协议',
    description: '字节跳动大模型，Seed 2.0 擅长中文理解和内容生成',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
