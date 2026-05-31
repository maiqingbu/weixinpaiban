export interface ImageGenProvider {
  id: string
  name: string
  apiBase: string
  models: Array<{ id: string; name: string }>
  docsUrl: string
  keyHint: string
  description: string
}

export const IMAGE_GEN_PROVIDERS: ImageGenProvider[] = [
  // ═══ 国内平台 ═══
  {
    id: 'siliconflow-image',
    name: '硅基流动 (SiliconFlow)',
    apiBase: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 schnell (速)' },
      { id: 'black-forest-labs/FLUX.1-dev', name: 'FLUX.1 dev (质)' },
      { id: 'stabilityai/stable-diffusion-3-5-large', name: 'SD 3.5 Large' },
      { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0' },
      { id: 'Kwai-Kolors/Kolors', name: 'Kolors (可图)' },
      { id: 'Qwen/Qwen-Image', name: 'Qwen-Image (通义)' },
    ],
    docsUrl: 'https://docs.siliconflow.cn/reference/post-images-generations',
    keyHint: 'sk-...',
    description: '国产性价比之选，汇聚 FLUX/SD/Kolors/Qwen 等多个主流模型',
  },
  {
    id: 'zhipu-cogview',
    name: '智谱 GLM (CogView)',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'cogview-3-plus', name: 'CogView-3-Plus (推荐)' },
      { id: 'cogview-3', name: 'CogView-3' },
    ],
    docsUrl: 'https://open.bigmodel.cn/dev/api/normal-model/GLM-4',
    keyHint: '智谱 API Key',
    description: '国产大模型领军者，CogView 系列画质出众',
  },
  {
    id: 'qianfan-image',
    name: '百度文心一格',
    apiBase: 'https://qianfan.baidubce.com/v2',
    models: [
      { id: 'ernie-vilg-v2', name: '文心一格 2.0' },
      { id: 'stable-diffusion-xl', name: 'SDXL (百度部署)' },
    ],
    docsUrl: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/aljikpbwo',
    keyHint: '百度 API Key',
    description: '百度文心大模型，中文理解力强，适合国风配图',
  },
  {
    id: 'dashscope-image',
    name: '阿里通义万相',
    apiBase: 'https://dashscope.aliyuncs.com/api/v1',
    models: [
      { id: 'wan2.1-t2i', name: '通义万相 2.1' },
      { id: 'wan2.0-t2i', name: '通义万相 2.0' },
    ],
    docsUrl: 'https://help.aliyun.com/zh/model-studio/tongyi-wanxiang',
    keyHint: 'sk-...',
    description: '阿里云通义系列，中文场景表现出色，支持多种风格',
  },
  {
    id: 'volcengine-image',
    name: '字节豆包 (Seedream)',
    apiBase: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-seedream-3.0-t2i', name: 'Seedream 3.0' },
      { id: 'doubao-seedream-2.1-t2i', name: 'Seedream 2.1' },
    ],
    docsUrl: 'https://www.volcengine.com/docs/6791/1315615',
    keyHint: '豆包 API Key',
    description: '字节跳动旗下，Seedream 系列生图质量一流',
  },
  {
    id: 'hunyuan-image',
    name: '腾讯混元',
    apiBase: 'https://api.hunyuan.cloud.tencent.com/v1',
    models: [
      { id: 'hunyuan-image', name: '混元文生图' },
      { id: 'hunyuan-turbos-vision', name: '混元视觉增强' },
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
      { id: 'step-1x', name: 'Step-1X' },
    ],
    docsUrl: 'https://platform.stepfun.com/docs',
    keyHint: 'sk-...',
    description: '阶跃星辰多模态模型，画风细腻',
  },

  // ═══ 国际平台 ═══
  {
    id: 'openai-dalle',
    name: 'OpenAI DALL-E',
    apiBase: 'https://api.openai.com/v1',
    models: [
      { id: 'dall-e-3', name: 'DALL-E 3 (推荐)' },
      { id: 'dall-e-2', name: 'DALL-E 2' },
    ],
    docsUrl: 'https://platform.openai.com/docs/guides/images',
    keyHint: 'sk-...',
    description: '全球顶级生图模型，DALL-E 3 语义理解与艺术表现力顶尖',
  },
  {
    id: 'stability-ai',
    name: 'Stability AI',
    apiBase: 'https://api.stability.ai/v1',
    models: [
      { id: 'stable-diffusion-3.5-large', name: 'SD 3.5 Large (最新)' },
      { id: 'stable-diffusion-xl-1024-v1-0', name: 'SDXL 1.0' },
      { id: 'stable-image-ultra', name: 'Stable Image Ultra' },
      { id: 'stable-image-core', name: 'Stable Image Core' },
    ],
    docsUrl: 'https://platform.stability.ai/docs/api-reference',
    keyHint: 'sk-...',
    description: 'Stable Diffusion 原厂，开源生态最丰富，风格自由度高',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    apiBase: 'https://api.replicate.com/v1',
    models: [
      { id: 'black-forest-labs/flux-1.1-pro', name: 'FLUX.1 Pro' },
      { id: 'black-forest-labs/flux-schnell', name: 'FLUX schnell' },
      { id: 'stability-ai/sdxl', name: 'SDXL' },
      { id: 'stability-ai/stable-diffusion-3', name: 'SD3' },
    ],
    docsUrl: 'https://replicate.com/docs',
    keyHint: 'r8_...',
    description: '托管数百个开源生图模型，FLUX/SD/Playground 等一网打尽',
  },
  {
    id: 'together-image',
    name: 'Together AI',
    apiBase: 'https://api.together.xyz/v1',
    models: [
      { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 schnell' },
      { id: 'black-forest-labs/FLUX.1-dev', name: 'FLUX.1 dev' },
      { id: 'black-forest-labs/FLUX.1.1-pro', name: 'FLUX.1.1 Pro' },
      { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0' },
      { id: 'playgroundai/playground-v2.5', name: 'Playground v2.5' },
    ],
    docsUrl: 'https://docs.together.ai/docs/images-overview',
    keyHint: 'tg_...',
    description: '美国平台，FLUX/SD/Playground 系列，速度飞快',
  },
  {
    id: 'fal-image',
    name: 'FAL.ai',
    apiBase: 'https://fal.run',
    models: [
      { id: 'fal-ai/flux/dev', name: 'FLUX.1 dev' },
      { id: 'fal-ai/flux/schnell', name: 'FLUX.1 schnell' },
      { id: 'fal-ai/flux-pro/v1.1', name: 'FLUX.1 Pro' },
      { id: 'fal-ai/stable-diffusion-v3-5-large', name: 'SD 3.5 Large' },
    ],
    docsUrl: 'https://fal.ai/docs',
    keyHint: 'fal Key',
    description: '最快的 FLUX/SD 推理平台之一，按量计费',
  },
  {
    id: 'novita-image',
    name: 'Novita AI',
    apiBase: 'https://api.novita.ai/v3',
    models: [
      { id: 'dreamshaper_8.safetensors', name: 'DreamShaper 8' },
      { id: 'realistic_vision_v5.safetensors', name: 'Realistic Vision V5' },
      { id: 'juggernautxl_v9.safetensors', name: 'Juggernaut XL V9' },
    ],
    docsUrl: 'https://novita.ai/docs',
    keyHint: 'novita Key',
    description: '提供大量社区微调模型，写实/二次元/设计风格齐全',
  },
]

export function getImageGenProvider(id: string): ImageGenProvider | undefined {
  return IMAGE_GEN_PROVIDERS.find((p) => p.id === id)
}
