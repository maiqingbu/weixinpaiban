import { app, ipcMain, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

interface ErrorLogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'fatal'
  source: string
  message: string
  stack?: string
}

const errorBuffer: ErrorLogEntry[] = []
const MAX_BUFFER_SIZE = 100

function serializeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack }
  }
  return { message: String(err) }
}

export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (err) => {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'fatal',
      source: 'uncaughtException',
      message: err.message,
      stack: err.stack
    }
    addLog(entry)
    console.error('[FATAL] uncaughtException:', err)
    void persistLogs()
  })

  process.on('unhandledRejection', (reason) => {
    const { message, stack } = serializeError(reason)
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      source: 'unhandledRejection',
      message,
      stack
    }
    addLog(entry)
    console.error('[ERROR] unhandledRejection:', reason)
  })

  process.on('warning', (warning) => {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      source: 'process.warning',
      message: `${warning.name}: ${warning.message}`,
      stack: warning.stack
    }
    addLog(entry)
  })

  ipcMain.on('renderer:error', (_event, data: unknown) => {
    let payload: { source?: string; message?: string; stack?: string; level?: 'error' | 'warn' } =
      {}
    if (typeof data === 'string') {
      payload = { message: data, source: 'renderer' }
    } else if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>
      payload = {
        source: typeof d.source === 'string' ? d.source : 'renderer',
        message: typeof d.message === 'string' ? d.message : 'Unknown error',
        stack: typeof d.stack === 'string' ? d.stack : undefined,
        level: d.level === 'warn' ? 'warn' : 'error'
      }
    }
    addLog({
      timestamp: new Date().toISOString(),
      level: payload.level || 'error',
      source: payload.source || 'renderer',
      message: payload.message || 'Unknown error',
      stack: payload.stack
    })
  })
}

function addLog(entry: ErrorLogEntry): void {
  errorBuffer.push(entry)
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.shift()
  }
}

export async function persistLogs(): Promise<string | null> {
  if (errorBuffer.length === 0) return null
  try {
    const fileName = `crash-${Date.now()}.log`
    const filePath = join(app.getPath('userData'), 'logs', fileName)
    const content = errorBuffer
      .map(
        (e) => `[${e.timestamp}] [${e.level}] [${e.source}]\n${e.message}\n${e.stack || ''}\n---`
      )
      .join('\n')
    await writeFile(filePath, content, 'utf-8')
    return filePath
  } catch (err) {
    console.error('[error-handler] Failed to persist logs:', err)
    return null
  }
}

export function getErrorBuffer(): readonly ErrorLogEntry[] {
  return errorBuffer
}

export function clearErrorBuffer(): void {
  errorBuffer.length = 0
}

export async function showFatalErrorDialog(message: string): Promise<void> {
  if (!is.dev) {
    const result = await dialog.showMessageBox({
      type: 'error',
      title: '应用错误',
      message: '应用遇到了一个严重错误',
      detail: message.slice(0, 500),
      buttons: ['确定', '复制错误信息'],
      defaultId: 0
    })
    if (result.response === 1) {
      const { clipboard } = await import('electron')
      clipboard.writeText(message)
    }
  }
}
