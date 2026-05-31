import { Plugin, ButtonView } from 'ckeditor5'

/**
 * 在 CKEditor 5 图片工具栏添加"编辑"和"裁剪"按钮，
 * 通过 CustomEvent 桥接到现有的 ImageEditorModal
 */
export class ImageEditButtons extends Plugin {
  static get pluginName() {
    return 'ImageEditButtons' as const
  }

  init() {
    const editor = this.editor

    // 监听图片工具栏初始化
    editor.ui.componentFactory.add('imageEdit', (locale: any) => {
      const button = new ButtonView(locale)

      button.set({
        label: '编辑图片',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
        tooltip: true,
      })

      button.on('execute', () => {
        this._dispatchImageEvent('image:edit')
      })

      return button
    })

    editor.ui.componentFactory.add('imageCrop', (locale: any) => {
      const button = new ButtonView(locale)

      button.set({
        label: '裁剪图片',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>`,
        tooltip: true,
      })

      button.on('execute', () => {
        this._dispatchImageEvent('image:crop')
      })

      return button
    })
  }

  _dispatchImageEvent(eventName: string) {
    const editor = this.editor
    const selection = editor.model.document.selection
    const imageElement = selection.getSelectedElement()

    if (imageElement && imageElement.is('element', 'image')) {
      const src = imageElement.getAttribute('src') as string
      if (!src) return

      // 查找对应的 DOM 元素
      const domRoot = editor.editing.view.domRoots.get('main')
      let imgEl: HTMLElement | null = null
      if (domRoot) {
        const imgs = domRoot.querySelectorAll('img')
        for (const img of imgs) {
          if (img.getAttribute('src') === src) {
            imgEl = img as HTMLElement
            break
          }
        }
      }

      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { src, element: imgEl },
        })
      )
    }
  }
}
