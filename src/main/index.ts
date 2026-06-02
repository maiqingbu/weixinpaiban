import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { rm } from 'fs/promises'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// electron-vite dev 模式标记。@electron-toolkit/utils 的 is.dev 用 !app.isPackaged 判断，
// 但在 macOS 上 node_modules/electron/dist/Electron.app 本身是 app bundle，
// 导致 app.isPackaged 始终为 true、is.dev 始终为 false，所有 DevTools/CSP hook 都不会跑。
// 这里改用 electron-vite 自己注入的环境变量判断。
const isDevMode = process.env.NODE_ENV_ELECTRON_VITE === 'development'
import { registerIpcHandlers } from './ipc'
import { registerImportHandlers } from './ipc/import'
import { registerLinkCheckHandlers } from './ipc/linkCheck'
import { registerExportPdfHandlers } from './ipc/exportPdf'
import { registerPreviewHandlers } from './ipc/preview'
import { registerAiHandlers } from './ipc/ai'
import { registerImageUploadHandlers } from './ipc/imageUpload'
import { registerCustomMaterialHandlers } from './ipc/customMaterial'
import { registerImageSearchHandlers } from './ipc/imageSearch'
import { registerImageGenHandlers } from './ipc/imageGen'
import { registerEditorWindowHandlers } from './ipc/editorWindow'
import { registerTavilyHandlers } from './ipc/tavily'
import { startPreviewServer } from './services/previewServer'
import { getDb, listSavedStyles, createSavedStyle, updateSavedStyle, deleteSavedStyle, listSnapshots, createSnapshot, getSnapshot, getLatestSnapshotTime, listCustomThemes, createCustomTheme, updateCustomTheme, deleteCustomTheme, duplicateCustomTheme } from './db'
import { setupGlobalErrorHandlers } from './lib/errorHandler'
import { validateId, validateString, validateStringOrNull } from './lib/validation'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (isDevMode) {
      // 用 detach 模式让 DevTools 弹出独立窗口，避免在底部被忽略
      mainWindow.webContents.openDevTools({ mode: 'detach', activate: true })
      // Right-click context menu for Inspect Element
      mainWindow.webContents.on('context-menu', (_e, props) => {
        Menu.buildFromTemplate([
          {
            label: '检查元素',
            id: 'inspect',
            click: () => {
              mainWindow.webContents.inspectElement(props.x, props.y)
            },
          },
        ]).popup({ window: mainWindow })
      })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDevMode && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (isDevMode) {
    app.commandLine.appendSwitch('remote-debugging-port', '9222')
  }

setupGlobalErrorHandlers()

// Dev mode: 把所有 renderer 的 console-message 转发到主进程 stdout，
// 这样在终端就能直接看到 renderer 的 console.log/warn/error，无需打开 DevTools。
if (isDevMode) {
  app.on('web-contents-created', (_e, contents) => {
    contents.on('console-message', (...args: any[]) => {
      // Electron 28+ 新签名：单参数 event 对象；旧签名：4 个位置参数
      let level = 0
      let message = ''
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        const ev = args[0] as { level?: string | number; message?: string; lineNumber?: number; sourceId?: string }
        level = typeof ev.level === 'string'
          ? ({ log: 0, warning: 1, error: 2, info: 3, debug: 0 }[ev.level] ?? 0)
          : (ev.level ?? 0)
        message = ev.message ?? JSON.stringify(ev)
      } else {
        // 旧签名: (event, level, message, line, sourceId)
        level = args[1] as number
        message = args[2] as string
      }
      const tag = ['log', 'warn', 'error', 'info'][level] || 'log'
      const prefix = `[renderer:${contents.id}] ${tag}:`
      if (level >= 2) {
        console.error(prefix, message)
      } else {
        console.log(prefix, message)
      }
    })
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Developer tools toggle
  ipcMain.on('devtools:toggle', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      } else {
        win.webContents.openDevTools({ mode: 'bottom' })
      }
    }
  })

  // Clean up temp files from previous runs
  rm(join(app.getPath('userData'), 'temp'), { recursive: true, force: true }).catch(() => {})

  // Initialize database
  getDb()

  // Start preview server
  startPreviewServer().catch((err) => {
    console.error('[main] Failed to start preview server:', err)
  })

  // Register IPC handlers
  registerIpcHandlers()
  registerImportHandlers()
  registerLinkCheckHandlers()
  registerExportPdfHandlers()
  registerPreviewHandlers()
  registerAiHandlers()
  registerImageUploadHandlers(getDb())
  registerCustomMaterialHandlers()
  registerImageSearchHandlers()
  registerImageGenHandlers()
  registerEditorWindowHandlers()
  registerTavilyHandlers()

  // ── Saved Styles ──
  ipcMain.handle('style:list', () => {
    return listSavedStyles()
  })
  ipcMain.handle('style:create', (_e, name: unknown, styles: unknown) => {
    const safeName = validateString(name, 'name', { minLength: 1, maxLength: 200 })
    const safeStyles = validateString(styles, 'styles', { minLength: 1, maxLength: 1024 * 1024 })
    return createSavedStyle(safeName, safeStyles)
  })
  ipcMain.handle('style:update', (_e, id: unknown, name: unknown) => {
    const safeId = validateId(id)
    const safeName = validateString(name, 'name', { minLength: 1, maxLength: 200 })
    return updateSavedStyle(safeId, safeName)
  })
  ipcMain.handle('style:delete', (_e, id: unknown) => {
    const safeId = validateId(id)
    return deleteSavedStyle(safeId)
  })

  // ── Article Snapshots ──
  ipcMain.handle('snapshot:list', (_e, articleId: unknown) => {
    const safeId = validateId(articleId)
    return listSnapshots(safeId)
  })
  ipcMain.handle('snapshot:create', (_e, articleId: unknown, content: unknown, wordCount: unknown) => {
    const safeId = validateId(articleId)
    const safeContent = validateString(content, 'content', { allowEmpty: true, maxLength: 50 * 1024 * 1024 })
    const safeWordCount = typeof wordCount === 'number' ? Math.max(0, Math.floor(wordCount)) : 0
    return createSnapshot(safeId, safeContent, safeWordCount)
  })
  ipcMain.handle('snapshot:get', (_e, id: unknown) => {
    const safeId = validateId(id)
    return getSnapshot(safeId)
  })
  ipcMain.handle('snapshot:latest-time', (_e, articleId: unknown) => {
    const safeId = validateId(articleId)
    return getLatestSnapshotTime(safeId)
  })

  // ── Custom Themes ──
  ipcMain.handle('custom-theme:list', () => listCustomThemes())
  ipcMain.handle('custom-theme:create', (_e, id: unknown, name: unknown, css: unknown, baseThemeId: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    const safeName = validateString(name, 'name', { minLength: 1, maxLength: 200 })
    const safeCss = validateString(css, 'css', { minLength: 1, maxLength: 1024 * 1024 })
    const safeBase = validateStringOrNull(baseThemeId, 'baseThemeId')
    return createCustomTheme(safeId, safeName, safeCss, safeBase)
  })
  ipcMain.handle('custom-theme:update', (_e, id: unknown, name: unknown, css: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    const safeName = validateString(name, 'name', { minLength: 1, maxLength: 200 })
    const safeCss = validateString(css, 'css', { minLength: 1, maxLength: 1024 * 1024 })
    return updateCustomTheme(safeId, safeName, safeCss)
  })
  ipcMain.handle('custom-theme:delete', (_e, id: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    return deleteCustomTheme(safeId)
  })
  ipcMain.handle('custom-theme:duplicate', (_e, sourceId: unknown, newName: unknown) => {
    const safeSourceId = validateString(sourceId, 'sourceId', { minLength: 1, maxLength: 100 })
    const safeNewName = validateString(newName, 'newName', { minLength: 1, maxLength: 200 })
    return duplicateCustomTheme(safeSourceId, safeNewName)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
