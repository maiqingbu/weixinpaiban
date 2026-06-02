import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const HunyuanProvider: AIProvider = {
  config: {
    id: 'hunyuan',
    name: '腾讯混元',
    defaultModel: 'hunyuan-turbos-latest',
    models: [
      { id: 'hunyuan-turbos-latest', name: '混元 Turbo S（推荐）', license: '商用许可' },
      { id: 'hunyuan-t1-latest', name: '混元 T1（深度推理）', license: '商用许可' },
      { id: 'hunyuan-2.0-instruct', name: '混元 2.0 Instruct', license: '商用许可' },
      { id: 'hunyuan-2.0-thinking', name: '混元 2.0 Thinking', license: '商用许可' },
      { id: 'hunyuan-standard', name: '混元 Standard', license: '商用许可' },
    ],
    apiBase: 'https://api.hunyuan.cloud.tencent.com/v1',
    docsUrl: 'https://console.cloud.tencent.com/hunyuan/key',
    keyHint: '请输入腾讯云 API Key',
    license: '商用许可，详情见腾讯云混元大模型服务协议',
    description: '腾讯出品，混元 2.0 中文创作和对话能力强',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
