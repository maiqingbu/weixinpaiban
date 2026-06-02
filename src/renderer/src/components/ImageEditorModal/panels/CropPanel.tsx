import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Rect, FabricImage, Path as FabricPath } from 'fabric'
import { CROP_RATIOS } from '@/lib/imageEditor'

interface CropPanelProps {
  canvas: any
  mainImage: any
  onApply: () => void
  onCancel: () => void
}

/** 获取图片在画布上的包围盒（左上角坐标 + 宽高） */
function getImageBounds(img: any) {
  const w = (img.width || 0) * (img.scaleX || 1)
  const h = (img.height || 0) * (img.scaleY || 1)
  const cx = img.left || 0
  const cy = img.top || 0
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h }
}

/**
 * 用「图片外框 - 裁剪内框」的路径实现暗色遮罩，
 * 视觉效果：裁剪区内清晰，裁剪区外半透明黑色。
 */
function createMaskPath(imgBounds: { left: number; top: number; width: number; height: number }, crop: { left: number; top: number; width: number; height: number }) {
  const { left: il, top: it, width: iw, height: ih } = imgBounds
  const { left: cl, top: ct, width: cw, height: ch } = crop
  // 外框(顺时针) + 内框(逆时针) = evenodd 挖洞
  return `M ${il} ${it} L ${il + iw} ${it} L ${il + iw} ${it + ih} L ${il} ${it + ih} Z ` +
         `M ${cl} ${ct} L ${cl} ${ct + ch} L ${cl + cw} ${ct + ch} L ${cl + cw} ${ct} Z`
}

