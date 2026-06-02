import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const StepfunProvider: AIProvider = {
  config: {
    id: 'stepfun',
    name: '阶跃星辰',
    defaultModel: 'step-2-16k',
    models: [
      { id: 'step-2-16k', name: 'Step-2 16K（万亿参数，推荐）', license: '商用许可' },
      { id: 'step-2-mini', name: 'Step-2 Mini（极速）', license: '商用许可' },
      { id: 'step-1-8k', name: 'Step-1 8K', license: '商用许可' },
      { id: 'step-1-32k', name: 'Step-1 32K（长文本）', license: '商用许可' },
      { id: 'step-3', name: 'Step-3（视觉推理）', license: '商用许可' },
    ],
    apiBase: 'https://api.stepfun.com/v1',
    docsUrl: 'https://platform.stepfun.com/docs/guide/api-key',
    keyHint: 'sk-...',
    license: '商用许可，详情见阶跃星辰开放平台服务协议',
    description: '阶跃星辰万亿参数大模型，擅长中文创作和逻辑推理',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
