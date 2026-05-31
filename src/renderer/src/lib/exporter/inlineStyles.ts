import juice from 'juice'

/**
 * Use juice to inline CSS styles into HTML elements.
 * Wraps HTML in a .wx-root div with a <style> block, then runs juice.
 */
export function inlineStyles(html: string, css: string): string {
  const wrapped = `<section class="wx-root"><style>${css}</style>${html}</section>`
  const result = juice(wrapped, {
    inlinePseudoElements: false,
    preserveImportant: false,
    applyStyleTags: true,
    removeStyleTags: false,
    applyAttributesTableElements: true,
  })
  return result
}
