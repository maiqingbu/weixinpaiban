import type { AIProvider } from '../types'
import { openAICompatibleCompletion, testOpenAICompatible } from './base'

export const GeminiProvider: AIProvider = {
  config: {
    id: 'gemini',
    name: 'Gemini (Google)',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro（最强）', license: '商用许可' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash（推荐）', license: '商用许可' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', license: '商用许可' },
    ],
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docsUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'AIza...',
    license: '商用许可，详情见 Google AI 服务条款，国内需代理访问',
    description: 'Google 出品，支持超长上下文和多模态（需科学上网）',
  },
  complete(apiKey, model, opts) {
    return openAICompatibleCompletion(this.config.apiBase, apiKey, model, opts)
  },
  testConnection(apiKey) {
    return testOpenAICompatible(this.config.apiBase, apiKey, this.config.defaultModel)
  },
}
