export function buildTitleAnalysisPrompt(title: string, articleContent: string): string {
  const contentPreview = articleContent.slice(0, 1500)

  return `你是一位资深的微信公众号编辑，擅长分析标题质量。

请对下面这个标题进行多维度评分，并给出改进建议。

文章标题：${title}

文章内容（前 1500 字）：
${contentPreview}

评分要求：
1. 吸引力（0-100）：标题是否能吸引目标读者点开。考虑：信息缺口、数字、冲突点、好奇心引发。
2. 真实性（0-100）：标题与文章内容的匹配度。考虑：是否夸大、是否标题党、是否引战。
3. 标题党风险（0-100，越高越严重）：考虑：震惊体、滥用感叹号、强行引发情绪、悬念过度。
4. 平台适配（0-100）：是否符合公众号阅读习惯。考虑：长度（10-25字最佳）、风格、口语化程度。

然后给出 3-5 个改进后的标题候选（每个标题 10-25 字，要有不同的方向：稳健派 / 吸引派 / 数字派等）。

严格按以下 JSON 格式返回，不要任何额外文字：

{
  "scores": {
    "attractiveness": 75,
    "truthfulness": 85,
    "clickbaitRisk": 30,
    "platformFit": 70
  },
  "analysis": {
    "attractiveness": "标题用了具体数字，有一定吸引力，但缺少冲突感。",
    "truthfulness": "标题表述与正文匹配，没有夸大。",
    "clickbaitRisk": "未使用震惊体，但存在悬念过度的风险。",
    "platformFit": "长度 18 字适中，但风格偏书面化。"
  },
  "overallComment": "整体偏稳健的好标题，可在吸引力上进一步打磨。",
  "suggestions": [
    {
      "title": "改进后的标题 1",
      "style": "稳健派",
      "reason": "保留信息量的同时更平实。"
    }
  ]
}`
}

export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
