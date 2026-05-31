import type { LayoutDef, ContentTypeId } from '../types';
import { basicLayouts } from './basic';
import { boardLayouts } from './board';
import { posterLayouts } from './poster';
import { creativeLayouts } from './creative';
import { wechatLayouts } from './wechat';

/** 全部布局 */
export const allLayouts: LayoutDef[] = [
  ...wechatLayouts,
  ...basicLayouts,
  ...boardLayouts,
  ...posterLayouts,
  ...creativeLayouts,
];

/** 布局 Map */
const layoutMap = new Map(allLayouts.map(l => [l.id, l]));

/** 根据 ID 获取布局 */
export function getLayout(id: string): LayoutDef | undefined {
  return layoutMap.get(id);
}

/** 获取指定分类的布局 */
export function getLayoutsByCategory(category: LayoutDef['category']): LayoutDef[] {
  return allLayouts.filter(l => l.category === category);
}

/** 获取指定内容类型适用的布局 */
export function getLayoutsForType(typeId: ContentTypeId): LayoutDef[] {
  return allLayouts.filter(l => l.applicableTypes.includes(typeId));
}

export { wechatLayouts, basicLayouts, boardLayouts, posterLayouts, creativeLayouts };
