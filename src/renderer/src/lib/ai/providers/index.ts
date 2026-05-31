import { DeepSeekProvider } from './deepseek'
import { QwenProvider } from './qwen'
import { DoubaoProvider } from './doubao'
import { ZhipuProvider } from './zhipu'
import { MoonshotProvider } from './moonshot'
import { BaichuanProvider } from './baichuan'
import { MinimaxProvider } from './minimax'
import { StepfunProvider } from './stepfun'
import { YiProvider } from './yi'
import { HunyuanProvider } from './hunyuan'
import { SiliconFlowProvider } from './siliconflow'
import { ClaudeProvider } from './claude'
import { OpenAIProvider } from './openai'
import { GeminiProvider } from './gemini'
import { GroqProvider } from './groq'
import { OpenRouterProvider } from './openrouter'
import type { AIProvider } from '../types'

// 国内服务商优先，海外服务商排后面
export const PROVIDERS: AIProvider[] = [
  DeepSeekProvider,
  QwenProvider,
  DoubaoProvider,
  ZhipuProvider,
  MoonshotProvider,
  BaichuanProvider,
  MinimaxProvider,
  StepfunProvider,
  YiProvider,
  HunyuanProvider,
  SiliconFlowProvider,
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  GroqProvider,
  OpenRouterProvider,
]

export const DEFAULT_PROVIDER_ID = 'deepseek'

export function getProvider(id: string): AIProvider | undefined {
  return PROVIDERS.find((p) => p.config.id === id)
}
