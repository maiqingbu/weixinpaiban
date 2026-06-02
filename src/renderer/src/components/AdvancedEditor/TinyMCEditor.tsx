import { useRef, useCallback, useEffect, useState } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import 'tinymce/tinymce'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/skins/ui/oxide/skin.min.css'
import 'tinymce/plugins/code'
import 'tinymce/plugins/image'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/table'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/emoticons'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/help'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/visualchars'
import 'tinymce/plugins/wordcount'
import 'tinymce/plugins/directionality'
import 'tinymce/plugins/emoticons/js/emojis'
import type { AdvancedEditorProps } from './types'

function TinyMCEditor({ initialContent, onChange }: AdvancedEditorProps): React.JSX.Element {
  const editorRef = useRef<any>(null)
  const [showHint, setShowHint] = useState(true)

  // 调试：在组件内显示 undo 状态
  const [undoState, setUndoState] = useState('init')

  const handleInit = useCallback((_evt: any, editor: any) => {
    editorRef.current = editor
    const logState = (label: string) => {
      const hasU = editor.undoManager.hasUndo()
      const hasR = editor.undoManager.hasRedo()
      const len = editor.undoManager.data?.length ?? '?'
      setUndoState(`${label}: undo=${hasU} redo=${hasR} levels=${len}`)
      console.log(`[TinyMCE] ${label}: hasUndo=${hasU}, hasRedo=${hasR}, levels=${len}`)
    }
    logState('init')

    let changeCount = 0
    editor.on('change AddUndo undo redo', () => {
      changeCount++
      logState(`event#${changeCount}(${editor.isDirty() ? 'dirty' : 'clean'})`)
    })
  }, [])

  // 当外部推送新内容时（切换文章），同步到编辑器
  useEffect(() => {
    const editor = editorRef.current
    if (editor && initialContent) {
      const current = editor.getContent()
      if (initialContent !== current) {
        editor.setContent(initialContent)
      }
    }
  }, [initialContent])

  const handleEditorChange = useCallback((content: string) => {
    onChange?.(content)
  }, [onChange])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 调试面板 */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8, zIndex: 1001,
        background: 'rgba(0,0,0,0.8)', color: '#0f0', padding: '4px 8px',
        borderRadius: 4, fontSize: 10, fontFamily: 'monospace', maxWidth: '90%',
        wordBreak: 'break-all'
      }}>
        {undoState}
      </div>

      {showHint && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
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
          <span>支持完整 HTML/CSS 编辑 · 图片可通过工具栏插入或粘贴</span>
          <button
            onClick={() => setShowHint(false)}
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
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={handleInit}
        initialValue={initialContent || ''}
        licenseKey="gpl"
        init={{
          // file:// 协议下（packaged 模式）window.location.origin 在 Chrome 中是 'null' 字符串，
          // 用它构造 new URL('/tinymce/', 'null') 会抛错或解析成 file:///tinymce/（无盘符的根路径），
          // 导致 TinyMCE 找不到插件/皮肤资源，编辑器空白。
          // 改用 window.location.href 作为 base 解析相对路径，自动适配 dev/packaged/双端。
          base_url: (() => {
            try {
              return new URL('./tinymce/', window.location.href).href
            } catch {
              // 兜底：去掉文件名后拼 tinymce/
              const base = window.location.href.split('/').slice(0, -1).join('/') + '/'
              return new URL('./tinymce/', base).href
            }
          })(),
          base_path: (() => {
            try {
              return new URL('./tinymce/', window.location.href).href
            } catch {
              const base = window.location.href.split('/').slice(0, -1).join('/') + '/'
              return new URL('./tinymce/', base).href
            }
          })(),
          suffix: '.min',
          height: '100%',
          width: '100%',
          skin: 'oxide',
          content_css: 'default',
          content_style: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              padding: 16px;
            }
            img { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ddd; padding: 8px; }
          `,
          plugins: [
            'advlist', 'autolink', 'charmap', 'code', 'directionality',
            'emoticons', 'fullscreen', 'help', 'image', 'link',
            'lists', 'preview', 'searchreplace', 'table',
            'visualblocks', 'visualchars', 'wordcount'
          ],
          toolbar: [
            'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor',
            'alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | link image table | code fullscreen'
          ],
          block_formats: '段落=p; 标题1=h1; 标题2=h2; 标题3=h3; 标题4=h4; 引用=blockquote; 预格式=pre',
          font_family_formats:
            '默认=sans-serif; 苹方/微软雅黑=PingFang SC, Microsoft YaHei, sans-serif; 宋体/华文宋体=SimSun, STSong, serif; 黑体=SimHei, STHeiti, sans-serif; 楷体=KaiTi, STKaiti, serif; Georgia=Georgia, serif; Arial=Arial, Helvetica, sans-serif; Times New Roman=Times New Roman, Times, serif',
          fontsize_formats: '12px 14px 16px 18px 20px 24px 28px 32px 36px 48px',
          image_title: true,
          automatic_uploads: false,
          file_picker_types: 'image',
          images_upload_handler: (blobInfo: any): Promise<string> => {
            return new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = () => {
                resolve(reader.result as string)
              }
              reader.readAsDataURL(blobInfo.blob())
            })
          },
          setup: (editor: any) => {
            editor.on('init', () => {
              editor.formatter.register('customformat', {
                inline: 'span',
                styles: {
                  color: '%value',
                  'font-size': '%value',
                  'background-color': '%value',
                  'border': '%value',
                  'padding': '%value',
                  'margin': '%value',
                  'border-radius': '%value',
                  'text-align': '%value',
                  'line-height': '%value',
                }
              })
            })
          },
          branding: false,
          promotion: false,
          language: 'zh_CN',
          language_url: '/tinymce/langs/zh_CN.js',
          menubar: false,
          resize: true,
          elementpath: false,
          statusbar: false,
          convert_urls: false,
          relative_urls: false,
          paste_data_images: true,
          paste_as_text: false,
          smart_paste: true,
          valid_styles: {
            '*': 'color,background-color,font-size,font-family,font-weight,font-style,text-decoration,text-align,line-height,letter-spacing,word-spacing,border,border-top,border-right,border-bottom,border-left,border-color,border-width,border-style,border-radius,padding,padding-top,padding-right,padding-bottom,padding-left,margin,margin-top,margin-right,margin-bottom,margin-left,width,height,max-width,max-height,min-width,min-height,display,flex-direction,justify-content,align-items,gap,box-shadow,text-shadow,opacity,transform,transition,float,clear,position,top,right,bottom,left,z-index,overflow,vertical-align,white-space,word-break,word-wrap'
          },
        }}
        onEditorChange={handleEditorChange}
      />
    </div>
  )
}

export { TinyMCEditor }
