export interface AdvancedEditorProps {
  initialContent?: string
  onChange: (html: string) => void
  /** Unlayer design JSON — 用于无损加载编辑器状态 */
  design?: Record<string, any> | null
  /** design 变更回调 — 持久化到 store 用于下次无损加载 */
  onDesignChange?: (design: Record<string, any>) => void
}
