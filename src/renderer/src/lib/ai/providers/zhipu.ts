import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const ZhipuProvider: AIProvider = {
  config: {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    defaultModel: 'GLM-4.7',
    models: [
      { id: 'GLM-5.1', name: 'GLM-5.1（最新旗舰）', license: '商用许可' },
      { id: 'GLM-5', name: 'GLM-5（高智能）', license: '商用许可' },
      { id: 'GLM-4.7', name: 'GLM-4.7（推荐）', license: '商用许可' },
      { id: 'GLM-4.6', name: 'GLM-4.6', license: '商用许可' },
      { id: 'GLM-4.7-Flash', name: 'GLM-4.7 Flash（免费）', license: '商用许可' },
    ],
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    keyHint: '请输入智谱 API Key',
    license: '商用许可，详情见智谱开放平台服务协议',
    description: '国产大模型，GLM-5.1 对齐 Claude Opus 4.6，支持长文本',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
