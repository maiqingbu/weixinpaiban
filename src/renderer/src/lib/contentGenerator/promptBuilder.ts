/**
 * 内容生成 Prompt 构建器
 * 将 ContentGenConfig 转化为结构化的 AI prompt
 */
import type { ContentGenConfig } from './types';

/** 字数映射 */
const LENGTH_MAP = {
  short: '约 800 字（快讯/简报风格）',
  medium: '约 1500 字（标准公众号文章）',
  long: '约 3000 字（深度长文）',
} as const;

/** 语气描述 */
const TONE_MAP: Record<string, string> = {
  professional: '专业严谨，用词精准，逻辑清晰',
  casual: '轻松活泼，口语化表达，贴近年轻读者',
  storytelling: '故事叙事，有情节起伏，引人入胜',
  'data-driven': '数据驱动，用数据说话，图表辅助',
  emotional: '情感共鸣，触动人心，引发思考',
  authoritative: '权威发布，官方口吻，庄重正式',
  humorous: '幽默风趣，适当玩梗，轻松愉快',
  inspirational: '激励鼓舞，积极向上，正能量',
};

/** 受众描述 */
const AUDIENCE_MAP: Record<string, string> = {
  general: '大众读者，无需专业背景',
  professional: '行业从业者，具备专业知识',
  executive: '管理层/决策者，关注战略和ROI',
  youth: '年轻用户（18-30岁），追求新鲜有趣',
  consumer: '消费者/客户，关注产品价值和使用体验',
};

/**
 * 构建系统提示词
 */
export function buildSystemPrompt(config: ContentGenConfig): string {
  return `你是一位资深的微信公众号内容专家，擅长为不同行业创作高质量的公众号文章。

## 你的角色
- 行业：${config.industry.name}（${config.industry.description}）
- 行业关键词：${config.industry.keywords.join('、')}
- 内容类型：${config.contentType.name}（${config.contentType.description}）
- AI 写作重点：${config.contentType.aiFocus}

## 写作要求
1. 输出纯 HTML 格式，可直接粘贴到微信公众号编辑器
2. 使用内联样式（微信不支持外部CSS）
3. 图片位置用 <!-- IMG:描述 --> 占位标注
4. 颜色方案参考：主色 ${config.industry.color}
5. 排版风格：${config.layout.description}

## 格式规范
- 标题层级：h2 用于大标题，h3 用于小节标题
- 段落间距：margin-bottom: 16px
- 重点文字：使用 <strong> 标签
- 引用块：使用带左边框的 blockquote
- 列表：使用 ul/ol，带自定义样式`;
}

/**
 * 构建用户提示词（结构化模式）
 */
export function buildStructuredUserPrompt(config: ContentGenConfig): string {
  const parts: string[] = [];

  // 主题
  if (config.topic) {
    parts.push(`【文章主题】${config.topic}`);
  }

  // 关键词
  if (config.keywords && config.keywords.length > 0) {
    parts.push(`【关键词】${config.keywords.join('、')}`);
  }

  // 语气
  if (config.tone) {
    parts.push(`【写作风格】${TONE_MAP[config.tone] || config.tone}`);
  }

  // 篇幅
  if (config.length) {
    parts.push(`【目标字数】${LENGTH_MAP[config.length]}`);
  }

  // 受众
  if (config.audience) {
    parts.push(`【目标受众】${AUDIENCE_MAP[config.audience] || config.audience}`);
  }

  // 附加元素
  if (config.extras) {
    const extrasList: string[] = [];
    if (config.extras.dataChart) extrasList.push('包含数据图表区域');
    if (config.extras.ctaButton) extrasList.push('包含行动号召按钮');
    if (config.extras.quoteCard) extrasList.push('包含引言卡片');
    if (config.extras.heroImage) extrasList.push('包含首图/Banner 区域');
    if (config.extras.footerGuide) extrasList.push('包含文末引导关注');
    if (config.extras.authorSignature) extrasList.push('包含作者署名');
    if (extrasList.length > 0) {
      parts.push(`【附加元素】${extrasList.join('；')}`);
    }
  }

  // 补充说明
  if (config.prompt) {
    parts.push(`【补充说明】${config.prompt}`);
  }

  // 排版布局
  parts.push(`\n【排版布局】请使用「${config.layout.name}」布局风格：${config.layout.description}`);

  return parts.join('\n');
}

/**
 * 构建自由模式用户提示词
 */
export function buildFreeformUserPrompt(config: ContentGenConfig): string {
  return `请为「${config.industry.name}」行业创作一篇「${config.contentType.name}」类型的公众号文章。

用户需求描述：
${config.prompt || '请根据行业特点和内容类型，创作一篇高质量的公众号文章。'}

排版布局：请使用「${config.layout.name}」布局风格（${config.layout.description}）`;
}

/** 从模板中提取占位符变量 */
function extractTemplatePlaceholders(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

/**
 * 构建布局模板 prompt
 * 当有 htmlTemplate 时，把完整模板和占位符列表发给 AI，让它填充
 */
export function buildLayoutPrompt(config: ContentGenConfig): string | null {
  if (!config.layout?.htmlTemplate) return null

  const template = config.layout.htmlTemplate
  const placeholders = extractTemplatePlaceholders(template)

  return `
## 参考排版模板（请严格基于此模板结构生成内容）

以下是「${config.layout.name}」布局的 HTML 模板，你需要用真实内容替换所有 {{xxx}} 占位符。
保持模板的所有内联样式和 HTML 结构不变，只替换占位符内容。

模板代码：
\`\`\`html
${template}
\`\`\`

需要填充的占位符：${placeholders.map(p => `{{${p}}}`).join('、')}

### 填充规则
- **图片占位符**（如 {{heroImage}}、{{image1}}）：用 <!-- IMG:图片描述 --> 标签替换，保留 style 属性
- **标题占位符**（如 {{title}}、{{subtitle}}）：根据文章主题生成精炼标题
- **正文占位符**（如 {{bodyContent}}、{{section1Body}}）：填充实际文章内容，保持段落结构
- **首字占位符**（如 {{firstChar}}）：取正文第一个字
- **颜色占位符**（如 {{themeColor}}）：用行业主色 ${config.industry.color} 替换
- 严禁保留任何 {{xxx}} 原样输出
- 所有内容直接输出到模板对应位置，不要额外包裹`
}

/** 完整构建 prompt */
export function buildContentGenPrompt(config: ContentGenConfig, searchContext?: string): {
  system: string;
  user: string;
} {
  const layoutPrompt = buildLayoutPrompt(config)

  const parts: string[] = [
    config.mode === 'structured'
      ? buildStructuredUserPrompt(config)
      : buildFreeformUserPrompt(config),
  ]

  if (searchContext) {
    parts.push(`## 联网搜索参考信息\n以下是与主题相关的最新网络资料，请参考这些信息来丰富文章内容，确保数据和事实的时效性。引用时请注明信息来源。\n\n${searchContext}`)
  }

  if (layoutPrompt) {
    parts.push(layoutPrompt)
  }

  return {
    system: buildSystemPrompt(config),
    user: parts.join('\n\n'),
  }
}
