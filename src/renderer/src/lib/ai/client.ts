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
    // 防御性类型检查：store 中的 configuredProviders[0].provider_id 在极端情况下
    // 可能不是 string（老数据库 / 脏数据 / store 状态错位），如果不加保护会把
    // 非 string 透传到 main 端 ai:complete handler 顶层 validateString 抛
    // ValidationError: providerId must be a string，导致整个 AI 流程打挂。
    // 这里在 renderer 端兜一层，统一 fallback 到 'deepseek' 并 warn。
    const safeProviderId: string =
      typeof providerId === 'string' && providerId.length > 0 && providerId.length <= 100
        ? providerId
        : 'deepseek'
    if (safeProviderId !== providerId) {
      console.warn(
        '[ai-client] providerId is not a non-empty string, fallback to "deepseek". got:',
        providerId
      )
    }
    const requestId = `ai-${++requestIdCounter}-${Date.now()}`
    let cancelled = false
    let cleanupListeners: (() => void) | null = null

    const promise = (async (): Promise<string> => {
      // ── 双保险 #1：invoke 自身 reject 也要 reject promise ──
      // main 端 handler 现在已经把所有同步 throw 改 send ai:error，
      // 理论上 invoke 不会 reject。但作为兜底（main 端代码升级回滚 / 新 bug），
      // 这里把 invoke reject 也包装成 Error 抛出，让 ChecklistPanel catch 一定能看到。
      let result: { requestId: string } | null | undefined
      try {
        result = await window.api?.aiComplete(safeProviderId, requestId, opts)
      } catch (invokeErr: unknown) {
        const err = invokeErr as Error
        throw new Error(
          `AI 请求初始化失败: ${err?.message || String(invokeErr) || '未知错误'}`
        )
      }
      if (!result) throw new Error('AI 功能不可用')

      return new Promise<string>((resolve: (v: string) => void, reject: (e: Error) => void) => {
        let settled = false
        // 90s timeout 兜底：极端时序下（IPC 事件在 listener 注册前发出），
        // promise 可能永远 pending → ChecklistPanel 一直显示"正在生成..."。
        // 到时强制 reject，避免 UI 永远卡住。
        const timeoutHandle = setTimeout(() => {
          if (settled) return
          console.warn(`[ai-client] request ${requestId} timeout (90s), force reject`)
          settled = true
          cleanupListeners?.()
          cleanupListeners = null
          reject(new Error('AI 请求超时（90s 未收到响应）'))
        }, 90 * 1000)

        const settle = (fn: () => void): void => {
          if (settled) return
          settled = true
          clearTimeout(timeoutHandle)
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
          clearTimeout(timeoutHandle)
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

    return { requestId, promise, cancel }
  }
}
