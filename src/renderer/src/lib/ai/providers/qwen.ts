import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const QwenProvider: AIProvider = {
  config: {
    id: 'qwen',
    name: '通义千问',
    defaultModel: 'qwen-plus',
    models: [
      { id: 'qwen-max', name: 'Qwen Max（最强）', license: '商用许可' },
      { id: 'qwen-plus', name: 'Qwen Plus（推荐）', license: '商用许可' },
      { id: 'qwen-turbo', name: 'Qwen Turbo（最快）', license: '商用许可' },
      { id: 'qwen-long', name: 'Qwen Long（长文本）', license: '商用许可' },
    ],
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docsUrl: 'https://help.aliyun.com/zh/model-studio/get-api-key',
    keyHint: 'sk-...',
    license: '商用许可，详情见阿里云百炼平台服务协议',
    description: '阿里云大模型，中文能力出色，生态完善',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
