export interface ImageGenProvider {
  id: string
  name: string
  apiBase: string
  models: Array<{ id: string; name: string }>
  docsUrl: string
  keyHint: string
  description: string
  /** 覆盖 generateViaOpenAI 请求体中的字段，用于平台特有参数（如 size 格式） */
  bodyOverrides?: Record<string, unknown>
}

// 仅保留使用率最高的 5 个生图服务商
export const IMAGE_GEN_PROVIDERS: ImageGenProvider[] = [
  {
    id: 'siliconflow-image',
    name: '硅基流动 (SiliconFlow)',
    apiBase: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'black-forest-labs/FLUX.2-pro', name: 'FLUX.2 Pro（最新）' },
      { id: 'black-forest-labs/FLUX.2-flex', name: 'FLUX.2 Flex' },
      { id: 'black-forest-labs/FLUX.1-Kontext-dev', name: 'FLUX.1 Kontext Dev（编辑）' },
      { id: 'black-forest-labs/FLUX.1-dev', name: 'FLUX.1 Dev' },
      { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 Schnell（速）' },
      { id: 'Qwen/Qwen-Image', name: 'Qwen-Image（通义）' },
    ],
    docsUrl: 'https://docs.siliconflow.cn/reference/post-images-generations',
    keyHint: 'sk-...',
    description: '国产性价比之选，汇聚 FLUX.2/Kontext/Qwen-Image 等主流模型',
  },
  {
    id: 'volcengine-image',
    name: '字节豆包 (Seedream)',
    apiBase: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-seedream-4-5-251128', name: 'Seedream 4.5（推荐）' },
      { id: 'doubao-seedream-4-0-250828', name: 'Seedream 4.0' },
      { id: 'doubao-seedream-3.0-t2i', name: 'Seedream 3.0' },
    ],
    docsUrl: 'https://www.volcengine.com/docs/6791/1315615',
    keyHint: '火山方舟 API Key（需先创建推理接入点，将接入点 ID 填为模型）',
    description: '字节跳动旗下，Seedream 4.5 生图质量一流，4K 输出',
    bodyOverrides: { size: '2K', response_format: 'url', n: 1, watermark: false },
  },
  {
    id: 'dashscope-image',
    name: '阿里通义万相',
    apiBase: 'https://dashscope.aliyuncs.com/api/v1',
    models: [
      { id: 'wan2.2-t2i-plus', name: '通义万相 2.2 Plus（推荐）' },
      { id: 'wan2.2-t2i-flash', name: '通义万相 2.2 Flash（速）' },
      { id: 'wan2.1-t2i', name: '通义万相 2.1' },
    ],
    docsUrl: 'https://help.aliyun.com/zh/model-studio/tongyi-wanxiang',
    keyHint: 'sk-...',
    description: '阿里云通义系列，中文场景表现出色，支持多种风格',
  },
  {
    id: 'hunyuan-image',
    name: '腾讯混元',
    apiBase: 'https://api.hunyuan.cloud.tencent.com/v1',
    models: [
      { id: 'hunyuan-image', name: '混元文生图 3.0（推荐）' },
      { id: 'hunyuan-image-2.1', name: '混元文生图 2.1' },
    ],
    docsUrl: 'https://cloud.tencent.com/document/product/1729',
    keyHint: '腾讯 API Key',
    description: '腾讯混元大模型，社交场景理解深入，微信生态天然适配',
  },
  {
    id: 'stepfun-image',
    name: '阶跃星辰 (StepFun)',
    apiBase: 'https://api.stepfun.com/v1',
    models: [
      { id: 'step-2x-large', name: 'Step-2X Large（推荐）' },
      { id: 'step-1x-medium', name: 'Step-1X Medium' },
    ],
    docsUrl: 'https://platform.stepfun.com/docs',
    keyHint: 'sk-...',
    description: '阶跃星辰多模态模型，画风细腻，中文生图出色',
  },
]

export function getImageGenProvider(id: string): ImageGenProvider | undefined {
  return IMAGE_GEN_PROVIDERS.find((p) => p.id === id)
}
