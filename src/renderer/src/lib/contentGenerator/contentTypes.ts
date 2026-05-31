import type { ContentType, ContentTypeId } from './types';

export const contentTypes: ContentType[] = [
  {
    id: 'productLaunch',
    name: '产品发布',
    icon: 'Package',
    description: '新品上市/功能更新',
    aiFocus: '卖点提炼、功能对比、场景化描述、用户痛点→解决方案',
    recommendedLayouts: ['wechat-standard', 'basic-hero', 'basic-feature-grid', 'poster-product', 'basic-cta'],
  },
  {
    id: 'dataReport',
    name: '数据报告',
    icon: 'BarChart3',
    description: '行业报告/财报/白皮书',
    aiFocus: '数据可视化、趋势分析、关键结论、行业洞察',
    recommendedLayouts: ['wechat-standard', 'basic-data-dashboard', 'poster-data', 'basic-magazine', 'basic-timeline'],
  },
  {
    id: 'activityPromo',
    name: '活动推广',
    icon: 'Megaphone',
    description: '促销/线下活动/直播',
    aiFocus: '紧迫感、利益点、行动号召、参与方式、时间地点',
    recommendedLayouts: ['wechat-standard', 'basic-cta', 'poster-activity', 'basic-hero', 'poster-product'],
  },
  {
    id: 'newsReport',
    name: '新闻资讯',
    icon: 'Newspaper',
    description: '行业动态/公司新闻',
    aiFocus: '5W1H 原则、时效性、客观陈述、背景补充、影响分析',
    recommendedLayouts: ['wechat-standard', 'basic-hero', 'basic-magazine', 'board-multi-headline', 'basic-timeline'],
  },
  {
    id: 'deepFeature',
    name: '深度专题',
    icon: 'BookOpen',
    description: '长篇报道/深度分析',
    aiFocus: '多角度分析、权威引用、逻辑结构、数据支撑、专家观点',
    recommendedLayouts: ['wechat-standard', 'basic-magazine', 'basic-quote-flow', 'basic-timeline', 'creative-info-long'],
  },
  {
    id: 'brandStory',
    name: '品牌故事',
    icon: 'Heart',
    description: '创始人故事/品牌理念',
    aiFocus: '情感共鸣、叙事弧线、价值观传递、人物塑造、品牌温度',
    recommendedLayouts: ['wechat-standard', 'basic-hero', 'basic-quote-flow', 'basic-magazine', 'creative-journal'],
  },
  {
    id: 'boardReport',
    name: '板报墙报',
    icon: 'LayoutDashboard',
    description: '企业内刊/团队风采',
    aiFocus: '多区块信息、图文混排、信息密度高、公告与动态结合',
    recommendedLayouts: ['wechat-standard', 'board-multi-headline', 'board-photo-wall', 'board-kanban', 'board-festival'],
  },
  {
    id: 'posterDesign',
    name: '海报设计',
    icon: 'Image',
    description: '活动海报/节日海报',
    aiFocus: '视觉冲击、信息层次、行动引导、品牌一致性、适配尺寸',
    recommendedLayouts: ['wechat-standard', 'poster-activity', 'poster-product', 'poster-data', 'poster-people'],
  },
  {
    id: 'tutorial',
    name: '教程攻略',
    icon: 'ListChecks',
    description: '操作指南/使用教程',
    aiFocus: '步骤清晰、配图说明、常见问题、注意事项、进阶技巧',
    recommendedLayouts: ['wechat-standard', 'basic-steps', 'creative-info-long', 'basic-hero', 'creative-dialogue'],
  },
  {
    id: 'interview',
    name: '访谈对话',
    icon: 'MessageCircle',
    description: '人物专访/Q&A',
    aiFocus: '对话感、人格化表达、金句提炼、人物背景、深度追问',
    recommendedLayouts: ['wechat-standard', 'basic-quote-flow', 'poster-people', 'creative-dialogue', 'basic-magazine'],
  },
  {
    id: 'festival',
    name: '节日特辑',
    icon: 'PartyPopper',
    description: '节日营销/热点借势',
    aiFocus: '节日氛围、品牌结合、祝福语、活动预告、文化内涵',
    recommendedLayouts: ['wechat-standard', 'board-festival', 'poster-activity', 'basic-cta', 'creative-journal'],
  },
  {
    id: 'yearReview',
    name: '年终盘点',
    icon: 'CalendarDays',
    description: '年度总结/里程碑',
    aiFocus: '数据回顾、成就展示、里程碑节点、团队故事、未来展望',
    recommendedLayouts: ['wechat-standard', 'basic-timeline', 'basic-data-dashboard', 'board-kanban', 'poster-data'],
  },
];

/** 根据 ID 获取内容类型 */
export function getContentType(id: ContentTypeId): ContentType | undefined {
  return contentTypes.find(t => t.id === id);
}

/** 获取推荐布局 ID 列表 */
export function getRecommendedLayouts(typeId: ContentTypeId): string[] {
  return getContentType(typeId)?.recommendedLayouts ?? [];
}
