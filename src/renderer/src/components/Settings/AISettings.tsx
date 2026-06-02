import { useState, useEffect } from 'react'
import { ExternalLink, Loader2, Check, Trash2, Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { PROVIDERS } from '@/lib/ai'
import type { AIProvider } from '@/lib/ai'
import { useToast } from '@/hooks/use-toast'

interface ProviderState {
  hasKey: boolean
  maskedKey: string
  modelId: string
  testing: boolean
  saving: boolean
  testResult: null | { ok: boolean; error?: string }
}

interface CustomProvider {
  id: string
  name: string
  api_base: string
  default_model: string
  models_json: string
  docs_url: string
  key_hint: string
  description: string
}

function AISettings(): React.JSX.Element {
  const [states, setStates] = useState<Record<string, ProviderState>>({})
  const [inputKeys, setInputKeys] = useState<Record<string, string>>({})
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [editingCustom, setEditingCustom] = useState<CustomProvider | null>(null)

  // Custom provider form state
  const [formName, setFormName] = useState('')
  const [formApiBase, setFormApiBase] = useState('')
  const [formDefaultModel, setFormDefaultModel] = useState('')
  const [formModels, setFormModels] = useState('')
  const [formDocsUrl, setFormDocsUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadStates()
    loadCustomProviders()
  }, [])

  const loadCustomProviders = async () => {
    try {
      const list = await window.api.aiCustomList()
      setCustomProviders(list)
    } catch {
      // ignore
    }
  }

  const loadStates = async () => {
    const configured = await window.api.aiListConfigured()
    const newStates: Record<string, ProviderState> = {}
    for (const provider of PROVIDERS) {
      const id = provider.config.id
      const found = configured.find((c: any) => c.provider_id === id)
      newStates[id] = {
        hasKey: !!found,
        maskedKey: found ? '••••••••' : '',
        modelId: found?.model_id || provider.config.defaultModel,
        testing: false,
        saving: false,
        testResult: null,
      }
      setSelectedModels((prev) => ({ ...prev, [id]: found?.model_id || provider.config.defaultModel }))
    }
    // Load custom provider states
    const customs = await window.api.aiCustomList().catch(() => [])
    for (const cp of customs) {
      const found = configured.find((c: any) => c.provider_id === cp.id)
      newStates[cp.id] = {
        hasKey: !!found,
        maskedKey: found ? '••••••••' : '',
        modelId: found?.model_id || cp.default_model,
        testing: false,
        saving: false,
        testResult: null,
      }
      const models: Array<{ id: string; name: string }> = JSON.parse(cp.models_json || '[]')
      setSelectedModels((prev) => ({ ...prev, [cp.id]: found?.model_id || models[0]?.id || '' }))
    }
    setStates(newStates)
  }

  const handleTest = async (providerId: string) => {
    const key = inputKeys[providerId]
    if (!key) {
      toast({ title: '请先输入密钥', variant: 'destructive' })
      return
    }
    setStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], testing: true, testResult: null } }))
    try {
      const result = await window.api.aiTestConnection(providerId, key)
      setStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], testing: false, testResult: result } }))
      if (result.ok) {
        toast({ title: '连接成功' })
      } else {
        toast({ title: '连接失败', description: result.error, variant: 'destructive' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '测试失败'
      setStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], testing: false, testResult: { ok: false, error: msg } } }))
    }
  }

  const handleSave = async (providerId: string) => {
    const key = inputKeys[providerId]
    if (!key) return
    const model = selectedModels[providerId]
    setStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], saving: true } }))
    try {
      await window.api.aiSaveKey(providerId, key, model)
      setInputKeys((prev) => ({ ...prev, [providerId]: '' }))
      await loadStates()
      toast({ title: '已保存' })
      window.dispatchEvent(new Event('ai-config-changed'))
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setStates((prev) => ({ ...prev, [providerId]: { ...prev[providerId], saving: false } }))
    }
  }

  const handleDelete = async (providerId: string) => {
    await window.api.aiDeleteKey(providerId)
    setInputKeys((prev) => ({ ...prev, [providerId]: '' }))
    await loadStates()
    toast({ title: '已删除' })
    window.dispatchEvent(new Event('ai-config-changed'))
  }

  const parsedModels = (() => {
    return formModels.split('\n').filter(Boolean).map((line) => {
      const [id, name] = line.split('|').map((s) => s.trim())
      return { id: id || '', name: name || id || '' }
    }).filter((m) => m.id)
  })()

  const handleSaveCustom = () => {
    if (!formName.trim() || !formApiBase.trim()) {
      toast({ title: '请填写名称和 API 地址', variant: 'destructive' })
      return
    }
    if (parsedModels.length === 0) {
      toast({ title: '请至少添加一个模型', variant: 'destructive' })
      return
    }
    setShowAddCustom(false)
    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    try {
      await window.api.aiCustomSave({
        id: editingCustom?.id,
        name: formName.trim(),
        apiBase: formApiBase.trim().replace(/\/+$/, ''),
        defaultModel: formDefaultModel.trim() || parsedModels[0].id,
        models: parsedModels,
        docsUrl: formDocsUrl.trim(),
        description: formDescription.trim(),
      })
      toast({ title: editingCustom ? '已更新' : '已添加' })
      setShowConfirmDialog(false)
      resetCustomForm()
      await loadCustomProviders()
      await loadStates()
    } catch (err) {
      toast({ title: '保存失败', variant: 'destructive' })
    }
  }

  const handleDeleteCustom = async (id: string) => {
    if (!confirm('确定删除此自定义服务商？关联的 API Key 也会被删除。')) return
    await window.api.aiCustomDelete(id)
    await loadCustomProviders()
    await loadStates()
    toast({ title: '已删除' })
    window.dispatchEvent(new Event('ai-config-changed'))
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
    setShowAddCustom(true)
  }

  const handleEditPreset = (provider: AIProvider) => {
    setEditingCustom(null)
    setFormName(provider.config.name)
    setFormApiBase(provider.config.apiBase)
    setFormDefaultModel(provider.config.defaultModel)
    setFormModels(provider.config.models.map((m) => `${m.id}|${m.name}`).join('\n'))
    setFormDocsUrl(provider.config.docsUrl)
    setFormDescription(provider.config.description || '')
    setShowAddCustom(true)
  }

  const resetCustomForm = () => {
    setShowAddCustom(false)
    setEditingCustom(null)
    setFormName('')
    setFormApiBase('')
    setFormDefaultModel('')
    setFormModels('')
    setFormDocsUrl('')
    setFormDescription('')
  }

  const renderProviderCard = (provider: AIProvider) => {
    const id = provider.config.id
    const state = states[id] || { hasKey: false, maskedKey: '', modelId: provider.config.defaultModel, testing: false, saving: false, testResult: null }
    const inputKey = inputKeys[id] || ''
    const isExpanded = expandedId === id

    return (
      <div key={id} className="rounded-lg border border-border overflow-hidden">
        {/* Header - always visible */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{provider.config.name}</span>
              {state.hasKey && (
                <span className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                  <Check className="h-2.5 w-2.5" />
                  已配置
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {provider.config.description && (
                <span className="text-[11px] text-muted-foreground truncate">{provider.config.description}</span>
              )}
            </div>
            {provider.config.license && (
              <p className="text-[10px] text-blue-600/80 mt-0.5 truncate">协议：{provider.config.license}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {provider.config.docsUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); window.api.aiOpenExternal(provider.config.docsUrl) }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); handleEditPreset(provider) }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Expanded config */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {/* Model selector */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">模型</label>
              <select
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={selectedModels[id] || provider.config.defaultModel}
                onChange={(e) => setSelectedModels((prev) => ({ ...prev, [id]: e.target.value }))}
              >
                {provider.config.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.license ? ` [${m.license}]` : ''}</option>
                ))}
              </select>
              {/* 选中模型的协议说明 */}
              {(() => {
                const selectedModel = provider.config.models.find((m) => m.id === (selectedModels[id] || provider.config.defaultModel))
                return selectedModel?.license ? (
                  <p className="text-[10px] text-blue-600/80 mt-1">模型协议：{selectedModel.license}</p>
                ) : null
              })()}
            </div>

            {/* API Key input */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API Key</label>
              <input
                type="password"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                placeholder={provider.config.keyHint}
                value={state.hasKey && !inputKey ? state.maskedKey : inputKey}
                onChange={(e) => setInputKeys((prev) => ({ ...prev, [id]: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {state.hasKey ? (
                <>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    删除密钥
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">未配置</span>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={!inputKey || state.testing}
                    onClick={() => handleTest(id)}
                  >
                    {state.testing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    测试
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={!inputKey || state.saving}
                    onClick={() => handleSave(id)}
                  >
                    {state.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    保存
                  </Button>
                </>
              )}
            </div>

            {state.testResult && !state.hasKey && (
              <div className={`text-xs ${state.testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {state.testResult.ok ? '✓ 连接成功' : `✗ ${state.testResult.error}`}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">大模型配置</h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => { resetCustomForm(); setShowAddCustom(true) }}
        >
          <Plus className="h-3 w-3" />
          自定义服务商
        </Button>
      </div>

      {/* Built-in providers */}
      <div className="space-y-2">
        {PROVIDERS.map(renderProviderCard)}
      </div>

      {/* Custom providers */}
      {customProviders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">自定义服务商</h3>
          {customProviders.map((cp) => {
            const models: Array<{ id: string; name: string }> = JSON.parse(cp.models_json || '[]')
            const state = states[cp.id] || { hasKey: false, maskedKey: '', modelId: cp.default_model, testing: false, saving: false, testResult: null }
            const inputKey = inputKeys[cp.id] || ''
            const isExpanded = expandedId === cp.id

            return (
              <div key={cp.id} className="rounded-lg border border-dashed border-primary/30 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : cp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cp.name}</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">自定义</span>
                      {state.hasKey && (
                        <span className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          <Check className="h-2.5 w-2.5" />
                          已配置
                        </span>
                      )}
                    </div>
                    {cp.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{cp.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">{cp.api_base}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); handleEditCustom(cp) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustom(cp.id) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">模型</label>
                      <select
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={selectedModels[cp.id] || cp.default_model}
                        onChange={(e) => setSelectedModels((prev) => ({ ...prev, [cp.id]: e.target.value }))}
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
                        placeholder={cp.key_hint || 'API Key'}
                        value={state.hasKey && !inputKey ? state.maskedKey : inputKey}
                        onChange={(e) => setInputKeys((prev) => ({ ...prev, [cp.id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {state.hasKey ? (
                        <>
                          <div className="flex-1" />
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-600" onClick={() => handleDelete(cp.id)}>
                            <Trash2 className="h-3 w-3" /> 删除密钥
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">未配置</span>
                          <div className="flex-1" />
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={!inputKey || state.testing} onClick={() => handleTest(cp.id)}>
                            {state.testing ? <Loader2 className="h-3 w-3 animate-spin" /> : null} 测试
                          </Button>
                          <Button size="sm" className="h-7 gap-1 text-xs" disabled={!inputKey || state.saving} onClick={() => handleSave(cp.id)}>
                            {state.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} 保存
                          </Button>
                        </>
                      )}
                    </div>
                    {state.testResult && !state.hasKey && (
                      <div className={`text-xs ${state.testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                        {state.testResult.ok ? '✓ 连接成功' : `✗ ${state.testResult.error}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 第一步弹窗：填写服务商信息 */}
      <Dialog open={showAddCustom} onOpenChange={(open) => { if (!open) resetCustomForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustom ? '编辑服务商' : '添加自定义服务商（预设修改时可直接保存为自定义服务商）'}</DialogTitle>
            <DialogDescription>
              填写 API 地址和模型信息。编辑预设会创建为新的自定义服务商。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">名称 *</label>
                <Input className="h-8 text-sm" placeholder="如：我的 API" value={formName} onChange={(e) => setFormName(e.target.value)} />
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
                placeholder={"gpt-4o|GPT-4o\ngpt-4o-mini|GPT-4o Mini"}
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
              下一步
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 第二步弹窗：确认信息 */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => { if (!open) { setShowConfirmDialog(false); setShowAddCustom(true) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustom ? '确认更新服务商' : '确认添加服务商'}</DialogTitle>
            <DialogDescription>
              请确认以下信息无误后再提交
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-[5em_1fr] gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">名称</span>
              <span className="font-medium">{formName}</span>

              <span className="text-muted-foreground">API 地址</span>
              <span className="font-mono text-xs break-all">{formApiBase.trim().replace(/\/+$/, '')}</span>

              <span className="text-muted-foreground">默认模型</span>
              <span className="font-mono text-xs">{formDefaultModel.trim() || parsedModels[0]?.id || '-'}</span>

              <span className="text-muted-foreground">模型数量</span>
              <span>{parsedModels.length} 个</span>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                查看模型列表
              </summary>
              <div className="mt-2 max-h-32 overflow-y-auto rounded border bg-muted/30 p-2">
                {parsedModels.map((m) => (
                  <div key={m.id} className="flex gap-2 py-0.5">
                    <span className="font-mono text-muted-foreground">{m.id}</span>
                    <span>{m.name}</span>
                  </div>
                ))}
              </div>
            </details>

            {formDocsUrl.trim() && (
              <div className="grid grid-cols-[5em_1fr] gap-x-3 text-sm">
                <span className="text-muted-foreground">文档链接</span>
                <span className="font-mono text-xs break-all">{formDocsUrl.trim()}</span>
              </div>
            )}

            {formDescription.trim() && (
              <div className="grid grid-cols-[5em_1fr] gap-x-3 text-sm">
                <span className="text-muted-foreground">说明</span>
                <span>{formDescription.trim()}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowConfirmDialog(false); setShowAddCustom(true) }}>
              返回修改
            </Button>
            <Button size="sm" onClick={handleConfirmSave}>
              确认{editingCustom ? '更新' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { AISettings }
