import { useState, useEffect } from 'react'
import { ExternalLink, Loader2, Trash2, Check, ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { IMAGE_GEN_PROVIDERS, getImageGenProvider } from '@/lib/imageGen/providers'
import { useToast } from '@/hooks/use-toast'

interface CustomProvider {
  id: string
  name: string
  api_base: string
  default_model: string
  models_json: string
  docs_url: string
  description: string
}

function ImageSearchSettings(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // ── Image Gen State ──
  const [genStates, setGenStates] = useState<Record<string, { hasKey: boolean; saving: boolean }>>({})
  const [genKeys, setGenKeys] = useState<Record<string, string>>({})
  const [genModels, setGenModels] = useState<Record<string, string>>({})
  const [expandedGenId, setExpandedGenId] = useState<string | null>(null)

  // ── Custom Provider State ──
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [editingCustom, setEditingCustom] = useState<CustomProvider | null>(null)
  const [formName, setFormName] = useState('')
  const [formApiBase, setFormApiBase] = useState('')
  const [formDefaultModel, setFormDefaultModel] = useState('')
  const [formModels, setFormModels] = useState('')
  const [formDocsUrl, setFormDocsUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    loadKey()
    loadGenStates()
    loadCustomProviders()
  }, [])

  // ── Pexels ──

  const loadKey = async () => {
    try {
      const { apiKey } = await window.api.imageSearchGetPexelsKey()
      if (apiKey) {
        setApiKey(apiKey)
        setHasKey(true)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await window.api.imageSearchSetPexelsKey(apiKey.trim())
      setHasKey(true)
      toast({ title: 'Pexels 密钥已保存' })
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await window.api.imageSearchDeletePexelsKey()
      setApiKey('')
      setHasKey(false)
      toast({ title: '已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  // ── Image Gen ──

  const loadGenStates = async () => {
    const configured = await window.api.imageGenListConfigured().catch(() => [])

    // Load custom too for their model defaults
    const customs = await window.api.imageGenCustomList().catch(() => [])

    const states: Record<string, { hasKey: boolean; saving: boolean }> = {}
    const models: Record<string, string> = {}

    // Built-in
    for (const p of IMAGE_GEN_PROVIDERS) {
      const found = configured.find((c) => c.provider_id === p.id)
      states[p.id] = { hasKey: !!found, saving: false }
      models[p.id] = found?.model_id || p.models[0]?.id || ''
    }
    // Custom
    for (const cp of customs) {
      const found = configured.find((c) => c.provider_id === cp.id)
      states[cp.id] = { hasKey: !!found, saving: false }
      const cpModels: Array<{ id: string; name: string }> = JSON.parse(cp.models_json || '[]')
      models[cp.id] = found?.model_id || cpModels[0]?.id || ''
    }

    setGenStates(states)
    setGenModels(models)
  }

  const loadCustomProviders = async () => {
    try {
      setCustomProviders(await window.api.imageGenCustomList())
    } catch { /* ignore */ }
  }

  const handleGenSave = async (providerId: string) => {
    const key = genKeys[providerId]
    if (!key?.trim()) return
    setGenStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], saving: true } }))
    try {
      await window.api.imageGenSaveKey(providerId, key.trim(), genModels[providerId] || '')
      setGenKeys((prev) => ({ ...prev, [providerId]: '' }))
      await loadGenStates()
      toast({ title: '已保存' })
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setGenStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], saving: false } }))
    }
  }

  const handleGenDelete = async (providerId: string) => {
    await window.api.imageGenDeleteKey(providerId)
    setGenKeys((prev) => ({ ...prev, [providerId]: '' }))
    await loadGenStates()
    toast({ title: '已删除' })
  }

  // ── Custom Provider Form ──

  const resetCustomForm = () => {
    setShowCustomForm(false)
    setEditingCustom(null)
    setFormName('')
    setFormApiBase('')
    setFormDefaultModel('')
    setFormModels('')
    setFormDocsUrl('')
    setFormDescription('')
  }

  const handleEditCustom = (cp: CustomProvider) => {
    setEditingCustom(cp)
    setFormName(cp.name)
    setFormApiBase(cp.api_base)
    setFormDefaultModel(cp.default_model)
    const models: Array<{ id: string; name: string }> = JSON.parse(cp.models_json || '[]')
    setFormModels(models.map((m) => `${m.id}|${m.name}`).join('\n'))
    setFormDocsUrl(cp.docs_url)
    setFormDescription(cp.description)
    setShowCustomForm(true)
  }

  const parsedModels = (() => {
    return formModels.split('\n').filter(Boolean).map((line) => {
      const [id, name] = line.split('|').map((s) => s.trim())
      return { id: id || '', name: name || id || '' }
    }).filter((m) => m.id)
  })()

  const handleSaveCustom = async () => {
    if (!formName.trim() || !formApiBase.trim()) {
      toast({ title: '请填写名称和 API 地址', variant: 'destructive' })
      return
    }
    if (parsedModels.length === 0) {
      toast({ title: '请至少添加一个模型', variant: 'destructive' })
      return
    }
    try {
      await window.api.imageGenCustomSave({
        id: editingCustom?.id,
        name: formName.trim(),
        apiBase: formApiBase.trim().replace(/\/+$/, ''),
        defaultModel: formDefaultModel.trim() || parsedModels[0].id,
        models: parsedModels,
        docsUrl: formDocsUrl.trim(),
        description: formDescription.trim(),
      })
      toast({ title: editingCustom ? '已更新' : '已添加' })
      resetCustomForm()
      await loadCustomProviders()
      await loadGenStates()
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    }
  }

  const handleDeleteCustom = async (id: string) => {
    if (!confirm('确定删除此自定义服务商？关联的 API Key 也会被删除。')) return
    await window.api.imageGenCustomDelete(id)
    await loadCustomProviders()
    await loadGenStates()
    toast({ title: '已删除' })
  }

  // ── Resolve provider name ──

  const resolveGenName = (providerId: string): string => {
    const builtin = getImageGenProvider(providerId)
    if (builtin) return builtin.name
    const custom = customProviders.find((cp) => cp.id === providerId)
    return custom?.name || providerId
  }

  const resolveGenModels = (providerId: string): Array<{ id: string; name: string }> => {
    const builtin = getImageGenProvider(providerId)
    if (builtin) return builtin.models
    const custom = customProviders.find((cp) => cp.id === providerId)
    if (custom) return JSON.parse(custom.models_json || '[]')
    return []
  }

  const resolveGenApiBase = (providerId: string): string => {
    const builtin = getImageGenProvider(providerId)
    if (builtin) return builtin.apiBase
    const custom = customProviders.find((cp) => cp.id === providerId)
    return custom?.api_base || ''
  }

  const resolveGenDocsUrl = (providerId: string): string => {
    const builtin = getImageGenProvider(providerId)
    if (builtin) return builtin.docsUrl
    const custom = customProviders.find((cp) => cp.id === providerId)
    return custom?.docs_url || ''
  }

  const resolveGenDescription = (providerId: string): string => {
    const builtin = getImageGenProvider(providerId)
    if (builtin) return builtin.description
    const custom = customProviders.find((cp) => cp.id === providerId)
    return custom?.description || ''
  }

  // ── Collect all provider IDs to display ──

  const allProviderIds = [
    ...IMAGE_GEN_PROVIDERS.map((p) => p.id),
    ...customProviders.map((cp) => cp.id),
  ]

  // ── Render provider card ──

  const renderGenCard = (providerId: string, isCustom: boolean) => {
    const name = resolveGenName(providerId)
    const models = resolveGenModels(providerId)
    const apiBase = resolveGenApiBase(providerId)
    const docsUrl = resolveGenDocsUrl(providerId)
    const description = resolveGenDescription(providerId)

    const state = genStates[providerId] || { hasKey: false, saving: false }
    const inputKey = genKeys[providerId] || ''
    const model = genModels[providerId] || models[0]?.id || ''
    const isExpanded = expandedGenId === providerId

    return (
      <div key={providerId} className={`rounded-lg border overflow-hidden ${isCustom ? 'border-dashed border-primary/30' : 'border-border'}`}>
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => setExpandedGenId(isExpanded ? null : providerId)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{name}</span>
              {isCustom && (
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">自定义</span>
              )}
              {state.hasKey && (
                <span className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                  <Check className="h-2.5 w-2.5" />
                  已配置
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            {isCustom && <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">{apiBase}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isCustom && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); handleEditCustom(customProviders.find((cp) => cp.id === providerId)!) }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCustom(providerId) }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
            {docsUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); window.open(docsUrl, '_blank') }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">模型</label>
              <select
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={model}
                onChange={(e) => setGenModels((prev) => ({ ...prev, [providerId]: e.target.value }))}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API Key</label>
              <input
                type="password"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                placeholder={isCustom ? '输入 API Key' : '输入 API Key'}
                value={state.hasKey && !inputKey ? '••••••••' : inputKey}
                onChange={(e) => setGenKeys((prev) => ({ ...prev, [providerId]: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              {state.hasKey ? (
                <>
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-600" onClick={() => handleGenDelete(providerId)}>
                    <Trash2 className="h-3 w-3" /> 删除密钥
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">未配置</span>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={!inputKey || state.saving}
                    onClick={() => handleGenSave(providerId)}
                  >
                    {state.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    保存
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded" />

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">配图搜索</h2>

      {/* Pexels API */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <span className="inline-block h-4 w-1 rounded-full bg-green-500" />
            Pexels
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => window.open('https://www.pexels.com/api/', '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            文档
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Pexels 提供高质量免费图片，支持中文搜索，配图速度极快（无需加载网页）。
          注册即可免费获取密钥，每月 200 次请求。
          {!hasKey && ' 未配置时将使用百度/搜狗/360 搜索。'}
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-xs text-muted-foreground">密钥</label>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 text-sm flex-1"
              type="password"
              placeholder="输入 Pexels 密钥..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 gap-1 text-xs" disabled={saving || !apiKey.trim()} onClick={handleSave}>
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {hasKey ? '更新' : '保存'}
          </Button>
          {hasKey && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-600 hover:text-red-700" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" /> 删除
            </Button>
          )}
        </div>
      </div>

      {/* AI 生图模型 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">AI 生图模型</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              配置后可在智能配图面板中选择 AI 生成图片。未配置时自动使用搜索配图。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs shrink-0"
            onClick={() => { resetCustomForm(); setShowCustomForm(true) }}
          >
            <Plus className="h-3 w-3" />
            自定义
          </Button>
        </div>

        {allProviderIds.map((id) => renderGenCard(id, customProviders.some((cp) => cp.id === id)))}
      </div>

      {/* Custom Provider Form Dialog */}
      <Dialog open={showCustomForm} onOpenChange={(open) => { if (!open) resetCustomForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustom ? '编辑自定义服务商' : '添加自定义服务商'}</DialogTitle>
            <DialogDescription>
              支持任何兼容 OpenAI /v1/images/generations 格式的生图 API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">名称 *</label>
                <Input className="h-8 text-sm" placeholder="如：我的生图 API" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">API 地址 *</label>
                <Input className="h-8 text-sm" placeholder="https://api.example.com/v1" value={formApiBase} onChange={(e) => setFormApiBase(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">模型列表（每行一个，格式：模型ID|显示名称）*</label>
              <textarea
                className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                placeholder={"model-id-1|模型名称1\nmodel-id-2|模型名称2"}
                value={formModels}
                onChange={(e) => setFormModels(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">默认模型 ID</label>
                <Input className="h-8 text-sm" placeholder="留空取第一个" value={formDefaultModel} onChange={(e) => setFormDefaultModel(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">文档链接</label>
                <Input className="h-8 text-sm" placeholder="https://..." value={formDocsUrl} onChange={(e) => setFormDocsUrl(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">说明</label>
              <Input className="h-8 text-sm" placeholder="简要描述此服务商" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetCustomForm}>取消</Button>
            <Button size="sm" onClick={handleSaveCustom}>
              {editingCustom ? '更新' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ImageSearchSettings }
