import type { Theme } from '@/themes/types'
import { themes, getThemeById } from '@/themes/presets'

export async function resolveTheme(themeId: string): Promise<Theme> {
  const preset = themes.find((t) => t.id === themeId)
  if (preset) return preset

  try {
    const api = window.api
    if (api && typeof api.customThemeList === 'function') {
      const customList = await api.customThemeList()
      if (customList) {
        const ct = customList.find((c) => c.id === themeId)
        if (ct) {
          const originalTheme = getThemeById('original')!
          return {
            id: ct.id,
            name: ct.name,
            description: '自定义主题',
            styles: originalTheme.styles,
            customCss: ct.css,
          }
        }
      }
    }
  } catch (err) {
    // 之前是空 catch（完全静默），custom_themes 加载失败时用户看到
    // "自定义主题没了" 但没有任何线索。改成 console.warn。
    console.warn('[resolveTheme] Failed to load custom theme list:', err)
  }

  return themes[0]
}
