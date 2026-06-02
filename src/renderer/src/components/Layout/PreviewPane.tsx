import { useMemo, useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ThemeProvider } from '@/themes/ThemeProvider'
import { PreviewRenderer } from '@/themes/PreviewRenderer'
import { themes, getThemeById } from '@/themes/presets'
import { CustomThemeEditor } from '@/components/CustomThemeEditor'
import { resolveAssetPath } from '@/lib/asset'
import type { Theme } from '@/themes/types'

/** 公众号文章实际渲染宽度 */
const CONTENT_WIDTH = 750

/** 最低缩放比例（窄面板时保底） */
const MIN_SCALE = 0.4

function ThemeSelector({
  value,
  onChange,
  customThemes,
  disabled,
}: {
  value: string
  onChange: (id: string) => void
  customThemes: Theme[]
  disabled?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentTheme = useMemo(
    () =>
      customThemes.find((t) => t.id === value) ??
      themes.find((t) => t.id === value) ??
      themes[0],
    [value, customThemes]
  )

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        className={`flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-accent cursor-pointer'
        }`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        {currentTheme.previewImage && (
          <img
            src={currentTheme.previewImage}
            alt=""
            className="h-4 w-4 rounded-sm object-cover"
          />
        )}
        <span className="max-w-[80px] truncate">{currentTheme.name}</span>
        <svg className="h-3 w-3 shrink-0 text-muted-foreground" viewBox="0 0 12 12" fill="none">
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && !disabled && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[260px] rounded-lg border border-border bg-popover shadow-lg">
          <div className="max-h-[360px] overflow-y-auto p-1.5">
            {/* Built-in themes */}
            <div className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              预设主题
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    t.id === value
                      ? 'bg-accent text-accent-foreground ring-1 ring-primary/20'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => {
                    onChange(t.id)
                    setOpen(false)
                  }}
                >
                  {t.previewImage ? (
                    <img
                      src={resolveAssetPath(t.previewImage)}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                      {t.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {t.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom themes */}
            {customThemes.length > 0 && (
              <>
                <div className="mb-1 mt-3 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  自定义主题
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {customThemes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        t.id === value
                          ? 'bg-accent text-accent-foreground ring-1 ring-primary/20'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => {
                        onChange(t.id)
                        setOpen(false)
                      }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 text-[10px] font-bold">
                        {t.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          自定义
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Divider + new custom theme */}
            <div className="my-1.5 border-t border-border" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-purple-600 hover:bg-accent/50 cursor-pointer"
              onClick={() => {
                onChange('__new__')
                setOpen(false)
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-purple-300 text-sm">
                +
              </span>
              <span className="font-medium">新建自定义主题</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewPane(): React.JSX.Element {
  const editorContent = useAppStore((s) => s.editorContent)
  const advancedEditorContent = useAppStore((s) => s.advancedEditorContent)
  const activeEditor = useAppStore((s) => s.activeEditor)
  const currentThemeId = useAppStore((s) => s.currentThemeId)
  const setCurrentThemeId = useAppStore((s) => s.setCurrentThemeId)
  const [customThemes, setCustomThemes] = useState<Theme[]>([])
  const [editorOpen, setEditorOpen] = useState(false)

  // 根据当前激活的编辑器决定显示内容
  const rawContent = activeEditor === 'advanced' ? advancedEditorContent : editorContent

  // Scaled preview state
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [scaledHeight, setScaledHeight] = useState(0)
  const [offsetLeft, setOffsetLeft] = useState(0)

  const placeholderDiv = (text: string): string =>
    `<div style="display:flex;align-items:center;justify-content:center;height:180px;background:#f3f4f6;border:2px dashed #d1d5db;border-radius:8px;margin:16px 0;box-sizing:border-box;max-width:100%;"><span style="font-size:14px;color:#9ca3af;text-align:center;padding:0 24px;">🖼 ${text}</span></div>`

  // 替换占位符为稳定元素，防止预览跳动：
  // 1. <!-- IMG:xxx --> 注释占位符
  // 2. via.placeholder.com / placehold.co 外部占位图片（国内不可达）
  // 3. 所有 <img> 添加 onerror 兜底处理
  const safeContent = useMemo(() => {
    let html = rawContent

    html = html.replace(
      /<!--\s*IMG:\s*(.*?)\s*-->/g,
      (_m, desc: string) => placeholderDiv(desc.trim() || '配图占位')
    )

    html = html.replace(
      /<img\b[^>]*\bsrc\s*=\s*"(https?:\/\/(?:via\.placeholder\.com|placehold\.co)[^"]*)"[^>]*>/gi,
      (_m, src: string) => {
        const text = decodeURIComponent(src.match(/text=([^&]*)/)?.[1] || '占位图片')
        return placeholderDiv(text)
      }
    )

    return html
  }, [rawContent])

  // 用事件代理替代字符串拼接的 onerror：捕获所有图片加载失败并替换为占位 div
  // 避免恶意用户通过 <img src="x"foo"> 等畸形 HTML 逃逸 onerror 属性
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    const handler = (e: Event): void => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'IMG') {
        const img = target as HTMLImageElement
        // 用 placeholder div 替换失败的图片
        const div = document.createElement('div')
        div.style.cssText =
          'display:flex;align-items:center;justify-content:center;height:180px;background:#f3f4f6;border:2px dashed #d1d5db;border-radius:8px;margin:16px 0;box-sizing:border-box;max-width:100%;'
        div.innerHTML =
          '<span style="font-size:14px;color:#9ca3af;text-align:center;padding:0 24px">🖼 图片加载失败</span>'
        img.replaceWith(div)
      }
    }
    // 用 capture 阶段捕获，error 事件不会冒泡
    root.addEventListener('error', handler, true)
    return () => {
      root.removeEventListener('error', handler, true)
    }
  }, [safeContent])

  const isEmpty =
    !safeContent ||
    safeContent === '<p></p>' ||
    safeContent === '<p><br></p>'

  // Measure and update scale on container resize & content change
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || isEmpty) return

    const update = () => {
      const cw = container.clientWidth
      const newScale = Math.max(MIN_SCALE, Math.min(cw / CONTENT_WIDTH, 1))
      setScale(newScale)
      setScaledHeight((content?.scrollHeight || 0) * newScale)
      const scaledW = CONTENT_WIDTH * newScale
      setOffsetLeft(Math.max(0, (cw - scaledW) / 2))
    }

    update()

    let debounceTimer = 0
    const ro = new ResizeObserver(() => {
      clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(update, 100)
    })
    ro.observe(container)
    if (content) ro.observe(content)

    return () => {
      ro.disconnect()
      clearTimeout(debounceTimer)
    }
  }, [safeContent, isEmpty])

  const loadCustomThemes = useCallback(() => {
    const api = window.api
    if (!api || typeof api.customThemeList !== 'function') {
      // 没有 customThemeList IPC（极旧 preload 兼容）：直接当作空
      setCustomThemes([])
      return
    }
    // 用 promise chain 而非 async/await，让 catch 能吞掉 unhandled rejection
    api
      .customThemeList()
      .then((list) => {
        if (!list) {
          setCustomThemes([])
          return
        }
        const originalTheme = getThemeById('original')
        const mapped = list.map((ct) => ({
          id: ct.id,
          name: ct.name,
          description: '自定义主题',
          styles: originalTheme.styles,
          customCss: ct.css,
        }))
        setCustomThemes(mapped)
      })
      .catch((err) => {
        // 之前是 silent fail，custom_themes 加载失败时直接清空，
        // 用户看到"自定义主题没了"但没有任何线索。改成 console.warn + 保留旧值。
        console.warn('[PreviewPane] Failed to load custom themes:', err)
      })
  }, [])

  useEffect(() => {
    loadCustomThemes()
  }, [loadCustomThemes])

  // 把 loadCustomThemes 暴露到 window 上，让 CustomThemeEditor 在 apply/delete/save 时
  // 主动触发 PreviewPane 刷新 customThemes state（避免 race condition：
  // setCurrentThemeId 触发 theme 重算时 customThemes 还没更新）
  useEffect(() => {
    ;(window as any).__refreshThemeList = loadCustomThemes
    return () => {
      if ((window as any).__refreshThemeList === loadCustomThemes) {
        ;(window as any).__refreshThemeList = undefined
      }
    }
  }, [loadCustomThemes])

  useEffect(() => {
    if (!editorOpen) loadCustomThemes()
  }, [editorOpen, loadCustomThemes])

  const theme = useMemo(() => {
    const custom = customThemes.find((t) => t.id === currentThemeId)
    if (custom) return custom
    const globalTheme = (window as any).__customTheme
    if (globalTheme && globalTheme.id === currentThemeId) return globalTheme as Theme
    return themes.find((t) => t.id === currentThemeId) ?? themes[0]
  }, [currentThemeId, customThemes])

  useEffect(() => {
    if (theme) useAppStore.getState().setCurrentTheme(theme)
  }, [theme])

  return (
    <div className="flex h-full min-w-[280px] flex-col bg-muted/50">
      {/* Header with theme selector */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <h2 className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          预览
          {activeEditor === 'advanced' && (
            <span className="ml-2 text-[10px] text-muted-foreground">(高级编辑器)</span>
          )}
        </h2>
        <ThemeSelector
          value={currentThemeId}
          customThemes={customThemes}
          disabled={activeEditor === 'advanced'}
          onChange={(v) => {
            if (v === '__new__') {
              setEditorOpen(true)
              return
            }
            setCurrentThemeId(v)
          }}
        />
      </div>

      {/* Preview area — empty state */}
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
            {activeEditor === 'advanced'
              ? '在高级编辑器中编辑内容，预览会同步显示'
              : '在左侧编辑器开始写作，预览会同步显示'}
          </div>
        </div>
      ) : (
        /* Preview area — scaled rendering */
        <div
          ref={containerRef}
          className="min-h-0 flex-1 overflow-y-scroll p-4"
        >
          <div
            style={{
              height: scaledHeight > 0 ? scaledHeight : '100%',
              position: 'relative',
            }}
          >
            <div
              ref={contentRef}
              style={{
                width: CONTENT_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: offsetLeft,
                padding: '20px 24px',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {activeEditor === 'advanced' ? (
                <div dangerouslySetInnerHTML={{ __html: safeContent }} />
              ) : (
                <ThemeProvider themeId={currentThemeId}>
                  <PreviewRenderer html={safeContent} theme={theme} />
                </ThemeProvider>
              )}
            </div>
          </div>
        </div>
      )}

      <CustomThemeEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  )
}

export { PreviewPane }
