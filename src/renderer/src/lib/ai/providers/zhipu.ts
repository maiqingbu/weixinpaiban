import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const ZhipuProvider: AIProvider = {
  config: {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    defaultModel: 'glm-4-flash',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus（最强）', license: '商用许可' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash（推荐）', license: '商用许可' },
      { id: 'glm-4-long', name: 'GLM-4 Long（长文本 1M）', license: '商用许可' },
    ],
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    keyHint: '请输入智谱 API Key',
    license: '商用许可，详情见智谱开放平台服务协议',
    description: '国产大模型，中文能力优秀，支持长文本',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
