import { useMemo, useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ThemeProvider } from '@/themes/ThemeProvider'
import { PreviewRenderer } from '@/themes/PreviewRenderer'
import { themes, getThemeById } from '@/themes/presets'
import { CustomThemeEditor } from '@/components/CustomThemeEditor'
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
                      src={t.previewImage}
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
  const displayContent = activeEditor === 'advanced' ? advancedEditorContent : editorContent

  // Scaled preview state
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [scaledHeight, setScaledHeight] = useState(0)
  const [offsetLeft, setOffsetLeft] = useState(0)

  const isEmpty =
    !displayContent ||
    displayContent === '<p></p>' ||
    displayContent === '<p><br></p>'

  // Measure and update scale on container resize & content change
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || isEmpty) return

    let raf = 0
    let debounceTimer = 0
    const update = () => {
      const cw = container.clientWidth
      const newScale = Math.max(MIN_SCALE, Math.min(cw / CONTENT_WIDTH, 1))
      setScale(newScale)
      setScaledHeight((content?.scrollHeight || 0) * newScale)
      const scaledW = CONTENT_WIDTH * newScale
      setOffsetLeft(Math.max(0, (cw - scaledW) / 2))
    }

    const debouncedUpdate = () => {
      cancelAnimationFrame(raf)
      clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        raf = requestAnimationFrame(update)
      }, 80)
    }

    const images = content ? Array.from(content.querySelectorAll('img')) : []
    let pendingImages = images.filter(img => !img.complete).length
    const onImageReady = () => {
      pendingImages--
      if (pendingImages <= 0) update()
    }
    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', onImageReady, { once: true })
        img.addEventListener('error', onImageReady, { once: true })
      }
    })

    if (pendingImages === 0) update()

    const ro = new ResizeObserver(() => debouncedUpdate())
    ro.observe(container)
    if (content) ro.observe(content)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      clearTimeout(debounceTimer)
      images.forEach(img => {
        img.removeEventListener('load', onImageReady)
        img.removeEventListener('error', onImageReady)
      })
    }
  }, [displayContent, isEmpty])

  const loadCustomThemes = useCallback(() => {
    window.api?.customThemeList?.().then((list) => {
      if (!list) return
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
  }, [])

  useEffect(() => {
    loadCustomThemes()
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
                <div dangerouslySetInnerHTML={{ __html: displayContent }} />
              ) : (
                <ThemeProvider themeId={currentThemeId}>
                  <PreviewRenderer html={displayContent} theme={theme} />
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
