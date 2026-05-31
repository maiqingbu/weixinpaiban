export type ChecklistSeverity = 'error' | 'warning' | 'info'

export interface ChecklistItem {
  id: string
  title: string
  description?: string
  severity: ChecklistSeverity
  passed: boolean
  detail?: string
  action?: {
    label: string
    handler: () => void
  }
}

export interface ChecklistResult {
  items: ChecklistItem[]
  summary: {
    total: number
    passed: number
    errors: number
    warnings: number
    infos: number
  }
}
