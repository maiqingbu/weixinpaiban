import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const SiliconFlowProvider: AIProvider = {
  config: {
    id: 'siliconflow',
    name: '硅基流动',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', license: 'MIT' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1（推理）', license: 'MIT' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', license: 'Apache 2.0' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', license: 'Llama 许可' },
    ],
    apiBase: 'https://api.siliconflow.cn/v1',
    docsUrl: 'https://cloud.siliconflow.cn/account/ak',
    keyHint: 'sk-...',
    license: '开源模型聚合平台，各模型遵循原始开源许可',
    description: '国产 AI 推理平台，聚合多种开源模型，价格低',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
