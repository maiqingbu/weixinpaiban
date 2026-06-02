import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react'

interface FallbackProps {
  error: Error
  reset: () => void
  level: 'app' | 'section'
}

export function DefaultErrorFallback({ error, reset, level }: FallbackProps): ReactNode {
  const handleCopy = (): void => {
    navigator.clipboard.writeText(`${error.name}: ${error.message}\n\n${error.stack || ''}`)
  }

  const handleReload = (): void => {
    if (level === 'app') {
      window.location.reload()
    } else {
      reset()
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {level === 'app' ? '应用遇到了一个错误' : '该模块出现了问题'}
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{error.message || '未知错误'}</p>
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-left dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">错误名称</div>
          <div className="font-mono text-xs text-gray-700 dark:text-gray-300">{error.name}</div>
        </div>
        <div className="flex justify-center gap-2">
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {level === 'app' ? '重新加载' : '重试'}
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Copy className="h-3.5 w-3.5" />
            复制错误
          </button>
        </div>
      </div>
    </div>
  )
}
