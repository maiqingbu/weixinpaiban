import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ImagePlus, ChevronDown, Search, Wand2, Trash2, Play } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { getImageGenProvider } from '@/lib/imageGen/providers'

// ── Types ──

type Ratio = '16:9' | '1:1' | '3:4'
type SlotMode = 'search' | 'gen'

const RATIO_OPTIONS: { value: Ratio; label: string; size: string }[] = [
  { value: '16:9', label: '横版 16:9', size: '1792x1024' },
  { value: '1:1', label: '方形 1:1', size: '1024x1024' },
  { value: '3:4', label: '竖版 3:4', size: '1024x1792' },
]

function ratioSize(ratio: Ratio): string {
  return RATIO_OPTIONS.find((r) => r.value === ratio)?.size || '1024x1024'
}

interface ImageSlot {
  afterBlock: number
  desc: string
  query: string
  genPrompt: string
  mode: SlotMode
  ratio: Ratio
  images: string[]
  selectedIndex: number
  loading: boolean
}

interface AiImageResult {
  afterBlock: number
  desc: string
  query: string
  genPrompt: string
}

// ── AI prompt ──

const AUTO_MATCH_PROMPT = `你是一位公众号资深美术编辑，精通 AI 生图提示词撰写。

分析以下文章，为配图位置设计恰当的图片。文章每段前有 [数字] 标记。

输出严格 JSON（不要 markdown 代码块）：
{
  "articleStyle": "文章整体视觉风格定位，如：科技感商务风 / 温馨生活治愈风 / 清新自然文艺风 / 专业学术权威风 等。10字以内。",
  "images": [
    {
      "afterBlock": 数字,
      "desc": "为什么在此配图，10字以内",
      "query": "百度图片搜索关键词，2-5个中文词",
      "genPrompt": "AI生图提示词，详见下方规则"
    }
  ]
}

genPrompt 必须遵循以下规范（重要）：
- 语言：全中文，自然语言描述，不要英文标签堆砌
- 长度：20-50 字
- 末尾必须追加"无文字无LOGO无水印"，确保生成的图片不包含任何文字、品牌标识、AI生成水印
- 内容必须包含：
  1. 主体/场景：画面核心内容是什么
  2. 构图：近景/中景/远景/特写/平视/俯视 等
  3. 风格：写实摄影/扁平插画/水彩/3D渲染/极简/水墨/渐变 等，根据文章气质选择
  4. 光影色调：明亮温暖/冷峻蓝调/柔和自然光/高对比度 等
  5. 品质词：高清细腻 或 简洁干净 或 质感高级 等（1-2个即可）

genPrompt 正确示例：
  "城市天际线夜景，中景平视构图，现代建筑玻璃幕墙倒映灯火，写实摄影风格，蓝紫色调冷暖对比，高清细腻，无文字无LOGO无水印"
  "办公桌上笔记本电脑旁一杯热咖啡，45度近景特写，柔和晨光从窗户斜射，温馨生活摄影风格，暖黄色调，简洁干净，无文字无LOGO无水印"
  "绿色山坡上一棵孤树，远景俯视构图，蓝天白云大片留白，极简治愈插画风格，明亮自然色调，简洁干净，无文字无LOGO无水印"

genPrompt 错误示例（不要这样写）：
  ✗ "黄山日出云海" — 太短，没有风格和构图
  ✗ "masterpiece, best quality, 1girl, cherry blossoms" — 英文标签堆砌
  ✗ "一幅美丽的风景画" — 太笼统

其他规则：
- 每 2-4 段配 1 张图，忌过密
- 文章开头和核心观点/场景处优先配图
- 输出 2-5 张配图建议
- 配图风格需与 articleStyle 协调
- 仅输出 JSON`

// ── Props ──

interface AutoImageMatchProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

// ── Helpers ──

function getIndexedBlocks(editor: Editor | null): { text: string; blocks: { pos: number; nodeSize: number }[]; title: string } | null {
  if (!editor) return null

  const blocks: { pos: number; nodeSize: number }[] = []
  const lines: string[] = []
  let idx = 0
  let title = ''

  editor.state.doc.descendants((node, pos) => {
    if (node.isBlock && node.type.name !== 'image' && node.textContent.trim()) {
      blocks.push({ pos, nodeSize: node.nodeSize })
      const prefix = node.type.name === 'heading' ? '# ' : ''
      const snippet = node.textContent.trim().slice(0, 200)
      lines.push(`[${idx}] ${prefix}${snippet}`)
      if (!title && node.type.name === 'heading') {
        title = node.textContent.trim().slice(0, 50)
      }
      idx++
    }
  })

  if (!title && blocks.length > 0) {
    editor.state.doc.descendants((node) => {
      if (!title && node.isBlock && node.textContent.trim()) {
        title = node.textContent.trim().slice(0, 50)
      }
    })
  }

  return { text: lines.join('\n'), blocks, title }
}

