import type { Theme } from '@/themes/types'
import { themes, getThemeById } from '@/themes/presets'

export async function resolveTheme(themeId: string): Promise<Theme> {
  const preset = themes.find((t) => t.id === themeId)
  if (preset) return preset

  try {
    const customList = await window.api?.customThemeList?.()
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
  } catch {}

  return themes[0]
}
