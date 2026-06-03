import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { uploadManager, getProviderById } from '@/lib/imageUpload'
import EditorCanvas from './Canvas'
import ToolSidebar from './Toolbar'
import LayersPanel from './LayersPanel'
import TextStyleEditor from './TextStyleEditor'
import CropPanel from './panels/CropPanel'
import RotatePanel from './panels/RotatePanel'
import FilterPanel from './panels/FilterPanel'
import TextPanel from './panels/TextPanel'
import StickerPanel from './panels/StickerPanel'
import WatermarkPanel from './panels/WatermarkPanel'
import AdjustPanel from './panels/AdjustPanel'
import type { ToolType } from '@/lib/imageEditor'

interface ImageEditorModalProps {
  open: boolean
  onClose: () => void
  imageUrl: string
  imagePos: number
  initialTool?: ToolType
}

const MAX_HISTORY = 50

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  open,
  onClose,
  imageUrl,
  imagePos,
  initialTool,
}) => {
  const [tool, setTool] = useState<ToolType>(initialTool || 'select')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [activeObject, setActiveObject] = useState<any>(null)

  const fabricRef = useRef<any>(null)
  const mainImageRef = useRef<any>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const isUndoRedoRef = useRef(false)

  const editorInstance = useAppStore((s) => s.editorInstance)

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  // ── 历史管理 ──
  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || isUndoRedoRef.current) return
    const json = JSON.stringify(canvas.toJSON())
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    }
    historyRef.current.push(json)
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
    setHasUnsavedChanges(true)
  }, [])

  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || historyIndexRef.current <= 0) return
    isUndoRedoRef.current = true
    historyIndexRef.current--
    const json = historyRef.current[historyIndexRef.current]
    canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll()
      isUndoRedoRef.current = false
      canvas.getObjects().forEach((obj: any) => {
        if (obj.data?.type === 'mainImage') mainImageRef.current = obj
      })
    })
  }, [])

  const handleRedo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return
    isUndoRedoRef.current = true
    historyIndexRef.current++
    const json = historyRef.current[historyIndexRef.current]
    canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll()
      isUndoRedoRef.current = false
      canvas.getObjects().forEach((obj: any) => {
        if (obj.data?.type === 'mainImage') mainImageRef.current = obj
      })
    })
  }, [])

  // ── 画布就绪 ──
  const handleCanvasReady = useCallback(
    (canvas: any, _img: any) => {
      const json = JSON.stringify(canvas.toJSON())
      historyRef.current = [json]
      historyIndexRef.current = 0
      canvas.on('object:modified', () => saveHistory())
      canvas.on('object:added', () => setTimeout(() => saveHistory(), 100))
      canvas.on('object:removed', () => setTimeout(() => saveHistory(), 100))
      canvas.on('selection:created', (e: any) => setActiveObject(e.selected?.[0] || null))
      canvas.on('selection:updated', (e: any) => setActiveObject(e.selected?.[0] || null))
      canvas.on('selection:cleared', () => setActiveObject(null))
    },
    [saveHistory]
  )

  // ── 快捷键 ──
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && !e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo() }
      if (isMeta && e.shiftKey && e.key === 'z') { e.preventDefault(); handleRedo() }
      if (isMeta && e.key === 'y') { e.preventDefault(); handleRedo() }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = fabricRef.current
        const active = canvas?.getActiveObject()
        if (active && active.data?.type !== 'mainImage') {
          canvas.remove(active)
          canvas.renderAll()
        }
      }
      if (e.key === 'Escape') {
        if (hasUnsavedChanges) setShowCloseConfirm(true)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleUndo, handleRedo, hasUnsavedChanges, onClose])

  // ── 替换编辑器中的图片 ──
  const replaceImageInEditor = useCallback(
    (newUrl: string) => {
      if (!editorInstance) return false
      const { tr, doc } = editorInstance.state
      if (imagePos > 0 && imagePos < doc.content.size) {
        const node = doc.nodeAt(imagePos)
        if (node && node.type.name === 'image') {
          tr.setNodeMarkup(imagePos, undefined, { ...node.attrs, src: newUrl })
          editorInstance.view.dispatch(tr)
          return true
        }
      }
      let replaced = false
      doc.descendants((node, pos) => {
        if (replaced) return false
        if (node.type.name === 'image' && node.attrs.src === imageUrl) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newUrl })
          replaced = true
          return false
        }
        return true
      })
      if (replaced) { editorInstance.view.dispatch(tr); return true }
      doc.descendants((node, pos) => {
        if (replaced) return false
        if (node.type.name === 'templateBlock' && node.attrs.html?.includes(imageUrl)) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, html: node.attrs.html.replace(imageUrl, newUrl) })
          replaced = true
          return false
        }
        return true
      })
      if (replaced) { editorInstance.view.dispatch(tr); return true }
      return false
    },
    [editorInstance, imageUrl, imagePos]
  )

  // ── 导出 ──
  // 历史 bug：旧实现 canvas.toDataURL + atob + byte 循环全是同步操作。
  //   2000x1500 PNG 实测：toDataURL 184ms + atob+循环 248ms + 灌入编辑器 48ms ≈ 480ms 主线程阻塞
  //   用户的手机照片（4000x3000+）按 4 倍像素（multiplier: 2）算，实际可能卡 2-4 秒
  // 修复：改用 fabric v6 原生 canvas.toBlob 异步导出，multiplier 改 1（4x 像素完全用不到），
  //   立刻关 modal（onClose）让用户看到反应，后台上传到图床异步替换。
  const handleExport = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas) return
    try {
      const origBg = canvas.backgroundColor
      canvas.backgroundColor = 'transparent'
      canvas.renderAll()
      const mainImg = mainImageRef.current
      // ── 异步导出（fabric v6 canvas.toBlob 返回 Promise<Blob | null>，主线程不阻塞）──
      const blob = mainImg
        ? await canvas.toBlob({
            format: 'png',
            multiplier: 1, // 之前是 2，4x 像素用不到
            left: mainImg.getBoundingRect().left,
            top: mainImg.getBoundingRect().top,
            width: mainImg.getBoundingRect().width,
            height: mainImg.getBoundingRect().height,
          })
        : await canvas.toBlob({ format: 'png', multiplier: 1 })
      canvas.backgroundColor = origBg
      canvas.renderAll()
      if (!blob) {
        console.error('[ImageEditor] canvas.toBlob returned null')
        return
      }

      // 用 objectURL 立即替换编辑器图片（极快，比 dataURL 字符串小得多；不阻塞）
      const objectUrl = URL.createObjectURL(blob)
      const replaced = replaceImageInEditor(objectUrl)
      if (!replaced) {
        // 极少数情况找不到图节点：objectUrl 不再有效，
        // 同步转 dataURL 作 fallback（仅这条路径阻塞，但保证图能进编辑器）
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 })
        replaceImageInEditor(dataUrl)
      }
      setHasUnsavedChanges(false)
      // ── 关键：立刻关 modal，用户马上看到反应 ──
      onClose()

      // ── 后台异步上传到图床（不阻塞 UI） ──
      void (async () => {
        try {
          const activeProviderId = await window.api?.imageHostGetSetting?.('active_provider')
          if (!activeProviderId) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          const provider = getProviderById(activeProviderId)
          if (!provider) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          const file = new File([blob], `edited-image-${Date.now()}.png`, { type: 'image/png' })
          const config = (await window.api?.imageHostGetConfig(activeProviderId)) || {}
          const finalUrl = await uploadManager.upload(
            file,
            `edited-${Date.now()}`,
            (f) => provider.upload(f, f.name, config).then((r) => r.url)
          )
          // 上传成功：用真 URL 替换 objectURL
          if (replaceImageInEditor(finalUrl)) {
            URL.revokeObjectURL(objectUrl)
          } else {
            URL.revokeObjectURL(objectUrl)
          }
        } catch (err) {
          console.warn('[ImageEditor] upload failed, keep objectURL:', err)
          URL.revokeObjectURL(objectUrl)
        }
      })()
    } catch (err) {
      console.error('[ImageEditor] export failed:', err)
    }
  }, [replaceImageInEditor, onClose])

  // ── 替换图片 ──
  const handleReplace = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        replaceImageInEditor(reader.result as string)
        setHasUnsavedChanges(false)
        onClose()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [replaceImageInEditor, onClose])

  // ── 关闭确认 ──
  const handleClose = () => { if (hasUnsavedChanges) setShowCloseConfirm(true); else onClose() }
  const confirmClose = () => { setShowCloseConfirm(false); onClose() }
  const cancelClose = () => setShowCloseConfirm(false)

  // ── 裁剪回调 ──
  const handleCropApply = () => {
    const canvas = fabricRef.current
    if (canvas) {
      const mainImg = canvas.getObjects().find((o: any) => o.data?.type === 'mainImage')
      if (mainImg) mainImageRef.current = mainImg
    }
    setTool('select')
    saveHistory()
  }
  const handleCropCancel = () => {
    const canvas = fabricRef.current
    if (canvas) {
      const cropRect = canvas.getObjects().find((o: any) => o.data?.type === 'cropRect')
      if (cropRect) { canvas.remove(cropRect); canvas.renderAll() }
    }
    setTool('select')
  }

  // ── 右侧工具面板 ──
  const renderToolPanel = () => {
    const canvas = fabricRef.current
    const mainImage = mainImageRef.current
    switch (tool) {
      case 'crop': return <CropPanel canvas={canvas} mainImage={mainImage} onApply={handleCropApply} onCancel={handleCropCancel} />
      case 'rotate': return <RotatePanel canvas={canvas} mainImage={mainImage} />
      case 'filter': return <FilterPanel canvas={canvas} mainImage={mainImage} />
      case 'text': return <TextPanel canvas={canvas} />
      case 'sticker': return <StickerPanel canvas={canvas} />
      case 'watermark': return <WatermarkPanel canvas={canvas} mainImage={mainImage} />
      case 'adjust': return <AdjustPanel canvas={canvas} mainImage={mainImage} />
      default: return <div className="flex items-center justify-center h-full text-xs text-gray-500">选择左侧工具开始编辑</div>
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
      {/* 关闭确认 */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-[#2a2a2a] rounded-lg p-6 max-w-sm mx-4 shadow-xl border border-gray-600">
            <h3 className="text-lg font-medium text-white mb-2">确认关闭</h3>
            <p className="text-sm text-gray-300 mb-4">当前有未保存的修改，确定要关闭吗？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={cancelClose} className="px-4 py-2 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">取消</button>
              <button onClick={confirmClose} className="px-4 py-2 rounded text-sm bg-red-600 text-white hover:bg-red-700 transition-colors">确认关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 顶部操作栏 ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-gray-700 shrink-0">
        <span className="text-sm text-gray-300 font-medium">图片编辑器</span>
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={!canUndo} className="flex items-center justify-center h-8 px-2 rounded text-xs text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="撤销 (Ctrl+Z)">↩ 撤销</button>
          <button onClick={handleRedo} disabled={!canRedo} className="flex items-center justify-center h-8 px-2 rounded text-xs text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="重做 (Ctrl+Shift+Z)">↪ 重做</button>
          <div className="w-px h-5 bg-gray-600 mx-1" />
          <button onClick={handleReplace} className="flex items-center justify-center h-8 px-3 rounded text-xs bg-gray-600 text-white hover:bg-gray-500 transition-colors">🔄 替换</button>
          <button onClick={handleExport} className="flex items-center justify-center h-8 px-4 rounded text-xs bg-green-600 text-white font-medium hover:bg-green-700 transition-colors">✓ 完成</button>
          <button onClick={handleClose} className="flex items-center justify-center w-8 h-8 rounded text-gray-300 hover:bg-red-600 hover:text-white transition-colors">✕</button>
        </div>
      </div>

      {/* ── 三栏主体 ── */}
      <div className="flex flex-1 min-h-0">
        {/* 左栏：工具 */}
        <ToolSidebar tool={tool} onToolChange={(t) => setTool(t as ToolType)} />

        {/* 中栏：画布 */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a]">
          {activeObject && (
            <div className="flex justify-center py-1 bg-[#1a1a1a] border-b border-gray-800 shrink-0">
              <TextStyleEditor canvas={fabricRef.current} activeObject={activeObject} />
            </div>
          )}
          <div className="flex-1 relative overflow-hidden">
            <EditorCanvas imageUrl={imageUrl} fabricRef={fabricRef} mainImageRef={mainImageRef} onReady={handleCanvasReady} />
          </div>
        </div>

        {/* 右栏：图层 + 工具选项 */}
        <div className="flex flex-col w-[280px] shrink-0 border-l border-gray-700 bg-[#1e1e1e]">
          {/* 图层 */}
          <div className="h-[200px] border-b border-gray-700 overflow-y-auto shrink-0">
            <LayersPanel canvas={fabricRef.current} />
          </div>
          {/* 工具选项 */}
          <div className="flex-1 overflow-y-auto">
            {renderToolPanel()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageEditorModal
