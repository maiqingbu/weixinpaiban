import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const MinimaxProvider: AIProvider = {
  config: {
    id: 'minimax',
    name: 'MiniMax',
    defaultModel: 'abab6.5s-chat',
    models: [
      { id: 'abab6.5g-chat', name: 'abab6.5G（最强）', license: '商用许可' },
      { id: 'abab6.5s-chat', name: 'abab6.5S（推荐）', license: '商用许可' },
      { id: 'abab5.5-chat', name: 'abab5.5', license: '商用许可' },
    ],
    apiBase: 'https://api.minimax.chat/v1',
    docsUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    keyHint: '请输入 MiniMax API Key',
    license: '商用许可，详情见 MiniMax 开放平台服务协议',
    description: 'MiniMax 大模型，支持长文本和多模态',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
