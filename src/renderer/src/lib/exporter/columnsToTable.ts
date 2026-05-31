/**
 * 导出时将 <section data-columns-container> 转为 <table>
 *
 * 微信公众号不支持 flexbox 布局，需要将分栏转为 table 结构。
 * 统一递归处理，无特殊分支：
 * - horizontal：1 行 × N 列 table
 * - vertical：N 行 × 1 列 table
 * - 嵌套：从最深层的 container 开始转，逐层向外
 */

/**
 * 获取嵌套深度
 */
function getDepth(el: Element): number {
  let depth = 0
  let cur: Element | null = el.parentElement
  while (cur) {
    if (cur.hasAttribute('data-columns-container')) depth++
    cur = cur.parentElement
  }
  return depth
}

/**
 * 移除 td 内第一个元素的 margin-top
 */
function removeFirstMarginTop(td: HTMLElement): void {
  const firstChild = td.firstElementChild as HTMLElement | null
  if (!firstChild) return
  const currentStyle = firstChild.getAttribute('style') || ''
  const newStyle = currentStyle
    .replace(/margin-top\s*:\s*[^;]+;?/gi, '')
    .replace(/margin\s*:\s*[^;]+;?/gi, '')
  firstChild.setAttribute('style', newStyle)
}

/**
 * 转换单个 containers-container 为 table
 */
function convertContainer(container: Element, doc: Document): void {
  const direction = container.getAttribute('data-direction') || 'horizontal'
  const widthsAttr = container.getAttribute('data-widths') || '[]'
  let widths: number[]
  try {
    widths = JSON.parse(widthsAttr)
  } catch {
    widths = [50, 50]
  }
  const gap = parseInt(container.getAttribute('data-gap') || '16')
  const columns = Array.from(container.querySelectorAll(':scope > [data-column]'))
  if (columns.length === 0) return

  const table = doc.createElement('table')
  table.setAttribute('width', '100%')
  table.setAttribute('cellspacing', '0')
  table.setAttribute('cellpadding', '0')
  table.style.borderCollapse = 'collapse'
  table.style.width = '100%'
  table.style.tableLayout = 'fixed'

  if (direction === 'horizontal') {
    // 横向：1 行 N 列
    const tr = doc.createElement('tr')
    columns.forEach((col, i) => {
      const td = doc.createElement('td')
      const w = widths[i] || Math.floor(100 / columns.length)
      td.setAttribute('width', `${w}%`)
      td.style.width = `${w}%`
      td.style.verticalAlign = 'top'
      td.style.padding = '0'
      if (i > 0) td.style.paddingLeft = `${gap / 2}px`
      if (i < columns.length - 1) td.style.paddingRight = `${gap / 2}px`
      td.style.boxSizing = 'border-box'
      td.style.border = 'none'

      // Move all children from column into td
      while (col.firstChild) {
        td.appendChild(col.firstChild)
      }

      removeFirstMarginTop(td)

      // Force images inside to be responsive
      td.querySelectorAll('img').forEach((img) => {
        ;(img as HTMLImageElement).style.maxWidth = '100%'
        ;(img as HTMLImageElement).style.height = 'auto'
      })

      tr.appendChild(td)
    })
    table.appendChild(tr)
  } else {
    // 纵向：N 行 1 列
    columns.forEach((col, i) => {
      const tr = doc.createElement('tr')
      const td = doc.createElement('td')
      td.style.verticalAlign = 'top'
      td.style.padding = '0'
      td.style.border = 'none'
      if (i > 0) td.style.paddingTop = `${gap / 2}px`
      if (i < columns.length - 1) td.style.paddingBottom = `${gap / 2}px`
      td.style.boxSizing = 'border-box'

      while (col.firstChild) {
        td.appendChild(col.firstChild)
      }

      removeFirstMarginTop(td)

      td.querySelectorAll('img').forEach((img) => {
        ;(img as HTMLImageElement).style.maxWidth = '100%'
        ;(img as HTMLImageElement).style.height = 'auto'
      })

      tr.appendChild(td)
      table.appendChild(tr)
    })
  }

  container.replaceWith(table)
}

/**
 * 将 HTML 中的 columns-container 转为 table 结构
 * @param html 输入 HTML
 * @returns 转换后的 HTML
 */
export function convertColumnsToTable(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  // 收集所有 containers，按嵌套深度从深到浅排序
  const allContainers = Array.from(body.querySelectorAll<Element>('section[data-columns-container]'))
  allContainers.sort((a, b) => getDepth(b) - getDepth(a))

  // 从最深层开始转换
  for (const container of allContainers) {
    if (container.parentNode) {
      // 容器可能已被父级转换时移除了
      convertContainer(container, doc)
    }
  }

  // 序列化
  const serializer = new XMLSerializer()
  let result = serializer.serializeToString(body)
  result = result.replace(/^<body[^>]*>/, '').replace(/<\/body>$/, '')

  return result
}
