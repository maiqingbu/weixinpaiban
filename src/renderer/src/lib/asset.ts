/**
 * 解析渲染器里的静态资源路径。
 *
 * 背景：很多主题资源用 `/theme-previews/x.jpg` 这种「绝对路径」写法。
 * 这种写法在两种环境下行为完全不同：
 *   - 开发模式（http://localhost:5173）：解析为 http://localhost:5173/theme-previews/x.jpg，正常。
 *   - packaged 模式（file://...resources/app.asar/out/renderer/index.html）：
 *     `file://` 协议下 `/theme-previews/x.jpg` 会被解析成 `file:///theme-previews/x.jpg`
 *     （无盘符的根目录），**永远找不到**。
 *
 * 这个工具用 `window.location.href` 作为 base 解析路径，自动适配 dev 与 packaged 模式。
 */

/**
 * 已经是绝对 URL（http(s)/data/file/blob）的 path 直接返回。
 * 其他情况当作相对路径，用 window.location.href 作为 base 解析。
 */
export function resolveAssetPath(path: string | undefined | null): string | undefined {
  if (!path) return path ?? undefined
  // 已经是绝对 URL：直接返回
  if (/^(https?:|data:|file:|blob:)/i.test(path)) return path
  // 已经是 file:// URL（说明上游已经处理过）
  if (path.startsWith('//')) return path
  // 相对路径：用当前文档 URL 作为 base 解析
  // 这样在 file:// 协议下也能正确解析到 out/renderer/theme-previews/x.jpg
  try {
    return new URL(path, window.location.href).href
  } catch {
    // 兜底：去掉文件名后拼
    try {
      const base = window.location.href.split('/').slice(0, -1).join('/') + '/'
      return new URL(path, base).href
    } catch {
      return path
    }
  }
}
