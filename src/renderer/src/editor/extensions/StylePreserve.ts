import { Extension } from '@tiptap/core'

/**
 * 让所有节点和 mark 保留 style、class、id 等全局 HTML 属性。
 * 解决 AI 生成内容在编辑器中丢失内联 CSS 样式的问题。
 */
export const StylePreserve = Extension.create({
  name: 'stylePreserve',

  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'codeBlock', 'table', 'tableRow', 'tableCell', 'tableHeader', 'horizontalRule', 'image', 'templateBlock', 'columnsContainer', 'column', 'videoCard', 'miniprogramCard'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style') || null,
            renderHTML: (attributes) => {
              if (!attributes.style) return {}
              return { style: attributes.style }
            },
          },
          class: {
            default: null,
            parseHTML: (element) => element.getAttribute('class') || null,
            renderHTML: (attributes) => {
              if (!attributes.class) return {}
              return { class: attributes.class }
            },
          },
        },
      },
      {
        types: ['textStyle'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style') || null,
            renderHTML: (attributes) => {
              if (!attributes.style) return {}
              return { style: attributes.style }
            },
          },
          class: {
            default: null,
            parseHTML: (element) => element.getAttribute('class') || null,
            renderHTML: (attributes) => {
              if (!attributes.class) return {}
              return { class: attributes.class }
            },
          },
        },
      },
    ]
  },
})