const CropPanel: React.FC<CropPanelProps> = ({ canvas, mainImage, onApply, onCancel }) => {
  const [selectedRatio, setSelectedRatio] = useState('free')
  const cropRectRef = useRef<any>(null)
  const maskRef = useRef<any>(null)
  const gridLinesRef = useRef<any[]>([])
  const guidesRef = useRef<any[]>([])
  const isSyncing = useRef(false)
  // 旋转裁剪框时跳过比例约束（仅做边界限制）
  const skipRatioRef = useRef(false)

  // ── 创建裁剪 UI ──
  const createCropUI = useCallback(() => {
    if (!canvas || !mainImage) return

    // 清理旧元素
    const cleanup = () => {
      for (const obj of canvas.getObjects().filter((o: any) => o.data?.type?.startsWith?.('crop'))) {
        canvas.remove(obj)
      }
      gridLinesRef.current = []
      guidesRef.current = []
      maskRef.current = null
      cropRectRef.current = null
    }
    cleanup()

    const imgBounds = getImageBounds(mainImage)
    const ratioObj = CROP_RATIOS.find((r) => r.id === selectedRatio)
    const ratio = ratioObj?.ratio ?? undefined

    // 计算裁剪框初始大小（图片 80%，保持比例）
    let cw = imgBounds.width * 0.8
    let ch = imgBounds.height * 0.8
    if (ratio) {
      if (cw / ch > ratio) cw = ch * ratio
      else ch = cw / ratio
    }
    cw = Math.round(cw)
    ch = Math.round(ch)

    const cl = Math.round(imgBounds.left + (imgBounds.width - cw) / 2)
    const ct = Math.round(imgBounds.top + (imgBounds.height - ch) / 2)

    // ── 暗色遮罩 ──
    const mask = new FabricPath(createMaskPath(imgBounds, { left: cl, top: ct, width: cw, height: ch }), {
      fill: 'rgba(0, 0, 0, 0.55)',
      fillRule: 'evenodd',
      selectable: false,
      evented: false,
      data: { type: 'cropMask' },
    })
    canvas.add(mask)
    maskRef.current = mask

    // ── 三分线 ──
    const lines: any[] = []
    for (let i = 1; i <= 2; i++) {
      const vl = new Rect({
        left: cl + (cw / 3) * i,
        top: ct,
        width: 0.5,
        height: ch,
        fill: 'rgba(255,255,255,0.35)',
        selectable: false,
        evented: false,
        data: { type: 'cropGrid' },
      })
      const hl = new Rect({
        left: cl,
        top: ct + (ch / 3) * i,
        width: cw,
        height: 0.5,
        fill: 'rgba(255,255,255,0.35)',
        selectable: false,
        evented: false,
        data: { type: 'cropGrid' },
      })
      canvas.add(vl, hl)
      lines.push(vl, hl)
    }
    gridLinesRef.current = lines

    // ── 四条白色边线（裁剪框轮廓） ──
    const borders: any[] = []
    const borderSpecs = [
      { left: cl, top: ct, width: cw, height: 1.5 },
      { left: cl, top: ct + ch - 1.5, width: cw, height: 1.5 },
      { left: cl, top: ct, width: 1.5, height: ch },
      { left: cl + cw - 1.5, top: ct, width: 1.5, height: ch },
    ]
    for (const spec of borderSpecs) {
      const line = new Rect({
        ...spec,
        fill: 'rgba(255,255,255,0.8)',
        selectable: false,
        evented: false,
        data: { type: 'cropGrid' },
      })
      canvas.add(line)
      borders.push(line)
    }
    gridLinesRef.current = [...lines, ...borders]

    // ── 裁剪框（不可见，仅用于交互） ──
    const cropRect = new Rect({
      left: cl,
      top: ct,
      width: cw,
      height: ch,
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: false,
      lockRotation: true,
      cornerColor: '#3b82f6',
      cornerStrokeColor: '#ffffff',
      cornerSize: 10,
      cornerStyle: 'circle',
      transparentCorners: false,
      ...({ mt: { visible: false }, mb: { visible: false }, ml: { visible: false }, mr: { visible: false } } as any),
    })
    ;(cropRect as any).data = { type: 'cropRect' }

    canvas.add(cropRect)
    canvas.setActiveObject(cropRect)
    cropRectRef.current = cropRect

    // ── 辅助函数：同步遮罩和网格到裁剪框位置 ──
    const syncOverlays = () => {
      if (isSyncing.current) return
      isSyncing.current = true

      const img = getImageBounds(mainImage)
      const left = cropRect.left ?? cl
      const top = cropRect.top ?? ct
      const w = (cropRect.width ?? cw) * (cropRect.scaleX ?? 1)
      const h = (cropRect.height ?? ch) * (cropRect.scaleY ?? 1)

      // 重建遮罩路径
      if (maskRef.current) {
        canvas.remove(maskRef.current)
        const newMask = new FabricPath(createMaskPath(img, { left, top, width: w, height: h }), {
          fill: 'rgba(0, 0, 0, 0.55)',
          fillRule: 'evenodd',
          selectable: false,
          evented: false,
          data: { type: 'cropMask' },
        })
        canvas.add(newMask)
        canvas.sendObjectToBack(newMask)
        maskRef.current = newMask
      }

      // 更新三分线 + 边框
      const grid = gridLinesRef.current
      if (grid.length >= 8) {
        grid[0].set({ left: left + w / 3, top, height: h })
        grid[2].set({ left: left + (w * 2) / 3, top, height: h })
        grid[1].set({ left, top: top + h / 3, width: w })
        grid[3].set({ left, top: top + (h * 2) / 3, width: w })
        grid[4].set({ left, top, width: w })
        grid[5].set({ left, top: top + h - 1.5, width: w })
        grid[6].set({ left, top, height: h })
        grid[7].set({ left: left + w - 1.5, top, height: h })
        for (const l of grid) l.setCoords()
      }

      isSyncing.current = false
    }

    // ── 裁剪框事件：拖拽/缩放时同步遮罩 ──
    cropRect.on('moving', syncOverlays)
    cropRect.on('scaling', syncOverlays)

    // ── 比例约束 + 边界约束 ──
    const constrainCrop = () => {
      const img = getImageBounds(mainImage)
      const left = cropRect.left ?? cl
      const top = cropRect.top ?? ct
      let w = (cropRect.width ?? cw) * (cropRect.scaleX ?? 1)
      let h = (cropRect.height ?? ch) * (cropRect.scaleY ?? 1)

      w = Math.max(w, 20)
      h = Math.max(h, 20)

      // 比例约束（旋转裁剪框时跳过）
      if (ratio && !skipRatioRef.current) {
        if (w / h > ratio) w = h * ratio
        else h = w / ratio
      }
      skipRatioRef.current = false

      // 边界约束（不允许超出图片）
      const clampedLeft = Math.max(img.left, Math.min(left, img.left + img.width - w))
      const clampedTop = Math.max(img.top, Math.min(top, img.top + img.height - h))

      if (Math.abs(w - (cropRect.width ?? cw) * (cropRect.scaleX ?? 1)) > 1 ||
          Math.abs(h - (cropRect.height ?? ch) * (cropRect.scaleY ?? 1)) > 1) {
        cropRect.set({ scaleX: 1, scaleY: 1, width: w, height: h })
      }
      cropRect.set({ left: clampedLeft, top: clampedTop })
      cropRect.setCoords()
      syncOverlays()
    }

    cropRect.on('modified', constrainCrop)

    canvas.renderAll()
  }, [canvas, mainImage, selectedRatio])

  // ── 挂载/卸载 ──
  useEffect(() => {
    if (canvas && mainImage) createCropUI()
    return () => {
      if (canvas) {
        for (const obj of canvas.getObjects().filter((o: any) => o.data?.type?.startsWith?.('crop'))) {
          canvas.remove(obj)
        }
        canvas.renderAll()
      }
    }
  }, [canvas, mainImage, createCropUI])

  // ── 确认裁剪 ──
  const handleApply = useCallback(() => {
    if (!canvas || !mainImage || !cropRectRef.current) return

    const cropRect = cropRectRef.current
    const imgBounds = getImageBounds(mainImage)

    const cropLeft = cropRect.left ?? 0
    const cropTop = cropRect.top ?? 0
    const cropW = (cropRect.width ?? 0) * (cropRect.scaleX ?? 1)
    const cropH = (cropRect.height ?? 0) * (cropRect.scaleY ?? 1)

    // 移除所有裁剪 UI
    for (const obj of canvas.getObjects().filter((o: any) => o.data?.type?.startsWith?.('crop'))) {
      canvas.remove(obj)
    }
    gridLinesRef.current = []
    guidesRef.current = []
    maskRef.current = null
    cropRectRef.current = null
    canvas.renderAll()

    const m = 2

    try {
      const dataUrl = canvas.toDataURL({
        format: 'png',
        left: imgBounds.left,
        top: imgBounds.top,
        width: imgBounds.width,
        height: imgBounds.height,
        multiplier: m,
      })

      const img = new Image()
      img.onload = () => {
        const outCanvas = document.createElement('canvas')
        const sx = Math.round((cropLeft - imgBounds.left) * m)
        const sy = Math.round((cropTop - imgBounds.top) * m)
        const sw = Math.round(cropW * m)
        const sh = Math.round(cropH * m)

        outCanvas.width = sw
        outCanvas.height = sh
        const ctx = outCanvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

        const croppedUrl = outCanvas.toDataURL('image/png')
        FabricImage.fromURL(croppedUrl).then((newImg) => {
          const cw = canvas.getWidth()
          const ch = canvas.getHeight()
          const scale = Math.min((cw * 0.9) / (newImg.width || 1), (ch * 0.9) / (newImg.height || 1), 1)

          newImg.set({
            originX: 'center', originY: 'center',
            scaleX: scale, scaleY: scale,
            left: cw / 2, top: ch / 2,
            selectable: false, evented: false,
          })
          ;(newImg as any).data = { type: 'mainImage' }

          canvas.remove(mainImage)
          canvas.add(newImg)
          canvas.renderAll()
          onApply()
        }).catch((e: any) => console.error('[CropPanel] fromURL failed:', e))
      }
      img.onerror = () => console.error('[CropPanel] image load failed')
      img.src = dataUrl
    } catch (e) {
      console.error('[CropPanel] crop failed:', e)
    }
  }, [canvas, mainImage, onApply])

  // ── 旋转裁剪框 90°（跳过比例约束，仅做边界限制） ──
  const handleRotateCrop = useCallback(() => {
    const rect = cropRectRef.current
    if (!rect || !mainImage) return
    const w = rect.width
    const h = rect.height
    rect.set({ width: h, height: w })
    rect.setCoords()

    // 边界约束（不重新应用比例）
    const img = getImageBounds(mainImage)
    const clampedLeft = Math.max(img.left, Math.min(rect.left ?? 0, img.left + img.width - h))
    const clampedTop = Math.max(img.top, Math.min(rect.top ?? 0, img.top + img.height - w))
    rect.set({ left: clampedLeft, top: clampedTop })
    rect.setCoords()

    // 标记跳过比例约束，然后触发同步
    skipRatioRef.current = true
    rect.fire('modified')
    canvas?.renderAll()
  }, [canvas, mainImage])

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium text-gray-200 mb-2">裁剪比例</div>
      <div className="flex flex-wrap gap-1.5">
        {CROP_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            onClick={() => setSelectedRatio(ratio.id)}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              selectedRatio === ratio.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {ratio.name}
          </button>
        ))}
      </div>

      <button
        onClick={handleRotateCrop}
        className="w-full py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      >
        旋转裁剪框 90°
      </button>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleApply}
          className="flex-1 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          确认裁剪
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}

export default CropPanel
