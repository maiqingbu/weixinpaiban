import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const StepfunProvider: AIProvider = {
  config: {
    id: 'stepfun',
    name: '阶跃星辰',
    defaultModel: 'step-1-flash',
    models: [
      { id: 'step-1-256k', name: 'Step-1 256K（超长文本）', license: '商用许可' },
      { id: 'step-1-128k', name: 'Step-1 128K', license: '商用许可' },
      { id: 'step-1-flash', name: 'Step-1 Flash（推荐）', license: '商用许可' },
    ],
    apiBase: 'https://api.stepfun.com/v1',
    docsUrl: 'https://platform.stepfun.com/docs/guide/api-key',
    keyHint: 'sk-...',
    license: '商用许可，详情见阶跃星辰开放平台服务协议',
    description: '阶跃星辰大模型，擅长中文创作和逻辑推理',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
