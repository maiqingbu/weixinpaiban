import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { themes } from '@/themes/presets'
import type { EditorApi } from '@/editor/ckApiAdapter'
import type { Theme } from '@/themes/types'

/** 编辑器实例类型：实际运行时是 EditorApi（CKEditor 适配层），
 *  部分旧组件仍按 TipTap Editor 使用。 */
type EditorInstance = EditorApi & Record<string, any>

const VALID_THEME_IDS = new Set(themes.map((t) => t.id))

interface Article {
  id: number
  title: string
  content: string
  advanced_content: string
  theme_id: string | null
  summary: string
  cover_image: string
  read_more_url: string
  read_more_text: string
  last_opened_at: number
  created_at: number
  updated_at: number
}

interface ConfiguredProvider {
  provider_id: string
}

export interface CustomMaterialItem {
  id: string
  name: string
  kind: string
  keywords: string[]
  thumbnail: string
  html: string
  group_id: string | null
  created_at: number
  updated_at: number
  use_count: number
}

export interface CustomMaterialGroupItem {
  id: string
  name: string
  sort_order: number
  created_at: number
}

export type EditorMode = 'richtext' | 'advanced'

interface AppState {
  articles: Article[]
  currentArticleId: number | null
  currentArticleTitle: string
  editorContent: string
  advancedEditorContent: string
  /** 当前激活的编辑器：'richtext' 或 'advanced' */
  activeEditor: EditorMode
  currentThemeId: string
  currentTheme: Theme | null
  editorInstance: EditorInstance | null
  configuredProviders: ConfiguredProvider[]
  customMaterials: CustomMaterialItem[]
  customGroups: CustomMaterialGroupItem[]
  setArticles: (articles: Article[]) => void
  setCurrentArticleId: (id: number | null) => void
  setCurrentArticleTitle: (title: string) => void
  updateArticle: (id: number, fields: Partial<Article>) => void
  setEditorContent: (html: string) => void
  setAdvancedEditorContent: (html: string) => void
  setActiveEditor: (mode: EditorMode) => void
  setCurrentThemeId: (id: string) => void
  setCurrentTheme: (theme: Theme) => void
  setEditorInstance: (editor: EditorInstance | null) => void
  setConfiguredProviders: (providers: ConfiguredProvider[]) => void
  refreshCustomMaterials: () => Promise<void>
  saveCustomMaterial: (m: { id?: string; name: string; kind: string; keywords: string[]; thumbnail: string; html: string; group_id?: string | null }) => Promise<string>
  deleteCustomMaterial: (id: string) => Promise<void>
  incrementMaterialUse: (id: string) => void
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      articles: [],
      currentArticleId: null,
      currentArticleTitle: '',
      editorContent: '',
      advancedEditorContent: '',
      activeEditor: 'richtext' as EditorMode,
      currentThemeId: 'original',
      currentTheme: null,
      editorInstance: null,
      configuredProviders: [],
      customMaterials: [],
      customGroups: [],
      setArticles: (articles) => set({ articles }),
      setCurrentArticleId: (id) => set({ currentArticleId: id }),
      setCurrentArticleTitle: (title) =>
        set((state) => ({
          currentArticleTitle: title,
          articles: state.articles.map((a) =>
            a.id === state.currentArticleId ? { ...a, title } : a
          ),
        })),
      updateArticle: (id, fields) =>
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === id ? { ...a, ...fields } : a
          ),
        })),
      setEditorContent: (html) => set({ editorContent: html }),
      setAdvancedEditorContent: (html) => set({ advancedEditorContent: html }),
      setActiveEditor: (mode) => set({ activeEditor: mode }),
      setCurrentThemeId: (id) => set({ currentThemeId: id }),
      setCurrentTheme: (theme) => set({ currentTheme: theme }),
      setEditorInstance: (editor) => set({ editorInstance: editor }),
      setConfiguredProviders: (providers) => set({ configuredProviders: providers }),
      refreshCustomMaterials: async () => {
        try {
          const res = await window.api?.cmList()
          if (res) {
            const materials: CustomMaterialItem[] = res.materials.map((m: any) => ({
              ...m,
              keywords: JSON.parse(m.keywords || '[]'),
            }))
            const groups: CustomMaterialGroupItem[] = res.groups
            set({ customMaterials: materials, customGroups: groups })
          }
        } catch (err) {
          console.error('[custom-materials] Failed to load:', err)
        }
      },
      saveCustomMaterial: async (m) => {
        const res = await window.api?.cmSave(m)
        if (res) {
          // 刷新列表
          useAppStore.getState().refreshCustomMaterials()
          return res.id
        }
        return ''
      },
      deleteCustomMaterial: async (id) => {
        await window.api?.cmDelete(id)
        useAppStore.getState().refreshCustomMaterials()
      },
      incrementMaterialUse: (id) => {
        window.api?.cmIncrementUse(id)
        // 不需要立即刷新，下次打开面板时自然会刷新
      },
    }),
    {
      name: 'wx-typesetter-store',
      partialize: (state) => ({ currentThemeId: state.currentThemeId }),
      merge: (persisted, current) => {
        const p = persisted as Record<string, unknown>
        const merged = { ...current }
        if (p.currentThemeId !== undefined) merged.currentThemeId = p.currentThemeId as string
        if (merged.currentThemeId && !VALID_THEME_IDS.has(merged.currentThemeId) && !merged.currentThemeId.startsWith('custom-')) {
          merged.currentThemeId = 'original'
        }
        return merged
      },
    }
  )
)

export { useAppStore }
export type { Article, AppState }
