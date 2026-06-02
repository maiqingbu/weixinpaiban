// 内容生成系统类型定义

export type IndustryId =
  | 'tech' | 'finance' | 'medical' | 'education'
  | 'food' | 'travel' | 'ecommerce' | 'realestate'
  | 'auto' | 'baby' | 'fitness' | 'workplace'
  | 'legal' | 'culture' | 'beauty' | 'government';

export type ContentTypeId =
  | 'productLaunch' | 'dataReport' | 'activityPromo'
  | 'newsReport' | 'deepFeature' | 'brandStory'
  | 'boardReport' | 'posterDesign' | 'tutorial'
  | 'interview' | 'festival' | 'yearReview';

export type LayoutCategory = 'basic' | 'board' | 'poster' | 'creative';

export interface Industry {
  id: IndustryId;
  name: string;
  icon: string;           // lucide icon name
  color: string;          // 主色调 hex
  description: string;
  recommendedTypes: ContentTypeId[];  // 该行业推荐的内容类型
  recommendedLayouts: string[];       // 该行业推荐的布局 ID
  keywords: string[];                 // 行业关键词，用于 AI prompt
}

export interface ContentType {
  id: ContentTypeId;
  name: string;
  icon: string;
  description: string;
  aiFocus: string;        // AI 生成该类型时的重点
  recommendedLayouts: string[];  // 推荐的布局 ID
}

export interface LayoutDef {
  id: string;
  name: string;
  category: LayoutCategory;
  description: string;
  applicableTypes: ContentTypeId[];  // 适用的内容类型
  thumbnail: string;     // SVG 缩略图或 CSS class
  htmlTemplate: string;  // 完整 HTML 模板（含占位符）
  previewBg?: string;    // 预览背景色
}

export interface GeneratorConfig {
  industry: IndustryId;
  contentType: ContentTypeId;
  layoutId: string;
  topic: string;
  keywords: string[];
  tone: string;
  length: 'micro' | 'short' | 'medium' | 'long' | 'epic';
  audience: string;
  extras: {
    dataChart: boolean;
    infographic: boolean;
    ctaButton: boolean;
    quoteCard: boolean;
    heroImage: boolean;
    footerGuide: boolean;
    authorSignature: boolean;
    readMore: boolean;
    qrcode: boolean;
  };
}

export const TONE_OPTIONS = [
  { value: 'professional', label: '专业严谨' },
  { value: 'casual', label: '轻松活泼' },
  { value: 'storytelling', label: '故事叙事' },
  { value: 'data-driven', label: '数据驱动' },
  { value: 'emotional', label: '情感共鸣' },
  { value: 'authoritative', label: '权威发布' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'inspirational', label: '激励鼓舞' },
] as const;

export const LENGTH_OPTIONS = [
  { value: 'micro', label: '500字', description: '短消息/快讯' },
  { value: 'short', label: '800字', description: '快讯/简报' },
  { value: 'medium', label: '1500字', description: '标准文章' },
  { value: 'long', label: '3000字', description: '深度长文' },
  { value: 'epic', label: '5000字', description: '超长深度' },
] as const;

export const AUDIENCE_OPTIONS = [
  { value: 'general', label: '大众读者' },
  { value: 'professional', label: '行业从业者' },
  { value: 'executive', label: '管理层/决策者' },
  { value: 'youth', label: '年轻用户' },
  { value: 'consumer', label: '消费者/客户' },
] as const;

/** 生成模式 */
export type GenMode = 'structured' | 'freeform';

/** 内容生成配置 */
export interface ContentGenConfig {
  industry: Industry;
  contentType: ContentType;
  layout: LayoutDef;
  mode: GenMode;
  prompt: string;
  topic?: string;
  keywords?: string[];
  tone?: string;
  length?: 'micro' | 'short' | 'medium' | 'long' | 'epic';
  audience?: string;
  enableWebSearch?: boolean;
  extras?: {
    dataChart?: boolean;
    ctaButton?: boolean;
    quoteCard?: boolean;
    heroImage?: boolean;
    footerGuide?: boolean;
    authorSignature?: boolean;
  };
}
