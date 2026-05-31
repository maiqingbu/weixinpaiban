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

// TinyMCE 皮肤需要从 node_modules 复制
// 运行: cp -r node_modules/tinymce/skins ../public/tinymce/skins

function TinyMCEditor({ initialContent, onChange }: AdvancedEditorProps): React.JSX.Element {
  const editorRef = useRef<any>(null)
  const [showHint, setShowHint] = useState(true)
  const isReadyRef = useRef(false)
  const pendingContentRef = useRef<string | null>(null)

  const handleInit = useCallback((_evt: any, editor: any) => {
    editorRef.current = editor
    isReadyRef.current = true
    console.log('[TinyMCEditor] Editor initialized')

    // 如果有待设置的内容，在初始化后设置
    if (pendingContentRef.current !== null) {
      editor.setContent(pendingContentRef.current)
      pendingContentRef.current = null
    } else if (initialContent) {
      editor.setContent(initialContent)
    }
  }, [initialContent])

  const handleEditorChange = useCallback((content: string) => {
    onChange?.(content)
  }, [onChange])

  // 当 initialContent 变化时更新编辑器内容
  useEffect(() => {
    const editor = editorRef.current
    if (editor && isReadyRef.current) {
      // 编辑器已初始化，直接设置内容
      editor.setContent(initialContent || '')
    } else if (initialContent) {
      // 编辑器还没初始化完成，先暂存内容
      pendingContentRef.current = initialContent
    }
  }, [initialContent])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 图片编辑提示 */}
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
        init={{
          license_key: 'gpl',
          base_url: new URL('/tinymce/', window.location.origin).href,
          base_path: new URL('/tinymce/', window.location.origin).href,
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
            // 自定义样式格式
            editor.on('init', () => {
              // 添加一些常用的样式格式
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
