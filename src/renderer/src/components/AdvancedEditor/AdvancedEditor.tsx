import { useEffect, useRef, useCallback, useState } from 'react'
import EmailEditor from 'react-email-editor'
import { useAppStore } from '@/store/useAppStore'
import type { AdvancedEditorProps } from './types'

/**
 * 清理 Unlayer iframe 的 localStorage 缓存。
 * Unlayer 会自行缓存编辑器状态到 localStorage（key 以 'ue:' 或 'editor_' 开头），
 * 如果缓存数据损坏，Unlayer 在初始化渲染时就会崩溃。
 * 在编辑器挂载前调用此函数可以防止加载损坏的缓存。
 */
function clearUnlayerCache(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('ue:') || key.startsWith('editor_') || key.startsWith('unlayer'))) {
        keysToRemove.push(key)
      }
    }
    if (keysToRemove.length > 0) {
      console.log(`[AdvancedEditor] Clearing ${keysToRemove.length} Unlayer cache entries from localStorage`)
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    }
  } catch {
    // localStorage 可能不可用，忽略
  }
}

/**
 * 深层递归校验 Unlayer design JSON。
 * 不仅检查顶层 body.rows[].columns[].contents，
 * 还递归检查 contents 内嵌套的 column 容器（type='column' 的元素有自己的 columns）。
 * 任何层级的数组缺失都可能导致 Unlayer 内部 .reduce() 崩溃。
 */
function isValidDesign(d: any, depth = 0): d is Record<string, any> {
  if (depth > 10) return false // 防止无限递归
  if (!d || typeof d !== 'object') return false
  const body = d.body
  if (!body || typeof body !== 'object') return false
  if (!Array.isArray(body.rows)) return false

  for (const row of body.rows) {
    if (!row || !Array.isArray(row.columns)) return false
    for (const col of row.columns) {
      if (!col || !Array.isArray(col.contents)) return false
      // 递归检查 contents 内的嵌套 column 容器
      for (const item of col.contents) {
        if (item && typeof item === 'object') {
          // column 容器有嵌套的 columns 数组，必须也是合法的
          if (item.type === 'column' && item.columns !== undefined) {
            if (!Array.isArray(item.columns)) return false
            for (const nestedCol of item.columns) {
              if (!nestedCol || !Array.isArray(nestedCol.contents)) return false
            }
          }
        }
      }
    }
  }
  return true
}

/**
 * AdvancedEditor — 基于 Unlayer 可视化编辑器
 *
 * displayMode='web' 用于网页/公众号文章编辑（非邮件）
 *
 * 设计数据策略：
 *   - 每次编辑变更时，通过 onDesignChange 保存 design JSON 到 store
 *   - 切换文章时，props 变化触发重新加载
 *   - 有 design → 直接 loadDesign（无损恢复）
 *   - 无 design + 有 HTML → 用 html type 加载（降级方案）
 */
// 组件挂载前清理 Unlayer 缓存，防止损坏缓存导致初始化崩溃
clearUnlayerCache()

