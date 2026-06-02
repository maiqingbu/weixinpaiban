import type { AICompletionOptions } from './types'

let requestIdCounter = 0

interface AIRequest {
  requestId: string
  promise: Promise<string>
  cancel: () => void
}

export function createAIComplete(): (
  providerId: string,
  opts: AICompletionOptions,
  onChunk?: (text: string) => void
) => AIRequest {
  return (providerId: string, opts: AICompletionOptions, onChunk?: (text: string) => void): AIRequest => {
    const requestId = `ai-${++requestIdCounter}-${Date.now()}`
    let cancelled = false
    let cleanupListeners: (() => void) | null = null

    const promise = (async (): Promise<string> => {
      const result = await window.api?.aiComplete(providerId, requestId, opts)
      if (!result) throw new Error('AI 功能不可用')

      return new Promise<string>((resolve: (v: string) => void, reject: (e: Error) => void) => {
        let settled = false

        const settle = (fn: () => void): void => {
          if (settled) return
          settled = true
          cleanupListeners?.()
          cleanupListeners = null
          fn()
        }

        const chunkHandler = (
          _event: Electron.IpcRendererEvent,
          data: { requestId: string; text: string }
        ): void => {
          if (data.requestId !== requestId) return
          onChunk?.(data.text)
        }
        const doneHandler = (
          _event: Electron.IpcRendererEvent,
          data: { requestId: string; fullText: string }
        ): void => {
          if (data.requestId !== requestId) return
          settle(() => resolve(data.fullText))
        }
        const errorHandler = (
          _event: Electron.IpcRendererEvent,
          data: { requestId: string; error: string }
        ): void => {
          if (data.requestId !== requestId) return
          settle(() => reject(new Error(data.error)))
        }

        window.api.onAiChunk(chunkHandler)
        window.api.onAiDone(doneHandler)
        window.api.onAiError(errorHandler)

        cleanupListeners = (): void => {
          window.api.offAiChunk(chunkHandler)
          window.api.offAiDone(doneHandler)
          window.api.offAiError(errorHandler)
        }

        // 如果在监听器注册前用户已经取消，立即清理
        if (cancelled) {
          settle(() => reject(new Error('AI request cancelled')))
        }
      })
    })()

    const cancel = (): void => {
      if (cancelled) return
      cancelled = true
      window.api?.aiCancel?.(requestId)
      // 取消后立即清理监听器（即便主进程尚未响应）
      cleanupListeners?.()
      cleanupListeners = null
    }

    // 防止 promise 静默不解析（极端情况兜底）：5min 后强制清理
    const timeoutHandle = setTimeout(() => {
      if (cleanupListeners) {
        console.warn('[ai-client] request timeout, cleaning up listeners', requestId)
        cleanupListeners()
        cleanupListeners = null
      }
    }, 5 * 60 * 1000)
    promise.finally(() => clearTimeout(timeoutHandle))

    return { requestId, promise, cancel }
  }
}
