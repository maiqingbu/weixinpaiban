import { CircleCheck, CircleX, AlertTriangle, Info } from 'lucide-react'
import type { ChecklistItem as ChecklistItemType } from '@/lib/checklist/types'

const severityConfig = {
  error: {
    icon: CircleX,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
}

interface ChecklistItemProps {
  item: ChecklistItemType
}

export function ChecklistItemRow({ item }: ChecklistItemProps): React.JSX.Element {
  const Icon = item.passed ? CircleCheck : severityConfig[item.severity].icon
  const config = item.passed
    ? { bg: 'bg-transparent', border: 'border-transparent', text: 'text-muted-foreground', iconColor: 'text-green-500' }
    : severityConfig[item.severity]

  return (
    <div className={`rounded-lg border p-3 ${config.bg} ${config.border} transition-colors`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.passed ? 'text-green-500' : config.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${config.text}`}>
            {item.title}
          </div>
          {item.detail && (
            <div className={`mt-0.5 text-xs ${item.passed ? 'text-muted-foreground/70' : config.text}`}>
              {item.detail}
            </div>
          )}
          {item.action && (
            <button
              type="button"
              className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                item.action!.handler()
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
