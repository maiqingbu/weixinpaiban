import React from 'react'

interface ToolSidebarProps {
  tool: string
  onToolChange: (tool: string) => void
}

const tools = [
  { id: 'select', label: '选择', icon: '↖' },
  { id: 'crop', label: '裁剪', icon: '✂' },
  { id: 'rotate', label: '旋转', icon: '↻' },
  { id: 'filter', label: '滤镜', icon: '✨' },
  { id: 'adjust', label: '调整', icon: '🎨' },
  { id: 'text', label: '文字', icon: 'Aa' },
  { id: 'sticker', label: '贴纸', icon: '😀' },
  { id: 'watermark', label: '水印', icon: '💧' },
]

/** 左侧工具栏 — 竖排图标+文字 */
const ToolSidebar: React.FC<ToolSidebarProps> = ({ tool, onToolChange }) => {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2 px-1 bg-[#1e1e1e] border-r border-gray-700 w-[68px] shrink-0">
      {tools.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => onToolChange(t.id)}
          className={`flex flex-col items-center justify-center w-14 h-12 rounded text-[10px] transition-colors ${
            tool === t.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span className="text-base leading-none mb-0.5">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export default ToolSidebar
