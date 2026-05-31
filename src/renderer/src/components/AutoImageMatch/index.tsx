import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ImagePlus, ChevronDown } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { getImageGenProvider } from '@/lib/imageGen/providers'

// ── Types ──

interface ImageSlot {
  afterBlock: number
  desc: string
  query: string
  genPrompt: string
  images: string[]       // base64 data URLs
  selectedIndex: number  // -1 = none selected
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
- 内容必须包含：
  1. 主体/场景：画面核心内容是什么
  2. 构图：近景/中景/远景/特写/平视/俯视 等
  3. 风格：写实摄影/扁平插画/水彩/3D渲染/极简/水墨/渐变 等，根据文章气质选择
  4. 光影色调：明亮温暖/冷峻蓝调/柔和自然光/高对比度 等
  5. 品质词：高清细腻 或 简洁干净 或 质感高级 等（1-2个即可）

genPrompt 正确示例：
  "城市天际线夜景，中景平视构图，现代建筑玻璃幕墙倒映灯火，写实摄影风格，蓝紫色调冷暖对比，高清细腻"
  "办公桌上笔记本电脑旁一杯热咖啡，45度近景特写，柔和晨光从窗户斜射，温馨生活摄影风格，暖黄色调，简洁干净"
  "绿色山坡上一棵孤树，远景俯视构图，蓝天白云大片留白，极简治愈插画风格，明亮自然色调，简洁干净"

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

  // Use first text block as title if no heading found
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
  const [phase, setPhase] = useState<'analyzing' | 'selecting' | 'inserting' | 'done'>('analyzing')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<ImageSlot[]>([])
  const [insertCount, setInsertCount] = useState(0)
  const [articleStyle, setArticleStyle] = useState('')
  const startedRef = useRef(false)
  const blocksRef = useRef<{ pos: number; nodeSize: number }[]>([])

