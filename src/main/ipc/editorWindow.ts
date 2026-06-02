import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { validateString } from '../lib/validation'

const MAX_HTML_LENGTH = 50 * 1024 * 1024

let editorWindow: BrowserWindow | null = null
let pendingContent: string | null = null

export function registerEditorWindowHandlers(): void {
  // 编辑器窗口就绪后请求内容
  ipcMain.on('editor:ready', (event) => {
    if (pendingContent !== null) {
      event.sender.send('editor:set-content', pendingContent)
      pendingContent = null
    }
  })

  ipcMain.handle('editor:open', (_event, content: unknown) => {
    const safeContent = validateString(content, 'content', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })

    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.focus()
      editorWindow.webContents.send('editor:set-content', safeContent)
      return
    }

    pendingContent = safeContent

    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const winWidth = Math.min(1200, width - 200)
    const winHeight = Math.min(800, height - 100)

    editorWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: Math.round((width - winWidth) / 2),
      y: Math.round((height - winHeight) / 2),
      title: '高级编辑器',
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true
      }
    })

    editorWindow.setMenu(null)

    editorWindow.on('closed', () => {
      editorWindow = null
      pendingContent = null
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      editorWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/editor.html`)
    } else {
      editorWindow.loadFile(join(__dirname, '../renderer/editor.html'))
    }

    if (is.dev) {
      editorWindow.webContents.openDevTools({ mode: 'bottom' })
    }
  })

  ipcMain.on('editor:save', (_event, html: unknown) => {
    const safeHtml = validateString(html, 'html', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
    const mainWindow = BrowserWindow.getAllWindows().find(w => w !== editorWindow && !w.isDestroyed())
    if (mainWindow) {
      mainWindow.webContents.send('editor:saved', safeHtml)
    }
  })

  ipcMain.on('editor:push-content', (_event, html: unknown) => {
    const safeHtml = validateString(html, 'html', { allowEmpty: true, maxLength: MAX_HTML_LENGTH })
    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.webContents.send('editor:set-content', safeHtml)
    }
  })

  ipcMain.on('editor:close', () => {
    if (editorWindow && !editorWindow.isDestroyed()) {
      const mainWindow = BrowserWindow.getAllWindows().find(w => w !== editorWindow && !w.isDestroyed())
      if (mainWindow) {
        mainWindow.webContents.send('editor:closed')
      }
      editorWindow.close()
    }
  })
}
