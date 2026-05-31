import { useEffect, useRef, useCallback } from 'react'
import { type EditorConfig } from 'ckeditor5'

// CKEditor 5 v48: 所有插件必须显式导入才能被工具栏使用
import { DecoupledEditor } from 'ckeditor5'

// 基础排版
import { Bold, Italic, Underline, Strikethrough, Code, Subscript, Superscript } from 'ckeditor5'
import { Heading } from 'ckeditor5'
import { FontSize, FontFamily, FontColor, FontBackgroundColor } from 'ckeditor5'
import { Highlight } from 'ckeditor5'
import { RemoveFormat } from 'ckeditor5'
import { Alignment } from 'ckeditor5'
import { Indent, IndentBlock } from 'ckeditor5'
import { BlockQuote } from 'ckeditor5'
import { CodeBlock } from 'ckeditor5'
import { HorizontalLine } from 'ckeditor5'
import { PageBreak } from 'ckeditor5'

// 列表
import { List, ListProperties, TodoList } from 'ckeditor5'

// 链接
import { Link, LinkImage } from 'ckeditor5'

// 图片
import { Image, ImageBlock, ImageInline, ImageCaption, ImageInsert, ImageResize, ImageStyle, ImageToolbar, ImageUpload } from 'ckeditor5'

// 表格
import { Table, TableCaption, TableCellProperties, TableColumnResize, TableProperties, TableToolbar } from 'ckeditor5'

// 媒体 & 嵌入
import { MediaEmbed } from 'ckeditor5'

// 特殊字符 & 表情
import { Emoji } from 'ckeditor5'
import { SpecialCharacters, SpecialCharactersArrows, SpecialCharactersCurrency, SpecialCharactersEssentials, SpecialCharactersLatin, SpecialCharactersMathematical, SpecialCharactersText } from 'ckeditor5'

// 查找替换 & 源码
import { FindAndReplace } from 'ckeditor5'
import { SourceEditing } from 'ckeditor5'
import { ShowBlocks } from 'ckeditor5'

// 撤销
import { Undo } from 'ckeditor5'

// GHS（通用 HTML 支持 — 关键！）
import { GeneralHtmlSupport } from 'ckeditor5'

// 自定义
import { ImageEditButtons } from './ckImageEditPlugin'

// 所有需要注册的插件
const allPlugins = [
  // 基础
  Bold, Italic, Underline, Strikethrough, Code, Subscript, Superscript,
  Heading, FontSize, FontFamily, FontColor, FontBackgroundColor,
  Highlight, RemoveFormat,
  Alignment, Indent, IndentBlock,
  BlockQuote, CodeBlock, HorizontalLine, PageBreak,
  // 列表
  List, ListProperties, TodoList,
  // 链接 & 图片
  Link, LinkImage,
  Image, ImageBlock, ImageInline, ImageCaption, ImageInsert, ImageResize, ImageStyle, ImageToolbar, ImageUpload,
  // 表格
  Table, TableCaption, TableCellProperties, TableColumnResize, TableProperties, TableToolbar,
  // 媒体
  MediaEmbed,
  // 特殊字符
  Emoji, SpecialCharacters, SpecialCharactersArrows, SpecialCharactersCurrency,
  SpecialCharactersEssentials, SpecialCharactersLatin, SpecialCharactersMathematical, SpecialCharactersText,
  // 工具
  FindAndReplace, SourceEditing, ShowBlocks,
  Undo,
  // GHS（保留所有 HTML 样式）
  GeneralHtmlSupport,
  // 自定义图片编辑按钮
  ImageEditButtons,
]

import { CKEditor } from '@ckeditor/ckeditor5-react'
import 'ckeditor5/ckeditor5.css'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

const ghsAllowAll = {
  name: /^.*$/,
  attributes: true,
  classes: true,
  styles: true,
}

const editorConfig: EditorConfig = {
  plugins: allPlugins as any,
  toolbar: {
    items: [
      'undo', 'redo', '|',
      'heading', '|',
      'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
      'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript',
      'code', 'highlight', 'removeFormat', '|',
      'link', 'insertImage', 'mediaEmbed', 'insertTable',
      'horizontalLine', 'pageBreak', 'blockQuote', 'codeBlock', '|',
      'bulletedList', 'numberedList', 'todoList', '|',
      'alignment', 'indent', 'outdent', '|',
      'specialCharacters', 'emoji',
      'findAndReplace', 'sourceEditing', 'showBlocks',
    ],
    shouldNotGroupWhenFull: false,
  },
  heading: {
    options: [
      { model: 'paragraph', title: '正文', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: '标题 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: '标题 2', class: 'ck-heading_heading2' },
    ],
  },
  fontFamily: {
    options: [
      { title: '默认', model: 'default' },
      { title: '苹方/微软雅黑', model: 'PingFang SC, Microsoft YaHei, sans-serif' },
      { title: '宋体/华文宋体', model: 'SimSun, STSong, serif' },
      { title: 'Georgia', model: 'Georgia, serif' },
    ],
  },
  fontSize: {
    options: [
      { title: '极小', model: 'tiny' },
      { title: '小', model: 'small' },
      { title: '默认', model: 'default' },
      { title: '大', model: 'big' },
      { title: '极大', model: 'huge' },
    ],
  },
  image: {
    toolbar: [
      'imageTextAlternative',
      'toggleImageCaption',
      'imageStyle:alignLeft', 'imageStyle:alignCenter', 'imageStyle:alignRight',
      '|',
      'resizeImage',
      '|',
      'imageEdit', 'imageCrop',
    ],
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableCellProperties', 'tableProperties'],
  },
  link: {
    decorators: {
      openInNewTab: {
        mode: 'manual',
        label: '在新标签页打开',
        attributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    },
  },
  htmlSupport: {
    allow: [ghsAllowAll],
  } as any,
  licenseKey: 'GPL',
  placeholder: '开始写作…',
  language: 'zh-cn',
}

interface CKEditor5Props {
  content: string
  onContentChange: (html: string) => void
  onEditorReady?: (editor: any) => void
  className?: string
}

export function CKEditor5({ content, onContentChange, onEditorReady, className }: CKEditor5Props) {
  const editorRef = useRef<any>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleReady = useCallback((editor: any) => {
    editorRef.current = editor
    if (toolbarRef.current) {
      toolbarRef.current.innerHTML = ''
      toolbarRef.current.appendChild(editor.ui.view.toolbar.element)
    }
    onEditorReady?.(editor)
    // 存储原始 CKEditor 实例到 store（Editor.tsx 会再包裹为 EditorApi）
    useAppStore.getState().setEditorInstance(editor)
  }, [onEditorReady])

  const handleChange = useCallback((_event: any, editor: any) => {
    onContentChange(editor.getData())
  }, [onContentChange])

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy()
      }
    }
  }, [])

  return (
    <div className={cn('ckeditor5-wrapper flex h-full flex-col', className)}>
      <div ref={toolbarRef} className="ckeditor5-toolbar shrink-0 border-b border-border bg-background" />
      <div className="min-h-0 flex-1 overflow-auto">
        <CKEditor
          editor={DecoupledEditor}
          config={editorConfig}
          data={content}
          onReady={handleReady}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
