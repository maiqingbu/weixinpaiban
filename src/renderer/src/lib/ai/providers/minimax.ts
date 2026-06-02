import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const MinimaxProvider: AIProvider = {
  config: {
    id: 'minimax',
    name: 'MiniMax',
    defaultModel: 'MiniMax-M2.5',
    models: [
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5（推荐）', license: '商用许可' },
      { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', license: '商用许可' },
      { id: 'MiniMax-M2', name: 'MiniMax M2', license: '商用许可' },
    ],
    apiBase: 'https://api.minimax.chat/v1',
    docsUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    keyHint: '请输入 MiniMax API Key',
    license: '商用许可，详情见 MiniMax 开放平台服务协议',
    description: 'MiniMax M2.5，SWE-Bench SOTA，支持多语言编程和长文本',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