function AdvancedEditor({
  initialContent,
  onChange,
  design,
  onDesignChange
}: AdvancedEditorProps): React.JSX.Element {
  const emailEditorRef = useRef<any>(null)
  const lastLoadedRef = useRef<string | null>(null)
  const isReadyRef = useRef(false)
  const skipNextUpdateRef = useRef(false)
  const loadFailedRef = useRef(false)
  const [showImageHint, setShowImageHint] = useState(true)

  // 编辑器加载完成
  const handleLoad = useCallback(() => {
    console.log('[AdvancedEditor] Unlayer loaded')
  }, [])

  // 安全调用 loadDesign，失败时自动降级
  const safeLoadDesign = useCallback((editor: any, d: any): boolean => {
    try {
      editor.loadDesign(d)
      return true
    } catch (err) {
      console.error('[AdvancedEditor] loadDesign failed:', err)
      return false
    }
  }, [])

  // 加载内容到编辑器的通用方法
  const loadContent = useCallback((editor: any, d: any, html: string | undefined) => {
    // 验证 design 结构完整性，防止 Unlayer 崩溃
    if (d && isValidDesign(d)) {
      // 有 design JSON — 无损加载
      if (safeLoadDesign(editor, d)) {
        lastLoadedRef.current = 'design'
        loadFailedRef.current = false
      } else {
        // loadDesign 失败 — 清除损坏的 design，降级到 HTML
        loadFailedRef.current = true
        useAppStore.getState().setAdvancedEditorDesign(null)
        if (html) {
          loadContent(editor, null, html)
        }
      }
    } else if (d && !isValidDesign(d)) {
      // design 结构损坏 — 清除并降级到 HTML
      console.warn('[AdvancedEditor] Invalid design structure detected, clearing and falling back to HTML')
      useAppStore.getState().setAdvancedEditorDesign(null)
      if (html) {
        loadContent(editor, null, html)
      }
    } else if (html) {
      // 只有 HTML — 降级加载
      safeLoadDesign(editor, {
        body: {
          rows: [
            {
              columns: [
                {
                  contents: [
                    {
                      type: 'html',
                      values: { html }
                    }
                  ]
                }
              ]
            }
          ]
        }
      })
      lastLoadedRef.current = html
      loadFailedRef.current = false
    } else {
      // 无 design、无 HTML — 不调用 loadDesign，
      // 让 Unlayer 使用自身的默认空状态（避免加载空 contents 触发内部崩溃）
      console.log('[AdvancedEditor] No content to load, using Unlayer default state')
      lastLoadedRef.current = ''
      loadFailedRef.current = false
    }
  }, [safeLoadDesign])

  // 编辑器就绪 — 加载初始内容
  const handleReady = useCallback(() => {
    console.log('[AdvancedEditor] Unlayer ready')
    isReadyRef.current = true
    const editor = emailEditorRef.current?.editor
    if (!editor) return

    loadContent(editor, design, initialContent)

    // 监听设计变更 — 导出 HTML + 保存 design
    const handler = () => {
      if (skipNextUpdateRef.current) {
        skipNextUpdateRef.current = false
        return
      }
      setTimeout(() => {
        editor.exportHtml((data: { design: any; html: string }) => {
          onChange(data.html)
          onDesignChange?.(data.design)
        })
      }, 100)
    }

    // 监听图片选择事件 — 点击图片时打开文件选择器
    const imageSelectHandler = () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          const url = `data:${file.type};base64,${base64}`

          // 获取当前选中的图片组件并更新 src
          editor.applyCommand('image:src', url)
        }
        reader.readAsArrayBuffer(file)
      }
      input.click()
    }

    editor.addEventListener('design:updated', handler)
    editor.addEventListener('image:select', imageSelectHandler)
    return () => {
      editor.removeEventListener('design:updated', handler)
      editor.removeEventListener('image:select', imageSelectHandler)
    }
  }, [design, initialContent, onChange, onDesignChange, loadContent])

  // props 变化（文章切换）→ 重新加载内容
  useEffect(() => {
    const editor = emailEditorRef.current?.editor
    if (!editor || !isReadyRef.current) return

    // 判断是否需要重新加载
    // 当 design 有效且和上次不同，或者 initialContent 有变化时重新加载
    // 注意：initialContent 为空串也视为需要加载（文章切换时清空场景）
    const isDesignChanged = design && lastLoadedRef.current !== 'design'
    const isContentChanged = !design && (
      (initialContent !== lastLoadedRef.current) ||
      (initialContent === '' && lastLoadedRef.current !== '')
    )

    if (isDesignChanged || isContentChanged) {
      skipNextUpdateRef.current = true
      loadContent(editor, design, initialContent || undefined)
    }
  }, [design, initialContent, loadContent])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 图片编辑提示 */}
      {showImageHint && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 4,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>图片操作：单击选中图片 → 右侧属性面板修改链接或上传</span>
          <button
            onClick={() => setShowImageHint(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}
      <EmailEditor
        ref={emailEditorRef}
        onLoad={handleLoad}
        onReady={handleReady}
        options={{
          displayMode: 'web',
          locale: 'zh-CN',
          features: {
            preview: true,
            imageEditor: true
          },
          tools: {
            image: {
              position: 1
            }
          }
        }}
        style={{ width: '100%', height: '100%', minHeight: 500, border: 'none' }}
      />
    </div>
  )
}

export { AdvancedEditor }
