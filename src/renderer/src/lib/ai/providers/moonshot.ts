import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const MoonshotProvider: AIProvider = {
  config: {
    id: 'moonshot',
    name: '月之暗面 (Kimi)',
    defaultModel: 'kimi-k2-0905-preview',
    models: [
      { id: 'kimi-k2-0905-preview', name: 'Kimi K2 最新版（推荐）', license: '商用许可' },
      { id: 'kimi-k2-turbo-preview', name: 'Kimi K2 Turbo（高速）', license: '商用许可' },
      { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K（长文本）', license: '商用许可' },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', license: '商用许可' },
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', license: '商用许可' },
    ],
    apiBase: 'https://api.moonshot.cn/v1',
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    keyHint: 'sk-...',
    license: '商用许可，详情见月之暗面开放平台服务协议',
    description: 'Kimi K2 万亿参数 MoE，256K 上下文，擅长中文创作',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