  const [genProviders, setGenProviders] = useState<Array<{ id: string; name: string; apiBase: string; modelId: string }>>([])
  const [selectedGenId, setSelectedGenId] = useState('')
  const genProvidersRef = useRef<Array<{ id: string; name: string; apiBase: string; modelId: string }>>([])
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
    }
  }, [open])

  useEffect(() => {
    selectedGenIdRef.current = selectedGenId
    genProvidersRef.current = genProviders
  }, [selectedGenId, genProviders])

  const loadGenProviders = async () => {
    let configured: Array<{ provider_id: string; model_id: string }> = []
    try { configured = await window.api.imageGenListConfigured() } catch { /* ignore */ }

    let customs: Array<{ id: string; name: string; api_base: string; default_model: string; models_json: string }> = []
    try { customs = await window.api.imageGenCustomList() } catch { /* ignore */ }

    const list = configured
      .map((c) => {
        const p = getImageGenProvider(c.provider_id)
        if (p) return { id: p.id, name: p.name, apiBase: p.apiBase, modelId: c.model_id || p.models[0]?.id || '' }
        const cp = customs.find((x) => x.id === c.provider_id)
        if (cp) {
          const cpModels: Array<{ id: string }> = JSON.parse(cp.models_json || '[]')
          return { id: cp.id, name: cp.name, apiBase: cp.api_base, modelId: c.model_id || cpModels[0]?.id || '' }
        }
        return null
      })
      .filter(Boolean) as Array<{ id: string; name: string; apiBase: string; modelId: string }>

    const selectedId = list[0]?.id || ''
    genProvidersRef.current = list
    setGenProviders(list)
    setSelectedGenId(selectedId)
    return { list, selectedId }
  }

  // ── Phase 1: AI analysis ──

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

      const initialSlots: ImageSlot[] = valid.map((r) => ({
        afterBlock: r.afterBlock,
        desc: r.desc,
        query: r.query,
        genPrompt: r.genPrompt || r.desc,
        images: [],
        selectedIndex: -1,
        loading: true,
      }))

      setSlots(initialSlots)
      setPhase('selecting')

      await loadAllImages(initialSlots)
    } catch (e: any) {
      if (e.message === 'PROVIDER_NOT_CONFIGURED') {
        setError('请先在设置中配置 AI 服务')
      } else {
        setError(e.message || '分析失败，请重试')
      }
    }
  }

  // ── Load images for all slots ──

  const loadAllImages = async (currentSlots: ImageSlot[]) => {
    for (const slot of currentSlots) {
      const images = await fetchImagesForSlot(slot)
      setSlots((prev) =>
        prev.map((s) =>
          s.afterBlock === slot.afterBlock ? { ...s, images, loading: false } : s
        )
      )
    }
  }

  // ── Fetch images: generate if model selected, else search ──

  const fetchImagesForSlot = async (slot: ImageSlot): Promise<string[]> => {
    const genId = selectedGenIdRef.current
    if (genId) {
      try {
        const provider = genProvidersRef.current.find((p) => p.id === genId)
        if (!provider) return []
        const prompt = slot.genPrompt || `${slot.desc}，${slot.query}`
        return await window.api.imageGenGenerate(genId, provider.apiBase, provider.modelId, prompt)
      } catch {
        return []
      }
    }
    // 搜索模式
    try {
      const seed = Math.floor(Math.random() * 100)
      const res = await window.api.imageSuggestions(slot.query, seed)
      return res.images?.slice(0, 4) || []
    } catch {
      return []
    }
  }

  // ── Re-fetch for a single slot ──

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

  // ── Custom search (search mode only) ──

  const searchCustomQuery = async (afterBlock: number, customQuery: string) => {
    if (!customQuery.trim()) return

    const updatedSlot = slots.find((s) => s.afterBlock === afterBlock)
    if (!updatedSlot) return

    const newSlot = { ...updatedSlot, query: customQuery.trim(), images: [], loading: true, selectedIndex: -1 }

    setSlots((prev) =>
      prev.map((s) => (s.afterBlock === afterBlock ? newSlot : s))
    )

    const images = await fetchImagesForSlot(newSlot)
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
            <div className="relative">
              <select
                className="h-7 rounded border border-border bg-background pl-2 pr-6 text-xs text-muted-foreground appearance-none cursor-pointer hover:border-primary/50 focus:outline-none focus:border-primary"
                value={selectedGenId}
                onChange={(e) => setSelectedGenId(e.target.value)}
              >
                <option value="">搜索图片</option>
                {genProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} 生图</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {phase !== 'inserting' && (
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

          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium">已插入 {insertCount} 张配图</p>
              <p className="text-xs text-muted-foreground">不满意可 Ctrl+Z 一键撤销</p>
              <Button variant="outline" size="sm" onClick={onClose}>完成</Button>
            </div>
          )}

          {(phase === 'selecting' || phase === 'inserting') && slots.length > 0 && (
            <div className="space-y-6">
              {slots.map((slot, idx) => (
                <div key={slot.afterBlock}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-medium">{slot.desc}</h3>
                    {selectedGenId ? (
                      <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded max-w-[280px] truncate" title={slot.genPrompt}>
                        {slot.genPrompt}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">({slot.query})</span>
                    )}
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
                                className="w-full aspect-[4/3] object-cover"
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
                          {selectedGenId ? '重新生成' : '换一批'}
                        </button>
                        {!selectedGenId && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <CustomSearchInput
                              onSearch={(q) => searchCustomQuery(slot.afterBlock, q)}
                            />
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <AlertTriangle className="h-3 w-3" />
                      {selectedGenId ? '生成失败' : '图片加载失败'}
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

// ── Inline custom search input ──

function CustomSearchInput({ onSearch }: { onSearch: (query: string) => void }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        自定义搜索…
      </button>
    )
  }

  return (
    <input
      className="h-6 w-32 rounded border border-border bg-background px-1.5 text-xs"
      placeholder="输入搜索词…"
      value={value}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) {
          onSearch(value.trim())
          setValue('')
          setOpen(false)
        }
        if (e.key === 'Escape') {
          setOpen(false)
          setValue('')
        }
      }}
      onBlur={() => {
        if (!value.trim()) setOpen(false)
      }}
    />
  )
}

export { AutoImageMatch }
