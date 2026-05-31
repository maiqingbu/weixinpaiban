import { CHECK_RULES, type CheckContext } from './rules'
import type { ChecklistResult } from './types'

export function runChecklist(ctx: CheckContext): ChecklistResult {
  const items = CHECK_RULES.map((rule) => rule(ctx))
  const summary = {
    total: items.length,
    passed: items.filter((i) => i.passed).length,
    errors: items.filter((i) => !i.passed && i.severity === 'error').length,
    warnings: items.filter((i) => !i.passed && i.severity === 'warning').length,
    infos: items.filter((i) => !i.passed && i.severity === 'info').length,
  }
  return { items, summary }
}
