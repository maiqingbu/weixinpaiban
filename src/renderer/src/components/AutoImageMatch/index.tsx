import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ImagePlus } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'

// ── Types ──

interface ImageSlot {
  afterBlock: number
  desc: string
  query: string
  images: string[]       // base64 data URLs
  selectedIndex: number  // -1 = none selected
  loading: boolean
}

interface AiImageResult {
  afterBlock: number
  desc: string
  query: string
}

// ── AI prompt ──

const AUTO_MATCH_PROMPT = `你是一位资深图片编辑。分析以下文章，找到适合插入配图的位置。文章每段前有 [数字] 标记。

输出严格 JSON（不要 markdown 代码块）：
{"images": [{"afterBlock": 数字, "desc": "配图描述", "query": "搜索关键词"}, ...]}

规则：
- afterBlock 是该段落的编号，配图插入在该段落之后
- query 是 2-5 个中文词，面向百度图片搜索。要具体、场景化，能精准搜到适合公众号排版的图片
  - 正确示例："黄山日出云海"、"老人公园晨练太极拳"、"冬季萝卜炖排骨"
  - 错误示例："sunrise"、"tai chi"、"radish"
- desc 是简短说明为何在此配图
- 每 2-4 段配 1 张图，忌过密
- 文章开头处优先配图，核心观点/场景处配图
- 输出 2-5 张配图建议
- 仅输出 JSON`

// ── Props ──

interface AutoImageMatchProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

// ── Helpers ──

function getIndexedBlocks(editor: Editor | null): { text: string; blocks: { pos: number; nodeSize: number }[] } | null {
  if (!editor) return null

  const blocks: { pos: number; nodeSize: number }[] = []
  const lines: string[] = []
  let idx = 0

  editor.state.doc.descendants((node, pos) => {
    if (node.isBlock && node.type.name !== 'image' && node.textContent.trim()) {
      blocks.push({ pos, nodeSize: node.nodeSize })
      const prefix = node.type.name === 'heading' ? '# ' : ''
      const snippet = node.textContent.trim().slice(0, 200)
      lines.push(`[${idx}] ${prefix}${snippet}`)
      idx++
    }
  })

  return { text: lines.join('\n'), blocks }
}

function parseAiResponse(text: string): AiImageResult[] | null {
  // Extract JSON
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

  return parsed.images
    .filter((img: any) => typeof img.afterBlock === 'number' && img.query)
}

// ── Component ──

function AutoImageMatch({ editor, open, onClose }: AutoImageMatchProps): React.JSX.Element | null {
  const [phase, setPhase] = useState<'analyzing' | 'selecting' | 'inserting' | 'done'>('analyzing')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<ImageSlot[]>([])
  const [insertCount, setInsertCount] = useState(0)
  const startedRef = useRef(false)
  const blocksRef = useRef<{ pos: number; nodeSize: number }[]>([])

  // Reset on open/close
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true
      runAnalysis()
    }
    if (!open) {
      startedRef.current = false
      setPhase('analyzing')
      setError('')
      setStatusMsg('')
      setSlots([])
      setInsertCount(0)
    }
  }, [open])

  // ── Phase 1: AI analysis (runs once, results cached in slots state) ──

  const runAnalysis = async () => {
    if (!editor) return

    const indexed = getIndexedBlocks(editor)
    if (!indexed || indexed.blocks.length < 3) {
      setError('文章内容太少，至少需要 3 段文字才能智能配图')
      return
    }
    blocksRef.current = indexed.blocks

    setPhase('analyzing')
    setStatusMsg('AI 正在分析文章，识别配图位置…')
    setError('')

    // Check AI config
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
        temperature: 0.3,
      })

      if (!res.text?.trim()) {
        setError('AI 返回了空响应，请检查 AI 服务配置后重试')
        return
      }

      const results = parseAiResponse(res.text)
      if (!results || results.length === 0) {
        setError('未能在文章中找到合适的配图位置，请尝试内容更丰富的文章')
        return
      }

      const valid = results
        .filter((r) => r.afterBlock < indexed.blocks.length)
        .slice(0, 5)

      if (valid.length === 0) {
        setError('未能在文章中找到合适的配图位置')
        return
      }

      // Initialize slots — all loading
      const initialSlots: ImageSlot[] = valid.map((r) => ({
        afterBlock: r.afterBlock,
        desc: r.desc,
        query: r.query,
        images: [],
        selectedIndex: -1,
        loading: true,
      }))

      setSlots(initialSlots)
      setPhase('selecting')

      // Fetch images for all slots
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
      const images = await fetchImagesForQuery(slot.query)
      setSlots((prev) =>
        prev.map((s) =>
          s.afterBlock === slot.afterBlock ? { ...s, images, loading: false } : s
        )
      )
    }
  }

  // ── Fetch 4 images for a query ──

  const fetchImagesForQuery = async (query: string): Promise<string[]> => {
    try {
      const seed = Math.floor(Math.random() * 100)
      const res = await window.api.imageSuggestions(query, seed)
      return res.images?.slice(0, 4) || []
    } catch {
      return []
    }
  }

  // ── Re-fetch images for a single slot (doesn't re-analyze) ──

  const refreshSlot = async (afterBlock: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock ? { ...s, images: [], loading: true, selectedIndex: -1 } : s
      )
    )

    const slot = slots.find((s) => s.afterBlock === afterBlock)
    if (!slot) return

    const images = await fetchImagesForQuery(slot.query)
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock ? { ...s, images, loading: false } : s
      )
    )
  }

  // ── Custom query re-search for a slot ──

  const searchCustomQuery = async (afterBlock: number, customQuery: string) => {
    if (!customQuery.trim()) return

    // Update the query in the slot
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock
          ? { ...s, query: customQuery.trim(), images: [], loading: true, selectedIndex: -1 }
          : s
      )
    )

    const images = await fetchImagesForQuery(customQuery.trim())
    setSlots((prev) =>
      prev.map((s) =>
        s.afterBlock === afterBlock ? { ...s, images, loading: false } : s
      )
    )
  }

  // ── Select an image in a slot ──

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

    // Insert bottom-up (single chain = single undo step)
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
      // Warn before closing with selections
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
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-semibold">智能配图</h2>
          </div>
          {phase !== 'inserting' && (
            <button onClick={handleClose} className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Analyzing spinner */}
          {phase === 'analyzing' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">{statusMsg}</p>
            </div>
          )}

          {/* Error */}
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

          {/* Done */}
          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium">已插入 {insertCount} 张配图</p>
              <p className="text-xs text-muted-foreground">不满意可 Ctrl+Z 一键撤销</p>
              <Button variant="outline" size="sm" onClick={onClose}>完成</Button>
            </div>
          )}

          {/* Selecting — image grids */}
          {(phase === 'selecting' || phase === 'inserting') && slots.length > 0 && (
            <div className="space-y-6">
              {slots.map((slot, idx) => (
                <div key={slot.afterBlock}>
                  {/* Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-medium">{slot.desc}</h3>
                    <span className="text-xs text-muted-foreground">({slot.query})</span>
                  </div>

                  {/* Loading */}
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
                      {/* Image grid */}
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

                      {/* Search controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => refreshSlot(slot.afterBlock)}
                        >
                          <RefreshCw className="h-3 w-3" />
                          换一批
                        </button>
                        <span className="text-xs text-muted-foreground">·</span>
                        <CustomSearchInput
                          onSearch={(q) => searchCustomQuery(slot.afterBlock, q)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <AlertTriangle className="h-3 w-3" />
                      图片加载失败
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

        {/* Footer — confirm bar */}
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
