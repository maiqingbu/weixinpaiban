/**
 * ColumnsContainer React NodeView 组件
 *
 * 交互式分栏容器渲染：
 * - Flex 容器布局，支持 horizontal / vertical 方向
 * - horizontal：列宽拖拽手柄（hover 变蓝，拖拽实时更新，双击恢复等分）
 * - vertical：子列 flex:1 撑满，不显示拖拽手柄
 * - 嵌套深度检测（超过 2 层显示警告）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { getNestingDepth, updateColumnWidths, resetColumnWidths } from './columnsHelpers'

// ============================================================
// 类型定义
// ============================================================

interface ColumnsContainerViewProps {
  node: {
    attrs: {
      layout: string
      widths: number[]
      gap: number
      direction: string
    }
    childCount: number
  }
  updateAttributes: (attrs: Record<string, any>) => void
  editor: Editor
  getPos: () => number
  deleteNode: () => void
}

// ============================================================
// 常量
// ============================================================

/** 最小列宽百分比 */
const MIN_COLUMN_WIDTH = 10

/** 最大嵌套深度 */
const MAX_NESTING_DEPTH = 2

// ============================================================
// 拖拽手柄组件（仅 horizontal 方向）
// ============================================================

interface DragHandleProps {
  leftIndex: number
  widths: number[]
  containerPos: number
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
  onWidthsChange: (widths: number[]) => void
  leftPercent: number
}

function DragHandle({
  leftIndex,
  widths,
  containerPos,
  editor,
  containerRef,
  onWidthsChange,
  leftPercent,
}: DragHandleProps) {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidths = useRef<number[]>([])
  const handleRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      isDragging.current = true
      startX.current = e.clientX
      startWidths.current = [...widths]

      const handle = handleRef.current
      if (handle) {
        handle.setPointerCapture(e.pointerId)
      }

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    },
    [widths]
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging.current || !containerRef.current) return

      const container = containerRef.current
      const containerWidth = container.offsetWidth
      if (containerWidth <= 0) return

      const deltaX = e.clientX - startX.current
      const deltaPercent = (deltaX / containerWidth) * 100

      const newWidths = [...startWidths.current]
      const leftIdx = leftIndex
      const rightIdx = leftIndex + 1

      let newLeft = newWidths[leftIdx] + deltaPercent
      let newRight = newWidths[rightIdx] - deltaPercent

      if (newLeft < MIN_COLUMN_WIDTH) {
        newRight -= MIN_COLUMN_WIDTH - newLeft
        newLeft = MIN_COLUMN_WIDTH
      }
      if (newRight < MIN_COLUMN_WIDTH) {
        newLeft -= MIN_COLUMN_WIDTH - newRight
        newRight = MIN_COLUMN_WIDTH
      }

      if (newLeft >= MIN_COLUMN_WIDTH && newRight >= MIN_COLUMN_WIDTH) {
        newWidths[leftIdx] = Math.round(newLeft * 100) / 100
        newWidths[rightIdx] = Math.round(newRight * 100) / 100

        const sum = newWidths.reduce((a, b) => a + b, 0)
        newWidths[rightIdx] = Math.round((newWidths[rightIdx] + (100 - sum)) * 100) / 100

        onWidthsChange(newWidths)
      }
    },
    [leftIndex, containerRef, onWidthsChange]
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      resetColumnWidths(editor, containerPos)
    },
    [editor, containerPos]
  )

  return (
    <div
      ref={handleRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className="column-drag-handle"
      title="拖拽调整列宽，双击恢复等分"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${leftPercent}%`,
        transform: 'translateX(-50%)',
        width: '12px',
        cursor: 'col-resize',
        backgroundColor: 'transparent',
        transition: 'background-color 0.15s ease',
        zIndex: 10,
        borderRadius: '2px',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(59, 130, 246, 0.5)'
      }}
      onMouseLeave={(e) => {
        if (!isDragging.current) {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
        }
      }}
    />
  )
}

// ============================================================
// 主组件
// ============================================================

export function ColumnsContainerView({
  node,
  editor,
  getPos,
}: ColumnsContainerViewProps) {
  const { layout, widths, gap, direction } = node.attrs
  const containerRef = useRef<HTMLDivElement>(null)
  const [nestingDepth, setNestingDepth] = useState(0)
  const [showRatio, setShowRatio] = useState(false)

  const flexDirection = direction === 'vertical' ? 'column' : 'row'
  const isHorizontal = direction !== 'vertical'

  // 计算嵌套深度
  useEffect(() => {
    const pos = getPos()
    if (pos !== undefined) {
      setNestingDepth(getNestingDepth(editor, pos))
    }
  }, [editor, getPos, node])

  /** 宽度更新回调 */
  const handleWidthsChange = useCallback(
    (newWidths: number[]) => {
      const pos = getPos()
      if (pos !== undefined) {
        updateColumnWidths(editor, pos, newWidths)
      }
    },
    [editor, getPos]
  )

  /** 容器样式 */
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection,
    gap: `${gap}px`,
    margin: '1.5em 0',
    alignItems: 'flex-start',
  }

  /** 比例文本 */
  const ratioText = widths.map((w) => `${Math.round(w)}%`).join(' / ')

  return (
    <NodeViewWrapper className="columns-container-wrapper" style={{ position: 'relative' }}>
      {/* 嵌套深度警告 */}
      {nestingDepth > MAX_NESTING_DEPTH && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '8px',
          }}
        >
          分栏嵌套过深（当前 {nestingDepth} 层），建议不超过 {MAX_NESTING_DEPTH} 层，否则可能影响微信渲染效果。
        </div>
      )}

      {/* 拖拽时显示的比例提示 */}
      {showRatio && isHorizontal && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {ratioText}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          className="columns-container"
          data-columns-container=""
          data-layout={layout}
          data-direction={direction}
          style={containerStyle}
          onMouseEnter={() => setShowRatio(true)}
          onMouseLeave={() => setShowRatio(false)}
        >
          {/* NodeViewContent 使用 display:contents，让 column 子节点直接成为 flex item */}
          <NodeViewContent style={{ display: 'contents' }} />
        </div>

        {/* 拖拽手柄 — 仅 horizontal 方向显示 */}
        {isHorizontal &&
          widths.length > 1 &&
          (() => {
            const gapHalf = gap / 2
            return Array.from({ length: widths.length - 1 }, (_, i) => {
              const left = widths.slice(0, i + 1).reduce((a, b) => a + b, 0) + gapHalf * (2 * i + 1)
              return (
                <DragHandle
                  key={`handle-${i}`}
                  leftIndex={i}
                  widths={widths}
                  containerPos={getPos()}
                  editor={editor}
                  containerRef={containerRef}
                  onWidthsChange={handleWidthsChange}
                  leftPercent={left}
                />
              )
            })
          })()}
      </div>
    </NodeViewWrapper>
  )
}

export default ColumnsContainerView
