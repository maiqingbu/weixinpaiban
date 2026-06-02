import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Editor, { type OnMount, type BeforeMount, loader } from '@monaco-editor/react'
import { Save, X, Download, Upload, Copy, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { themes, getThemeById } from '@/themes/presets'
import { themeToCss } from '@/themes/themeToCss'
import { PreviewRenderer } from '@/themes/PreviewRenderer'
import type { Theme } from '@/themes/types'


interface CustomTheme {
  id: string
  name: string
  css: string
  base_theme_id: string | null
}

interface CustomThemeEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Configure Monaco — use window.location.href to resolve the base path
// This works in both dev (http://localhost:5173) and Electron production (file:///...)
const monacoBase = window.location.href.substring(0, window.location.href.lastIndexOf('/'))
loader.config({ paths: { vs: `${monacoBase}/monaco/vs` } })

function CustomThemeEditor({ open, onOpenChange }: CustomThemeEditorProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [css, setCss] = useState('')
  const [baseThemeId, setBaseThemeId] = useState('original')
  const [themeId, setThemeId] = useState<string | null>(null) // null = new theme
  const [savedList, setSavedList] = useState<CustomTheme[]>([])
  const [previewKey, setPreviewKey] = useState(0) // force preview re-render
  const [confirmDialog, setConfirmDialog] = useState<{ pendingValue: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const monacoRef = useRef<any>(null)
  const originalCssRef = useRef<string>('') // tracks the base theme's original CSS to detect modifications
  const { toast } = useToast()
  const editorContent = useAppStore((s) => s.editorContent)

  const loadList = useCallback(async () => {
    if (!window.api) {
      console.error('[CustomThemeEditor] window.api is undefined')
      toast({ title: 'API 不可用', variant: 'destructive' })
      return
    }
    if (!window.api.customThemeList) {
      console.error('[CustomThemeEditor] window.api.customThemeList is undefined')
      toast({ title: 'customThemeList 不可用', variant: 'destructive' })
      return
    }
    try {
      const list = await window.api.customThemeList()
      setSavedList(list || [])
    } catch (e) {
      console.error('[CustomThemeEditor] loadList error:', e)
      toast({ title: '加载主题列表失败', variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    if (open) loadList()
  }, [open, loadList])
  useEffect(() => {
    const handler = () => loadList()
    window.addEventListener('refresh-theme-list', handler)
    return () => window.removeEventListener('refresh-theme-list', handler)
  }, [loadList])

  const handleNew = useCallback((baseId?: string) => {
    const base = baseId || 'original'
    const baseTheme = getThemeById(base)
    const generatedCss = themeToCss(baseTheme)
    setThemeId(null)
    setName('我的主题')
    setCss(generatedCss)
    setBaseThemeId(base)
    originalCssRef.current = generatedCss
  }, [])

  const handleEdit = useCallback((theme: CustomTheme) => {
    const base = theme.base_theme_id || 'original'
    const baseTheme = getThemeById(base)
    const baseCss = themeToCss(baseTheme)
    setThemeId(theme.id)
    setName(theme.name)
    setCss(theme.css)
    setBaseThemeId(base)
    originalCssRef.current = baseCss
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim() || !css.trim()) return
    if (!window.api) {
      toast({ title: 'API 不可用', variant: 'destructive' })
      return
    }
    const id = themeId || `custom-${Date.now()}`
    try {
      if (themeId) {
        await window.api.customThemeUpdate(id, name.trim(), css.trim())
      } else {
        await window.api.customThemeCreate(id, name.trim(), css.trim(), baseThemeId)
        setThemeId(id)
      }
      toast({ title: '主题已保存' })
      loadList()
    } catch (e) {
      console.error('[CustomThemeEditor] save error:', e)
      toast({ title: `保存失败: ${e instanceof Error ? e.message : '未知错误'}`, variant: 'destructive' })
    }
  }, [name, css, themeId, baseThemeId, loadList, toast])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await window.api?.customThemeDelete?.(id)
      const currentId = useAppStore.getState().currentThemeId
      if (currentId === id) {
        useAppStore.getState().setCurrentThemeId('original')
      }
      if (themeId === id) {
        setThemeId(null)
        handleNew()
      }
      toast({ title: '已删除' })
      loadList()
    } catch (e) {
      toast({ title: `删除失败: ${e instanceof Error ? e.message : ''}`, variant: 'destructive' })
    }
  }, [themeId, loadList, toast])

  const handleDuplicate = useCallback(async (source: CustomTheme) => {
    const newName = `${source.name} (副本)`
    await window.api?.customThemeDuplicate?.(source.id, newName)
    toast({ title: '已复制' })
    loadList()
  }, [loadList, toast])

  const handleExport = useCallback((theme: CustomTheme) => {
    const data = JSON.stringify({ name: theme.name, css: theme.css, base_theme_id: theme.base_theme_id }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${theme.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.name && data.css) {
          const id = `custom-${Date.now()}`
          if (!window.api?.customThemeCreate) {
            toast({ title: 'API 不可用 (customThemeCreate)', variant: 'destructive' })
            return
          }
          await window.api.customThemeCreate(id, data.name, data.css, data.base_theme_id || null)
          toast({ title: '已导入' })
          loadList()
        } else {
          toast({ title: '文件格式不正确', variant: 'destructive' })
        }
      } catch (e) {
        console.error('[CustomThemeEditor] import error:', e)
        toast({ title: `导入失败: ${e instanceof Error ? e.message : '未知错误'}`, variant: 'destructive' })
      }
    }
    input.click()
  }, [loadList, toast])

  const handleApply = useCallback((theme: CustomTheme) => {
    // Create a Theme object from custom CSS and apply it
    // 用自定义主题自己的 base_theme_id 派生 styles，而不是强制 'original'，
    // 否则基于"本草纲目"等模板创建的自定义主题应用后会变成 original 样式。
    const baseId = theme.base_theme_id || 'original'
    const baseTheme = getThemeById(baseId) ?? getThemeById('original')
    const customTheme: Theme = {
      id: theme.id,
      name: theme.name,
      description: '自定义主题',
      styles: baseTheme.styles,
      customCss: theme.css,
    }
    useAppStore.getState().setCurrentThemeId(theme.id)
    // Store custom theme in a way PreviewPane can find it
    ;(window as any).__customTheme = customTheme
    // 显式通知 PreviewPane 重新拉一次列表，避免 race：customThemes state 还没刷新时
    // 主题查找会回退到 (window as any).__customTheme，导致应用的是上一个 custom theme。
    if (typeof (window as any).__refreshThemeList === 'function') {
      try {
        (window as any).__refreshThemeList()
      } catch (err) {
        console.warn('[CustomThemeEditor] refreshThemeList failed:', err)
      }
    }
    onOpenChange(false)
    toast({ title: '已应用主题' })
  }, [toast])

  const handleMonacoMount: OnMount = (editor) => {
    monacoRef.current = editor
  }

  const handleBeforeMount: BeforeMount = (_monaco) => {
    // Configure Monaco workers — same base path as loader.config
    const workerBase = `${window.location.href.substring(0, window.location.href.lastIndexOf('/'))}/monaco/vs/assets`
    ;(self as any).MonacoEnvironment = {
      getWorker(_moduleId: string, label: string) {
        switch (label) {
          case 'json':
            return new Worker(`${workerBase}/json.worker-DKiEKt88.js`)
          case 'css':
          case 'scss':
          case 'less':
            return new Worker(`${workerBase}/css.worker-HnVq6Ewq.js`)
          case 'html':
          case 'handlebars':
          case 'razor':
            return new Worker(`${workerBase}/html.worker-B51mlPHg.js`)
          case 'typescript':
          case 'javascript':
            return new Worker(`${workerBase}/ts.worker-CMbG-7ft.js`)
          default:
            return new Worker(`${workerBase}/editor.worker-Be8ye1pW.js`)
        }
      },
    }
  }

  const handleCssChange = useCallback((value: string | undefined) => {
    const newCss = value || ''
    setCss(newCss)
    // Debounced preview update
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPreviewKey((k) => k + 1)
    }, 500)
  }, [])

  const applyBaseTheme = useCallback((themeId: string) => {
    const baseTheme = getThemeById(themeId)
    const generatedCss = themeToCss(baseTheme)
    setBaseThemeId(themeId)
    setCss(generatedCss)
    originalCssRef.current = generatedCss
  }, [])

  // Build preview theme
  const previewTheme = useMemo((): Theme => {
    return {
      id: themeId || 'custom-preview',
      name: name || '预览',
      description: '',
      styles: getThemeById(baseThemeId).styles,
      customCss: css,
    }
  }, [themeId, name, css, baseThemeId])

  if (!open) return <></>

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Left: theme list sidebar */}
      <div className="w-56 border-r border-border flex flex-col bg-muted/30">
        <div className="p-3 border-b border-border">
          <div className="text-sm font-semibold mb-2">我的主题</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleNew()}>
              <Plus className="h-3 w-3" /> 新建
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleImport}>
              <Upload className="h-3 w-3" /> 导入
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedList.map((theme) => (
            <div
              key={theme.id}
              className={`group rounded-md p-2 cursor-pointer hover:bg-accent/50 transition-colors text-sm ${themeId === theme.id ? 'bg-accent' : ''}`}
              onClick={() => handleEdit(theme)}
            >
              <div className="font-medium truncate">{theme.name}</div>
              <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent cursor-pointer" onClick={(e) => { e.stopPropagation(); handleApply(theme) }} title="应用">
                  <Copy className="h-3 w-3" />
                </button>
                <button type="button" className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDuplicate(theme) }} title="复制">
                  <Copy className="h-3 w-3" />
                </button>
                <button type="button" className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent cursor-pointer" onClick={(e) => { e.stopPropagation(); handleExport(theme) }} title="导出">
                  <Download className="h-3 w-3" />
                </button>
                <button type="button" className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/20 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(theme.id) }} title="删除">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {savedList.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">暂无自定义主题</div>
          )}
        </div>
      </div>

      {/* Center: Monaco editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <input
              className="h-8 w-40 rounded-md border border-input bg-background px-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="主题名称"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">基于模板</span>
            <Select value={baseThemeId} onValueChange={(v) => {
              // Check if CSS has been modified from the base theme's original
              const isModified = css !== originalCssRef.current
              if (isModified) {
                setConfirmDialog({ pendingValue: v })
                return
              }
              applyBaseTheme(v)
            }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="基于" />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1" onClick={handleSave} disabled={!name.trim() || !css.trim()}>
              <Save className="h-4 w-4" /> 保存
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            language="css"
            theme="vs-light"
            value={css}
            onChange={handleCssChange}
            beforeMount={handleBeforeMount}
            onMount={handleMonacoMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>

      {/* Right: Live preview */}
      <div className="w-[40%] border-l border-border flex flex-col">
        <div className="p-3 border-b border-border text-sm font-medium text-muted-foreground">
          实时预览
        </div>
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <div style={{ maxWidth: '375px', margin: '0 auto' }}>
            <div className="p-5 bg-white">
              <PreviewRenderer key={previewKey} html={editorContent || '<p>开始写作…</p>'} theme={previewTheme} />
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialog when switching base template with unsaved CSS changes */}
      <Dialog open={confirmDialog !== null} onOpenChange={(open) => { if (!open) setConfirmDialog(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>切换模板</DialogTitle>
            <DialogDescription>切换模板会覆盖你已经修改的 CSS，确定吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>取消</Button>
            <Button onClick={() => {
              if (confirmDialog) {
                applyBaseTheme(confirmDialog.pendingValue)
                setConfirmDialog(null)
              }
            }}>覆盖</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { CustomThemeEditor }
