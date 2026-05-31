/**
 * CKEditor 5 → 现有组件 API 适配层
 */

export interface EditorApi {
  getContent(): string
  setContent(html: string): void
  getDomRoot(): HTMLElement | null
  findImagePosition(src: string): { src: string } | null
  replaceImageSrc(oldSrc: string, newSrc: string): void
  raw: any
}

// 递归查找 image 元素属性
function findImageInJson(node: any, src: string): any {
  if (node.name === 'image' && node.attributes?.src === src) {
    return node.attributes
  }
  if (node.children) {
    for (const child of node.children) {
      const result = findImageInJson(child, src)
      if (result) return result
    }
  }
  return null
}

// 递归替换 image src
function replaceImageInNode(writer: any, node: any, oldSrc: string, newSrc: string): boolean {
  if (node.is?.('element', 'image') && node.getAttribute('src') === oldSrc) {
    writer.setAttribute('src', newSrc, node)
    return true
  }
  if (node.getChildren) {
    for (const child of node.getChildren()) {
      if (replaceImageInNode(writer, child, oldSrc, newSrc)) return true
    }
  }
  return false
}

export function createCkEditorApi(editor: any): EditorApi {
  return {
    getContent() {
      return editor?.getData() || ''
    },
    setContent(html: string) {
      if (!editor) {
        console.error('[EditorApi] setContent 失败：editor 为空')
        return
      }
      try {
        console.log('[EditorApi] setContent, html length:', html.length, 'editor ready:', !!editor.model)
        editor.setData(html)
        console.log('[EditorApi] setContent 完成')
      } catch (err) {
        console.error('[EditorApi] setContent 异常:', err)
      }
    },
    getDomRoot() {
      return editor?.editing?.view?.domRoots?.get('main') || null
    },
    findImagePosition(src: string) {
      if (!editor) return null
      const root = editor.model.document.getRoot()
      if (!root) return null
      for (const child of root.getChildren()) {
        const attrs = findImageInJson(child.toJSON?.(), src)
        if (attrs) return { src, ...attrs }
      }
      return { src }
    },
    replaceImageSrc(oldSrc: string, newSrc: string) {
      if (!editor) return
      editor.model.change((writer: any) => {
        const root = editor.model.document.getRoot()
        if (!root) return
        for (const child of root.getChildren()) {
          if (replaceImageInNode(writer, child, oldSrc, newSrc)) return
        }
      })
    },
    raw: editor,
  }
}