function parseAiResponse(text: string): { images: AiImageResult[]; articleStyle: string } | null {
  let jsonStr = ''
  const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1]
  } else {
    const braceMatch = text.match(/\{[\s\S]*\}/)
    jsonStr = braceMatch ? braceMatch[0] : ''
  }
  if (!jsonStr) return null

  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\n\r\t]/g, ' ')

  let parsed: any
  try { parsed = JSON.parse(jsonStr) } catch { return null }

  if (!parsed.images?.length) return null

  const images = parsed.images
    .filter((img: any) => typeof img.afterBlock === 'number' && img.query)
    .map((img: any) => ({
      afterBlock: img.afterBlock,
      desc: img.desc || '',
      query: img.query || '',
      genPrompt: img.genPrompt || img.desc || '',
    }))

  return { images, articleStyle: parsed.articleStyle || '' }
}

// ── Component ──

function AutoImageMatch({ editor, open, onClose }: AutoImageMatchProps): React.JSX.Element | null {
  const [phase, setPhase] = useState<'analyzing' | 'planning' | 'generating' | 'selecting' | 'inserting' | 'done'>('analyzing')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<ImageSlot[]>([])
  const [insertCount, setInsertCount] = useState(0)
  const [articleStyle, setArticleStyle] = useState('')
  const [generatingProgress, setGeneratingProgress] = useState({ done: 0, total: 0 })
  const startedRef = useRef(false)
  const blocksRef = useRef<{ pos: number; nodeSize: number }[]>([])

  const [genProviders, setGenProviders] = useState<Array<{ id: string; name: string; apiBase: string; modelId: string; bodyOverrides?: Record<string, unknown> }>>([])
  const [selectedGenId, setSelectedGenId] = useState('')
  const genProvidersRef = useRef<Array<{ id: string; name: string; apiBase: string; modelId: string; bodyOverrides?: Record<string, unknown> }>>([])
  const selectedGenIdRef = useRef('')

  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true
      loadGenProviders().then(({ selectedId }) => {
        selectedGenIdRef.current = selectedId
        runAnalysis()
      })
    }
    if (!open) {
      startedRef.current = false
      setPhase('analyzing')
      setError('')
      setStatusMsg('')
      setSlots([])
      setInsertCount(0)
      setArticleStyle('')
      setGeneratingProgress({ done: 0, total: 0 })
    }
  }, [open])

  useEffect(() => {
    selectedGenIdRef.current = selectedGenId
    genProvidersRef.current = genProviders
  }, [selectedGenId, genProviders])

  const hasGenProvider = genProviders.length > 0 && selectedGenId !== ''

  const loadGenProviders = async () => {
    let configured: Array<{ provider_id: string; model_id: string }> = []
    try { configured = await window.api.imageGenListConfigured() } catch { /* ignore */ }

    let customs: Array<{ id: string; name: string; api_base: string; default_model: string; models_json: string }> = []
    try { customs = await window.api.imageGenCustomList() } catch { /* ignore */ }

    const list = configured
      .map((c) => {
        const p = getImageGenProvider(c.provider_id)
        if (p) return { id: p.id, name: p.name, apiBase: p.apiBase, modelId: c.model_id || p.models[0]?.id || '', bodyOverrides: p.bodyOverrides }
        const cp = customs.find((x) => x.id === c.provider_id)
        if (cp) {
          const cpModels: Array<{ id: string }> = JSON.parse(cp.models_json || '[]')
          return { id: cp.id, name: cp.name, apiBase: cp.api_base, modelId: c.model_id || cpModels[0]?.id || '' }
        }
        return null
      })
      .filter(Boolean) as Array<{ id: string; name: string; apiBase: string; modelId: string; bodyOverrides?: Record<string, unknown> }>

    const selectedId = list[0]?.id || ''
    genProvidersRef.current = list
    setGenProviders(list)
    setSelectedGenId(selectedId)
    return { list, selectedId }
  }

  // ── Phase 1: AI analysis → planning ──

  const runAnalysis = async () => {
    if (!editor) return

    const indexed = getIndexedBlocks(editor)
    if (!indexed || indexed.blocks.length < 3) {
      setError('文章内容太少，至少需要 3 段文字才能智能配图')
      return
    }
    blocksRef.current = indexed.blocks

    setPhase('analyzing')
    setStatusMsg('AI 正在分析文章，设计配图方案…')
    setError('')

    let configured: Array<{ provider_id: string }> = []
    try { configured = await window.api.aiListConfigured() } catch {
      setError('请先在设置中配置 AI 服务')
      return
    }
    if (configured.length === 0) {
      setError('请先在设置中配置 AI 服务')
      return
    }
    const providerId = configured[0].provider_id

    try {
      const res = await window.api.aiCompleteSimple(providerId, {
        messages: [
          { role: 'system' as const, content: AUTO_MATCH_PROMPT },
          { role: 'user' as const, content: indexed.text },
        ],
        temperature: 0.4,
      })

      if (!res.text?.trim()) {
        setError('AI 返回了空响应，请检查 AI 服务配置后重试')
        return
      }

      const parsed = parseAiResponse(res.text)
      if (!parsed || parsed.images.length === 0) {
        setError('未能在文章中找到合适的配图位置，请尝试内容更丰富的文章')
        return
      }

      setArticleStyle(parsed.articleStyle)

      const valid = parsed.images
        .filter((r) => r.afterBlock < indexed.blocks.length)
        .slice(0, 5)

      if (valid.length === 0) {
        setError('未能在文章中找到合适的配图位置')
        return
      }

      const defaultMode: SlotMode = hasGenProvider ? 'gen' : 'search'
      const initialSlots: ImageSlot[] = valid.map((r) => ({
        afterBlock: r.afterBlock,
        desc: r.desc,
        query: r.query,
        genPrompt: r.genPrompt || r.desc,
        mode: defaultMode,
        ratio: '16:9' as Ratio,
        images: [],
        selectedIndex: -1,
        loading: false,
      }))

      setSlots(initialSlots)
      setPhase('planning')
    } catch (e: any) {
      if (e.message === 'PROVIDER_NOT_CONFIGURED') {
        setError('请先在设置中配置 AI 服务')
      } else {
        setError(e.message || '分析失败，请重试')
      }
    }
  }

  // ── Slot mutations (planning phase) ──

  const updateSlotMode = (afterBlock: number, mode: SlotMode) => {
    setSlots((prev) => prev.map((s) => s.afterBlock === afterBlock ? { ...s, mode } : s))
  }

  const updateSlotRatio = (afterBlock: number, ratio: Ratio) => {
    setSlots((prev) => prev.map((s) => s.afterBlock === afterBlock ? { ...s, ratio } : s))
  }

  const updateSlotGenPrompt = (afterBlock: number, genPrompt: string) => {
    setSlots((prev) => prev.map((s) => s.afterBlock === afterBlock ? { ...s, genPrompt } : s))
  }

  const updateSlotQuery = (afterBlock: number, query: string) => {
    setSlots((prev) => prev.map((s) => s.afterBlock === afterBlock ? { ...s, query } : s))
  }

  const removeSlot = (afterBlock: number) => {
    setSlots((prev) => prev.filter((s) => s.afterBlock !== afterBlock))
  }

  // ── Phase 2: Start batch generation ──

  const startBatchGeneration = async () => {
    if (slots.length === 0) return
    setPhase('generating')
    setGeneratingProgress({ done: 0, total: slots.length })

    const genSlots = slots.map((s) => ({ ...s, images: [], loading: true, selectedIndex: -1 }))
    setSlots(genSlots)

    for (let i = 0; i < genSlots.length; i++) {
      const slot = genSlots[i]
      const images = await fetchImagesForSlot(slot)
      setSlots((prev) =>
        prev.map((s) =>
          s.afterBlock === slot.afterBlock ? { ...s, images, loading: false } : s
        )
      )
      setGeneratingProgress({ done: i + 1, total: genSlots.length })
    }

    setPhase('selecting')
  }

  // ── Fetch images ──

  const fetchImagesForSlot = async (slot: ImageSlot): Promise<string[]> => {
    if (slot.mode === 'gen' && selectedGenIdRef.current) {
      try {
        const provider = genProvidersRef.current.find((p) => p.id === selectedGenIdRef.current)
        if (!provider) return []
        const prompt = slot.genPrompt || `${slot.desc}，${slot.query}`
        const size = ratioSize(slot.ratio)
        const bodyOverrides = {
          size,
          ...provider.bodyOverrides,
        }
        console.log('[AutoImageMatch] 生成图片:', { genId: provider.id, modelId: provider.modelId, ratio: slot.ratio, size, prompt: prompt.slice(0, 80) })
        const images = await window.api.imageGenGenerate(provider.id, provider.apiBase, provider.modelId, prompt, bodyOverrides)
        console.log('[AutoImageMatch] 生成结果:', images.length, '张')
        return images
      } catch (err) {
        console.error('[AutoImageMatch] 生图失败:', err)
        return []
      }
    }

    try {
      const seed = Math.floor(Math.random() * 100)
      const res = await window.api.imageSuggestions(slot.query, seed)
      return res.images?.slice(0, 4) || []
    } catch {
      return []
    }
  }

  // ── Re-fetch for a single slot (selecting phase) ──

  const refreshSlot = async (afterBlock: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock ? { ...s, images: [], loading: true, selectedIndex: -1 } : s
      )
    )

    const slot = slots.find((s) => s.afterBlock === afterBlock)
    if (!slot) return

    const images = await fetchImagesForSlot(slot)
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock ? { ...s, images, loading: false } : s
      )
    )
  }

  // ── Select an image ──

  const selectImage = (afterBlock: number, index: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock ? { ...s, selectedIndex: s.selectedIndex === index ? -1 : index } : s
      )
    )
  }

  // ── Confirm and insert ──

  const confirmInsert = () => {
    if (!editor) return

    const selected = slots.filter((s) => s.selectedIndex >= 0)
    if (selected.length === 0) return

    setPhase('inserting')

    const sorted = [...selected].sort((a, b) => b.afterBlock - a.afterBlock)
    const chain = editor.chain().focus()
    for (const s of sorted) {
      const block = blocksRef.current[s.afterBlock]
      if (block) {
        chain.setTextSelection(block.pos + block.nodeSize).setImage({ src: s.images[s.selectedIndex] })
      }
    }
    chain.run()

    setInsertCount(sorted.length)
    setPhase('done')
  }

  // ── Render ──

  if (!open || !editor) return null

  const selectedCount = slots.filter((s) => s.selectedIndex >= 0).length

  const handleClose = () => {
    if (phase === 'selecting' && selectedCount > 0) {
      if (!window.confirm('还有未确认的配图选择，确定关闭吗？')) return
    }
    if (phase === 'planning' && slots.length > 0) {
      if (!window.confirm('配图方案还未执行，确定关闭吗？')) return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" onClick={handleClose}>
      <div
        className="flex max-h-[90vh] w-[700px] flex-col rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h2 className="text-sm font-semibold">智能配图</h2>
            </div>
            {articleStyle && phase !== 'analyzing' && (
              <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {articleStyle}
              </span>
            )}
            {phase === 'planning' && (
              <div className="relative">
                <select
                  className="h-7 rounded border border-border bg-background pl-2 pr-6 text-xs text-muted-foreground appearance-none cursor-pointer hover:border-primary/50 focus:outline-none focus:border-primary"
                  value={selectedGenId}
                  onChange={(e) => {
                    const newId = e.target.value
                    setSelectedGenId(newId)
                    if (newId) {
                      setSlots((prev) => prev.map((s) => ({ ...s, mode: 'gen' as SlotMode })))
                    } else {
                      setSlots((prev) => prev.map((s) => ({ ...s, mode: 'search' as SlotMode })))
                    }
                  }}
                >
                  <option value="">搜索图片</option>
                  {genProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} 生图</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </div>
          {phase !== 'inserting' && phase !== 'generating' && (
            <button onClick={handleClose} className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {phase === 'analyzing' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">{statusMsg}</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-center text-muted-foreground">{error}</p>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={handleClose}>关闭</Button>
                <Button size="sm" onClick={runAnalysis}>重试</Button>
              </div>
            </div>
          )}

          {phase === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">
                正在配图 {generatingProgress.done}/{generatingProgress.total}
              </p>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium">已插入 {insertCount} 张配图</p>
              <p className="text-xs text-muted-foreground">不满意可 Ctrl+Z 一键撤销</p>
              <Button variant="outline" size="sm" onClick={onClose}>完成</Button>
            </div>
          )}

          {/* ── Planning phase ── */}
          {phase === 'planning' && slots.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                AI 已分析出 {slots.length} 个配图位置。你可以调整每张图的搜索词、生图提示词、比例，或切换搜索/生图模式。
              </p>
              {slots.map((slot, idx) => (
                <div key={slot.afterBlock} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">#{idx + 1}</span>
                    <span className="text-sm font-medium">{slot.desc}</span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-500"
                      onClick={() => removeSlot(slot.afterBlock)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mode toggle */}
                    <div className="flex rounded border border-border overflow-hidden text-[11px]">
                      <button
                        type="button"
                        className={`px-2 py-1 flex items-center gap-1 ${slot.mode === 'search' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                        onClick={() => updateSlotMode(slot.afterBlock, 'search')}
                      >
                        <Search className="h-3 w-3" />搜索
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 flex items-center gap-1 ${slot.mode === 'gen' ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'} ${!hasGenProvider ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => { if (hasGenProvider) updateSlotMode(slot.afterBlock, 'gen') }}
                        title={!hasGenProvider ? '请先在设置中配置生图服务商' : 'AI 生图'}
                      >
                        <Wand2 className="h-3 w-3" />生图
                      </button>
                    </div>

                    {/* Ratio selector */}
                    <select
                      className="h-7 rounded border border-border bg-background px-2 text-[11px] text-muted-foreground"
                      value={slot.ratio}
                      onChange={(e) => updateSlotRatio(slot.afterBlock, e.target.value as Ratio)}
                    >
                      {RATIO_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Editable prompts */}
                  <div className="space-y-1.5">
                    {slot.mode === 'search' ? (
                      <input
                        className="w-full h-7 rounded border border-border bg-background px-2 text-xs"
                        value={slot.query}
                        onChange={(e) => updateSlotQuery(slot.afterBlock, e.target.value)}
                        placeholder="搜索关键词"
                      />
                    ) : (
                      <textarea
                        className="w-full h-14 rounded border border-border bg-background px-2 py-1 text-xs resize-none"
                        value={slot.genPrompt}
                        onChange={(e) => updateSlotGenPrompt(slot.afterBlock, e.target.value)}
                        placeholder="AI 生图提示词"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Selecting phase (review & pick images) ── */}
          {(phase === 'selecting' || phase === 'inserting') && slots.length > 0 && (
            <div className="space-y-6">
              {slots.map((slot, idx) => (
                <div key={slot.afterBlock}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">#{idx + 1}</span>
                    <span className="text-sm font-medium">{slot.desc}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {slot.mode === 'gen' ? (
                        <span className="text-purple-500">{RATIO_OPTIONS.find(r => r.value === slot.ratio)?.label}</span>
                      ) : (
                        slot.query
                      )}
                    </span>
                  </div>

                  {slot.loading ? (
                    <div className="grid grid-cols-4 gap-2 h-24">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="rounded-md border border-border bg-muted animate-pulse flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  ) : slot.images.length > 0 ? (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {slot.images.map((dataUrl, i) => {
                          const isSelected = slot.selectedIndex === i
                          return (
                            <button
                              key={i}
                              type="button"
                              className={`relative overflow-hidden rounded-md border-2 transition-all ${
                                isSelected
                                  ? 'border-purple-500 ring-2 ring-purple-200'
                                  : 'border-border hover:border-purple-300'
                              }`}
                              onClick={() => selectImage(slot.afterBlock, i)}
                            >
                              <img
                                src={dataUrl}
                                alt={`${slot.desc} ${i + 1}`}
                                className={`w-full object-cover ${slot.ratio === '16:9' ? 'aspect-video' : slot.ratio === '3:4' ? 'aspect-[3/4]' : 'aspect-square'}`}
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => refreshSlot(slot.afterBlock)}
                        >
                          <RefreshCw className="h-3 w-3" />
                          {slot.mode === 'gen' ? '重新生成' : '换一批'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <AlertTriangle className="h-3 w-3" />
                      {slot.mode === 'gen' ? '生成失败' : '图片加载失败'}
                      <button
                        type="button"
                        className="text-purple-500 hover:underline"
                        onClick={() => refreshSlot(slot.afterBlock)}
                      >
                        重试
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'planning' && slots.length > 0 && (
          <div className="border-t border-border px-4 py-3 shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              共 {slots.length} 个配图位置
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>取消</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                onClick={startBatchGeneration}
              >
                <Play className="h-3.5 w-3.5" />
                开始配图 ({slots.length})
              </Button>
            </div>
          </div>
        )}

        {phase === 'selecting' && slots.length > 0 && (
          <div className="border-t border-border px-4 py-3 shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              已选 {selectedCount}/{slots.length} 个位置
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>取消</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                disabled={selectedCount === 0}
                onClick={confirmInsert}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                确认插入 ({selectedCount})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { AutoImageMatch }
