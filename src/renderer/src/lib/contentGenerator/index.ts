export { ContentGeneratorPanel } from './ContentGeneratorPanel';
export { industries, getIndustry } from './industries';
export { contentTypes, getContentType } from './contentTypes';
export { allLayouts, getLayout, getLayoutsByCategory, getLayoutsForType } from './layouts';
export { generateContent, extractHtml, applyLayoutTemplate, extractAndApplyLayout } from './generator';
export { buildContentGenPrompt } from './promptBuilder';
export type { Industry, ContentType, LayoutDef, ContentGenConfig, GenMode } from './types';
export type { GenerateContentOptions, GenerateContentResult } from './generator';
