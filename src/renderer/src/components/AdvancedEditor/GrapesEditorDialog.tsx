import { useEffect, useRef, useState, useCallback } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import './grapes-custom.css'

interface GrapesEditorDialogProps {
  open: boolean
  onClose: () => void
  initialContent: string
  onSave: (html: string) => void
}

function GrapesEditorDialog({ open, onClose, initialContent, onSave }: GrapesEditorDialogProps): React.JSX.Element | null {
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 40, y: 40 })
  const [size, setSize] = useState({ width: 1000, height: 650 })
  const [saved, setSaved] = useState(false)
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 })
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startW: 0, startH: 0 })

  // 初始化 GrapesJS
  useEffect(() => {
    if (!open || !containerRef.current) return

    const timer = setTimeout(() => {
      if (!containerRef.current || editorRef.current) return

      const editor = grapesjs.init({
        container: containerRef.current,
        height: '100%',
        width: 'auto',
        storageManager: false,
        showOffsets: true,
        showDevices: false,
        panels: {
          defaults: []
        },
        deviceManager: {
          devices: [
            { name: '桌面', width: '' },
            { name: '手机', width: '375px' },
          ],
        },
        canvas: {
          styles: [],
        },
        blockManager: {
          appendTo: '#blocks-container',
        },
        styleManager: {
          appendTo: '#styles-container',
          sectors: [
            {
              name: '布局',
              open: true,
              buildProps: ['display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'padding', 'margin'],
              properties: [
                { name: 'display', list: [{ value: 'block', name: '块级' }, { value: 'flex', name: '弹性' }, { value: 'grid', name: '网格' }, { value: 'inline', name: '行内' }] },
                { name: 'flex-direction', list: [{ value: 'row', name: '水平' }, { value: 'column', name: '垂直' }] },
                { name: 'justify-content', list: [{ value: 'flex-start', name: '左对齐' }, { value: 'center', name: '居中' }, { value: 'flex-end', name: '右对齐' }, { value: 'space-between', name: '两端对齐' }] },
                { name: 'align-items', list: [{ value: 'flex-start', name: '顶部' }, { value: 'center', name: '居中' }, { value: 'flex-end', name: '底部' }, { value: 'stretch', name: '拉伸' }] },
              ],
            },
            {
              name: '尺寸',
              open: false,
              buildProps: ['width', 'height', 'max-width', 'min-height'],
            },
            {
              name: '排版',
              open: false,
              buildProps: ['font-family', 'font-size', 'font-weight', 'color', 'line-height', 'text-align', 'letter-spacing'],
              properties: [
                { name: 'text-align', list: [{ value: 'left', name: '左对齐' }, { value: 'center', name: '居中' }, { value: 'right', name: '右对齐' }, { value: 'justify', name: '两端对齐' }] },
                { name: 'font-weight', list: [{ value: '400', name: '正常' }, { value: '500', name: '中等' }, { value: '600', name: '半粗' }, { value: '700', name: '粗体' }] },
              ],
            },
            {
              name: '背景',
              open: false,
              buildProps: ['background-color', 'background-image', 'border-radius', 'box-shadow'],
            },
            {
              name: '边框',
              open: false,
              buildProps: ['border', 'border-width', 'border-style', 'border-color'],
              properties: [
                { name: 'border-style', list: [{ value: 'solid', name: '实线' }, { value: 'dashed', name: '虚线' }, { value: 'dotted', name: '点线' }, { value: 'none', name: '无' }] },
              ],
            },
          ],
        },
        layerManager: {
          appendTo: '#layers-container',
        },
        // 中文化
        i18n: {
          locale: 'zh',
          localeFallback: 'en',
          messages: {
            zh: {
              // 设备管理器
              'deviceManager.desktop': '桌面',
              'deviceManager.mobile': '手机',
              'deviceManager.tablet': '平板',
              // 图层管理器
              'layerManager.layer': '图层',
              'layerManager.layers': '图层',
              'layerManager.noLayers': '暂无图层',
              // 组件块
              'blockManager.labels.container': '容器',
              'blockManager.labels.text': '文本',
              'blockManager.labels.image': '图片',
              'blockManager.labels.heading': '标题',
              'blockManager.labels.link': '链接',
              'blockManager.labels.divider': '分割线',
              'blockManager.labels.quote': '引用',
              'blockManager.labels.button': '按钮',
              'blockManager.labels.section': '区块',
              'blockManager.labels.row': '行',
              'blockManager.labels.column': '列',
              'blockManager.labels.grid': '网格',
              'blockManager.labels.list': '列表',
              'blockManager.labels.listItem': '列表项',
              'blockManager.labels.map': '地图',
              'blockManager.labels.video': '视频',
              'blockManager.labels.table': '表格',
              // 样式管理器 - 分区
              'styleManager.sectors.layout': '布局',
              'styleManager.sectors.typography': '排版',
              'styleManager.sectors.size': '尺寸',
              'styleManager.sectors.background': '背景',
              'styleManager.sectors.border': '边框',
              'styleManager.sectors.extra': '其他',
              'styleManager.sectors.decorations': '装饰',
              'styleManager.sectors.flex': '弹性布局',
              'styleManager.sectors.dimension': '尺寸',
              'styleManager.sectors.position': '位置',
              'styleManager.sectors.transforms': '变换',
              'styleManager.sectors.transitions': '过渡',
              'styleManager.sectors.effects': '效果',
              // 样式管理器 - 属性名
              'styleManager.properties.display': '显示',
              'styleManager.properties.flex-direction': '方向',
              'styleManager.properties.flex-wrap': '换行',
              'styleManager.properties.justify-content': '水平对齐',
              'styleManager.properties.align-items': '垂直对齐',
              'styleManager.properties.align-content': '内容对齐',
              'styleManager.properties.gap': '间距',
              'styleManager.properties.padding': '内边距',
              'styleManager.properties.margin': '外边距',
              'styleManager.properties.width': '宽度',
              'styleManager.properties.height': '高度',
              'styleManager.properties.max-width': '最大宽度',
              'styleManager.properties.max-height': '最大高度',
              'styleManager.properties.min-width': '最小宽度',
              'styleManager.properties.min-height': '最小高度',
              'styleManager.properties.overflow': '溢出',
              'styleManager.properties.font-family': '字体',
              'styleManager.properties.font-size': '字号',
              'styleManager.properties.font-weight': '字重',
              'styleManager.properties.font-style': '字体样式',
              'styleManager.properties.color': '颜色',
              'styleManager.properties.line-height': '行高',
              'styleManager.properties.text-align': '对齐',
              'styleManager.properties.text-decoration': '装饰',
              'styleManager.properties.text-shadow': '文字阴影',
              'styleManager.properties.letter-spacing': '字间距',
              'styleManager.properties.word-spacing': '词间距',
              'styleManager.properties.background': '背景',
              'styleManager.properties.background-color': '背景色',
              'styleManager.properties.background-image': '背景图',
              'styleManager.properties.background-size': '背景尺寸',
              'styleManager.properties.background-position': '背景位置',
              'styleManager.properties.background-repeat': '背景重复',
              'styleManager.properties.border': '边框',
              'styleManager.properties.border-width': '边框宽度',
              'styleManager.properties.border-style': '边框样式',
              'styleManager.properties.border-color': '边框颜色',
              'styleManager.properties.border-radius': '圆角',
              'styleManager.properties.border-top': '上边框',
              'styleManager.properties.border-right': '右边框',
              'styleManager.properties.border-bottom': '下边框',
              'styleManager.properties.border-left': '左边框',
              'styleManager.properties.box-shadow': '阴影',
              'styleManager.properties.opacity': '不透明度',
              'styleManager.properties.cursor': '光标',
              'styleManager.properties.position': '定位',
              'styleManager.properties.top': '上',
              'styleManager.properties.right': '右',
              'styleManager.properties.bottom': '下',
              'styleManager.properties.left': '左',
              'styleManager.properties.z-index': '层级',
              'styleManager.properties.float': '浮动',
              'styleManager.properties.clear': '清除浮动',
              'styleManager.properties.transform': '变换',
              'styleManager.properties.transition': '过渡',
              // 样式属性 - 下拉选项值
              'styleManager.properties.display.options.block': '块级',
              'styleManager.properties.display.options.flex': '弹性',
              'styleManager.properties.display.options.grid': '网格',
              'styleManager.properties.display.options.inline': '行内',
              'styleManager.properties.display.options.inline-block': '行内块',
              'styleManager.properties.display.options.none': '隐藏',
              'styleManager.properties.flex-direction.options.row': '水平',
              'styleManager.properties.flex-direction.options.column': '垂直',
              'styleManager.properties.flex-direction.options.row-reverse': '水平反向',
              'styleManager.properties.flex-direction.options.column-reverse': '垂直反向',
              'styleManager.properties.flex-wrap.options.nowrap': '不换行',
              'styleManager.properties.flex-wrap.options.wrap': '换行',
              'styleManager.properties.flex-wrap.options.wrap-reverse': '反向换行',
              'styleManager.properties.justify-content.options.flex-start': '左对齐',
              'styleManager.properties.justify-content.options.center': '居中',
              'styleManager.properties.justify-content.options.flex-end': '右对齐',
              'styleManager.properties.justify-content.options.space-between': '两端对齐',
              'styleManager.properties.justify-content.options.space-around': '环绕对齐',
              'styleManager.properties.justify-content.options.space-evenly': '均匀对齐',
              'styleManager.properties.align-items.options.flex-start': '顶部',
              'styleManager.properties.align-items.options.center': '居中',
              'styleManager.properties.align-items.options.flex-end': '底部',
              'styleManager.properties.align-items.options.stretch': '拉伸',
              'styleManager.properties.align-items.options.baseline': '基线',
              'styleManager.properties.align-content.options.flex-start': '顶部',
              'styleManager.properties.align-content.options.center': '居中',
              'styleManager.properties.align-content.options.flex-end': '底部',
              'styleManager.properties.align-content.options.stretch': '拉伸',
              'styleManager.properties.align-content.options.space-between': '两端对齐',
              'styleManager.properties.align-content.options.space-around': '环绕对齐',
              'styleManager.properties.text-align.options.left': '左对齐',
              'styleManager.properties.text-align.options.center': '居中',
              'styleManager.properties.text-align.options.right': '右对齐',
              'styleManager.properties.text-align.options.justify': '两端对齐',
              'styleManager.properties.font-style.options.normal': '正常',
              'styleManager.properties.font-style.options.italic': '斜体',
              'styleManager.properties.text-decoration.options.none': '无',
              'styleManager.properties.text-decoration.options.underline': '下划线',
              'styleManager.properties.text-decoration.options.line-through': '删除线',
              'styleManager.properties.text-decoration.options.overline': '上划线',
              'styleManager.properties.overflow.options.visible': '可见',
              'styleManager.properties.overflow.options.hidden': '隐藏',
              'styleManager.properties.overflow.options.scroll': '滚动',
              'styleManager.properties.overflow.options.auto': '自动',
              'styleManager.properties.position.options.static': '静态',
              'styleManager.properties.position.options.relative': '相对',
              'styleManager.properties.position.options.absolute': '绝对',
              'styleManager.properties.position.options.fixed': '固定',
              'styleManager.properties.position.options.sticky': '粘性',
              'styleManager.properties.float.options.none': '无',
              'styleManager.properties.float.options.left': '左浮动',
              'styleManager.properties.float.options.right': '右浮动',
              'styleManager.properties.clear.options.none': '无',
              'styleManager.properties.clear.options.left': '清除左浮动',
              'styleManager.properties.clear.options.right': '清除右浮动',
              'styleManager.properties.clear.options.both': '清除两侧',
              'styleManager.properties.border-style.options.solid': '实线',
              'styleManager.properties.border-style.options.dashed': '虚线',
              'styleManager.properties.border-style.options.dotted': '点线',
              'styleManager.properties.border-style.options.double': '双线',
              'styleManager.properties.border-style.options.none': '无',
              'styleManager.properties.background-repeat.options.repeat': '重复',
              'styleManager.properties.background-repeat.options.repeat-x': '水平重复',
              'styleManager.properties.background-repeat.options.repeat-y': '垂直重复',
              'styleManager.properties.background-repeat.options.no-repeat': '不重复',
              'styleManager.properties.background-size.options.auto': '自动',
              'styleManager.properties.background-size.options.cover': '覆盖',
              'styleManager.properties.background-size.options.contain': '包含',
              'styleManager.properties.background-position.options.left top': '左上',
              'styleManager.properties.background-position.options.left center': '左中',
              'styleManager.properties.background-position.options.left bottom': '左下',
              'styleManager.properties.background-position.options.right top': '右上',
              'styleManager.properties.background-position.options.right center': '右中',
              'styleManager.properties.background-position.options.right bottom': '右下',
              'styleManager.properties.background-position.options.center top': '中上',
              'styleManager.properties.background-position.options.center center': '居中',
              'styleManager.properties.background-position.options.center bottom': '中下',
              'styleManager.properties.cursor.options.auto': '自动',
              'styleManager.properties.cursor.options.default': '默认',
              'styleManager.properties.cursor.options.pointer': '指针',
              'styleManager.properties.cursor.options.text': '文本',
              'styleManager.properties.cursor.options.move': '移动',
              'styleManager.properties.cursor.options.not-allowed': '禁止',
              // 命令
              'commands.open-sm': '打开样式管理器',
              'commands.open-tm': '打开设置',
              'commands.open-layers': '打开图层管理器',
              'commands.fullscreen': '全屏',
              'commands.preview': '预览',
              'commands.undo': '撤销',
              'commands.redo': '重做',
              'command-export': '导出',
              'command-clean': '清除所有',
              // 设备
              'deviceManager.device': '设备',
              // 通用
              'general.close': '关闭',
              'general.empty': '无',
              'general.confirm': '确认',
              'general.cancel': '取消',
              'general.delete': '删除',
              'styleManager.empty': '选择一个元素开始编辑样式',
              'layerManager.empty': '暂无图层',
              'blockManager.empty': '暂无组件',
            },
          },
        },
      })

      // 添加常用组件块
      const bm = editor.BlockManager
      bm.add('section', {
        label: '容器',
        category: '布局',
        content: '<section style="padding: 20px; min-height: 50px;"></section>',
      })
      bm.add('text', {
        label: '文本',
        category: '基础',
        content: '<p>在此输入文本</p>',
      })
      bm.add('heading', {
        label: '标题',
        category: '基础',
        content: '<h2>标题文字</h2>',
      })
      bm.add('image', {
        label: '图片',
        category: '基础',
        content: { type: 'image' },
      })
      bm.add('link', {
        label: '链接',
        category: '基础',
        content: '<a href="#">链接文字</a>',
      })
      bm.add('divider', {
        label: '分割线',
        category: '基础',
        content: '<hr style="border: 1px solid #e5e7eb; margin: 16px 0;">',
      })
      bm.add('columns-2', {
        label: '两栏',
        category: '布局',
        content: `<div style="display: flex; gap: 16px;">
          <div style="flex: 1; padding: 16px; min-height: 60px; border: 1px dashed #d1d5db;">左栏</div>
          <div style="flex: 1; padding: 16px; min-height: 60px; border: 1px dashed #d1d5db;">右栏</div>
        </div>`,
      })
      bm.add('columns-3', {
        label: '三栏',
        category: '布局',
        content: `<div style="display: flex; gap: 16px;">
          <div style="flex: 1; padding: 16px; min-height: 60px; border: 1px dashed #d1d5db;">左</div>
          <div style="flex: 1; padding: 16px; min-height: 60px; border: 1px dashed #d1d5db;">中</div>
          <div style="flex: 1; padding: 16px; min-height: 60px; border: 1px dashed #d1d5db;">右</div>
        </div>`,
      })
      bm.add('quote', {
        label: '引用',
        category: '基础',
        content: '<blockquote style="border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; background: #f8fafc;">引用内容</blockquote>',
      })
      bm.add('button', {
        label: '按钮',
        category: '基础',
        content: '<a style="display: inline-block; padding: 10px 24px; background: #2563eb; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px;">按钮文字</a>',
      })

      if (initialContent) {
        editor.setComponents(initialContent)
      }

      editorRef.current = editor
    }, 200)

    return () => {
      clearTimeout(timer)
      if (editorRef.current) {
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // 当 initialContent 变化时更新内容
  useEffect(() => {
    const editor = editorRef.current
    if (editor && open && initialContent) {
      editor.setComponents(initialContent)
    }
  }, [initialContent, open])

  // 拖动逻辑
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return
      setPosition({
        x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      })
    }
    const handleMouseUp = () => {
      dragRef.current.isDragging = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [position])

  // 缩放逻辑
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current.isResizing) return
      setSize({
        width: Math.max(700, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)),
        height: Math.max(450, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)),
      })
    }
    const handleMouseUp = () => {
      resizeRef.current.isResizing = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [size])

  // 保存到数据库
  const handleSave = useCallback(() => {
    const editor = editorRef.current
    if (editor) {
      const html = editor.getHtml()
      const css = editor.getCss()
      const fullHtml = css ? `<style>${css}</style>${html}` : html
      onSave(fullHtml)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }, [onSave])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute bg-background rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
        }}
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground cursor-move select-none shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">高级编辑器</span>
            <span className="text-xs opacity-70">拖动移动 · 右下角缩放</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-primary hover:bg-white/90'
              }`}
              onClick={handleSave}
            >
              {saved ? '已保存' : '保存到文章'}
            </button>
            <button
              className="px-3 py-1.5 text-xs bg-white/20 text-white rounded hover:bg-white/30"
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>

        {/* 主体区域：左侧组件面板 + 中间编辑区 + 右侧属性面板 */}
        <div className="flex flex-1 min-h-0">
          {/* 左侧：组件块 */}
          <div className="w-[200px] border-r border-border bg-gray-50 flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-border bg-gray-100">
              <h3 className="text-xs font-semibold text-gray-700">组件</h3>
            </div>
            <div id="blocks-container" className="flex-1 overflow-y-auto p-2 gjs-blocks-c" />
          </div>

          {/* 中间：编辑画布 */}
          <div className="flex-1 min-w-0 relative">
            {/* 顶部工具栏 */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-gray-100 shrink-0">
              <button
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => editorRef.current?.runCommand('core:undo')}
                title="撤销"
              >
                撤销
              </button>
              <button
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => editorRef.current?.runCommand('core:redo')}
                title="重做"
              >
                重做
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => editorRef.current?.setDevice('桌面')}
              >
                桌面
              </button>
              <button
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => editorRef.current?.setDevice('手机')}
              >
                手机
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => editorRef.current?.runCommand('core:copy')}
                title="复制"
              >
                复制
              </button>
              <button
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => editorRef.current?.runCommand('core:paste')}
                title="粘贴"
              >
                粘贴
              </button>
              <button
                className="px-2.5 py-1 text-xs font-medium text-red-600 bg-white rounded border border-gray-300 hover:bg-red-50"
                onClick={() => editorRef.current?.runCommand('core:delete')}
                title="删除"
              >
                删除
              </button>
            </div>
            <div ref={containerRef} className="gjs-editor-cont flex-1 bg-white" style={{ height: 'calc(100% - 36px)' }} />
          </div>

          {/* 右侧：样式和图层 */}
          <div className="w-[240px] border-l border-border bg-gray-50 flex flex-col shrink-0">
            {/* 样式管理器 */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-3 py-2 border-b border-border bg-gray-100">
                <h3 className="text-xs font-semibold text-gray-700">样式</h3>
              </div>
              <div id="styles-container" className="flex-1 overflow-y-auto" />
            </div>

            {/* 图层管理器 */}
            <div className="h-[200px] border-t border-border flex flex-col">
              <div className="px-3 py-2 border-b border-border bg-gray-100">
                <h3 className="text-xs font-semibold text-gray-700">图层</h3>
              </div>
              <div id="layers-container" className="flex-1 overflow-y-auto" />
            </div>
          </div>
        </div>

        {/* 缩放手柄 */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-primary/10"
          onMouseDown={handleResizeStart}
        >
          <svg className="w-6 h-6 text-gray-500" viewBox="0 0 16 16">
            <path d="M14 14L14 8M14 14L8 14M10 14L14 10M14 14L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export { GrapesEditorDialog }
