import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { rm } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
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
    if (is.dev) {
      mainWindow.webContents.openDevTools({ mode: 'bottom' })
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (is.dev) {
    app.commandLine.appendSwitch('remote-debugging-port', '9222')
  }

setupGlobalErrorHandlers()

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
