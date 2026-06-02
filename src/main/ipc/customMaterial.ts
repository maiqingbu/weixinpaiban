import { ipcMain, dialog, BrowserWindow } from 'electron'
import {
  listCustomMaterials,
  saveCustomMaterial,
  deleteCustomMaterial,
  incrementMaterialUse,
  updateCustomMaterialMeta,
  updateCustomMaterialHtml,
  duplicateCustomMaterial,
  listCustomMaterialGroups,
  createCustomMaterialGroup,
  renameCustomMaterialGroup,
  deleteCustomMaterialGroup,
  reorderCustomMaterialGroups,
  moveMaterialToGroup,
} from '../db'
import {
  validateString,
  validateStringOrNull,
  validateArray,
  validateObject,
  validateBoolean,
  validateEnum
} from '../lib/validation'

const MATERIAL_KINDS = ['snippet', 'template', 'divider', 'columns', 'svg'] as const
const CONFLICT_STRATEGIES = ['skip', 'overwrite', 'new'] as const

export function registerCustomMaterialHandlers(): void {
  // ── Materials ──

  ipcMain.handle('cm:list', () => {
    const materials = listCustomMaterials()
    const groups = listCustomMaterialGroups()
    return { materials, groups }
  })

  ipcMain.handle('cm:save', (_e, material: unknown) => {
    const obj = validateObject<Record<string, unknown>>(material, 'material')
    const id = obj.id ? validateString(obj.id, 'id', { minLength: 1, maxLength: 100 }) : undefined
    const name = validateString(obj.name, 'name', { minLength: 1, maxLength: 200 })
    const kind = validateEnum(obj.kind, MATERIAL_KINDS, 'kind')
    const keywords = validateArray(obj.keywords ?? [], 'keywords', {
      maxLength: 50,
      itemValidator: (item, idx) => validateString(item, `keywords[${idx}]`, { maxLength: 100 })
    })
    const thumbnail = validateString(obj.thumbnail ?? '', 'thumbnail', { allowEmpty: true, maxLength: 5000 })
    const html = validateString(obj.html, 'html', { minLength: 1, maxLength: 1024 * 1024 })
    const groupId = validateStringOrNull(obj.group_id, 'group_id')

    return saveCustomMaterial({ id, name, kind, keywords, thumbnail, html, group_id: groupId })
  })

  ipcMain.handle('cm:delete', (_e, id: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    return deleteCustomMaterial(safeId)
  })

  ipcMain.handle('cm:incrementUse', (_e, id: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    incrementMaterialUse(safeId)
  })

  ipcMain.handle('cm:updateMeta', (_e, id: unknown, data: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    const obj = validateObject<Record<string, unknown>>(data, 'data')
    const sanitized: { name?: string; keywords?: string[]; group_id?: string | null } = {}
    if (obj.name !== undefined) {
      sanitized.name = validateString(obj.name, 'name', { minLength: 1, maxLength: 200 })
    }
    if (obj.keywords !== undefined) {
      sanitized.keywords = validateArray(obj.keywords, 'keywords', {
        maxLength: 50,
        itemValidator: (item, idx) => validateString(item, `keywords[${idx}]`, { maxLength: 100 })
      })
    }
    if (obj.group_id !== undefined) {
      sanitized.group_id = validateStringOrNull(obj.group_id, 'group_id')
    }
    return updateCustomMaterialMeta(safeId, sanitized)
  })

  ipcMain.handle('cm:updateHtml', (_e, id: unknown, html: unknown, thumbnail: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    const safeHtml = validateString(html, 'html', { minLength: 1, maxLength: 1024 * 1024 })
    const safeThumbnail = validateString(thumbnail, 'thumbnail', { allowEmpty: true, maxLength: 5000 })
    return updateCustomMaterialHtml(safeId, safeHtml, safeThumbnail)
  })

  ipcMain.handle('cm:duplicate', (_e, id: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    return duplicateCustomMaterial(safeId)
  })

  ipcMain.handle('cm:moveToGroup', (_e, materialId: unknown, groupId: unknown) => {
    const safeMaterialId = validateString(materialId, 'materialId', { minLength: 1, maxLength: 100 })
    const safeGroupId = validateStringOrNull(groupId, 'groupId')
    return moveMaterialToGroup(safeMaterialId, safeGroupId)
  })

  // ── Groups ──

  ipcMain.handle('cm:createGroup', (_e, name: unknown) => {
    const safeName = validateString(name, 'name', { minLength: 1, maxLength: 200 })
    return createCustomMaterialGroup(safeName)
  })

  ipcMain.handle('cm:renameGroup', (_e, id: unknown, newName: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    const safeName = validateString(newName, 'newName', { minLength: 1, maxLength: 200 })
    return renameCustomMaterialGroup(safeId, safeName)
  })

  ipcMain.handle('cm:deleteGroup', (_e, id: unknown, alsoDeleteMaterials: unknown) => {
    const safeId = validateString(id, 'id', { minLength: 1, maxLength: 100 })
    const safeAlsoDelete = validateBoolean(alsoDeleteMaterials, 'alsoDeleteMaterials')
    deleteCustomMaterialGroup(safeId, safeAlsoDelete)
  })

  ipcMain.handle('cm:reorderGroups', (_e, ids: unknown) => {
    const safeIds = validateArray(ids, 'ids', {
      minLength: 0,
      maxLength: 500,
      itemValidator: (item, idx) => validateString(item, `ids[${idx}]`, { minLength: 1, maxLength: 100 })
    })
    reorderCustomMaterialGroups(safeIds)
  })

  // ── Import / Export ──

  ipcMain.handle('cm:exportAll', () => {
    const materials = listCustomMaterials()
    const groups = listCustomMaterialGroups()
    return {
      version: 1,
      exportedAt: Date.now(),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sort_order,
      })),
      materials: materials.map((m) => ({
        id: m.id,
        name: m.name,
        kind: m.kind,
        keywords: JSON.parse(m.keywords || '[]'),
        thumbnail: m.thumbnail,
        html: m.html,
        groupId: m.group_id,
        createdAt: m.created_at * 1000,
        updatedAt: m.updated_at * 1000,
        useCount: m.use_count,
      })),
    }
  })

  ipcMain.handle('cm:exportToFile', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true }

    const materials = listCustomMaterials()
    const groups = listCustomMaterialGroups()
    const exportData = {
      version: 1,
      exportedAt: Date.now(),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sort_order,
      })),
      materials: materials.map((m) => ({
        id: m.id,
        name: m.name,
        kind: m.kind,
        keywords: JSON.parse(m.keywords || '[]'),
        thumbnail: m.thumbnail,
        html: m.html,
        groupId: m.group_id,
        createdAt: m.created_at * 1000,
        updatedAt: m.updated_at * 1000,
        useCount: m.use_count,
      })),
    }

    const date = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog(win, {
      title: '导出自定义素材',
      defaultPath: `custom-materials-${date}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) return { canceled: true }

    const fs = await import('fs/promises')
    await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    return { canceled: false, path: result.filePath }
  })

  ipcMain.handle('cm:importFromFile', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true }

    const result = await dialog.showOpenDialog(win, {
      title: '导入自定义素材',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) return { canceled: true }

    const fs = await import('fs/promises')
    const MAX_IMPORT_SIZE = 50 * 1024 * 1024
    const stats = await fs.stat(result.filePaths[0])
    if (stats.size > MAX_IMPORT_SIZE) {
      return { canceled: false, error: `文件超过最大大小 ${MAX_IMPORT_SIZE / 1024 / 1024}MB` }
    }
    const content = await fs.readFile(result.filePaths[0], 'utf-8')

    try {
      const data = JSON.parse(content)
      if (!data.version || !Array.isArray(data.materials)) {
        return { canceled: false, error: '文件格式无效：缺少 version 或 materials 字段' }
      }
      for (const m of data.materials) {
        if (!m.name || !m.kind || !m.html) {
          return { canceled: false, error: `素材 "${m.name || '未知'}" 缺少必需字段（name/kind/html）` }
        }
        if (!MATERIAL_KINDS.includes(m.kind)) {
          return { canceled: false, error: `素材 "${m.name}" 的 kind "${m.kind}" 无效` }
        }
      }
      return { canceled: false, data }
    } catch (err) {
      return { canceled: false, error: `JSON 解析失败：${(err as Error).message}` }
    }
  })

  ipcMain.handle('cm:import', (_e, data: unknown, conflictStrategy: unknown) => {
    const obj = validateObject<Record<string, unknown>>(data, 'data')
    const strategy = validateEnum(conflictStrategy, CONFLICT_STRATEGIES, 'conflictStrategy')

    const existing = listCustomMaterials()
    const existingIds = new Set(existing.map((m) => m.id))

    if (Array.isArray(obj.groups)) {
      for (const g of obj.groups) {
        if (!g || typeof g !== 'object' || !('name' in g)) continue
        const name = validateString((g as Record<string, unknown>).name, 'group.name', { minLength: 1, maxLength: 200 })
        createCustomMaterialGroup(name)
      }
    }

    const imported = { added: 0, skipped: 0, overwritten: 0 }
    if (Array.isArray(obj.materials)) {
      for (const m of obj.materials) {
        if (!m || typeof m !== 'object') continue
        const mat = m as Record<string, unknown>
        const name = validateString(mat.name, 'material.name', { minLength: 1, maxLength: 200 })
        const kind = validateEnum(mat.kind, MATERIAL_KINDS, 'material.kind')
        const html = validateString(mat.html, 'material.html', { minLength: 1, maxLength: 1024 * 1024 })
        const thumbnail = mat.thumbnail
          ? validateString(mat.thumbnail, 'thumbnail', { allowEmpty: true, maxLength: 5000 })
          : html
        const keywords = Array.isArray(mat.keywords)
          ? validateArray(mat.keywords, 'keywords', {
              maxLength: 50,
              itemValidator: (item, idx) => validateString(item, `keywords[${idx}]`, { maxLength: 100 })
            })
          : []
        const groupId = mat.groupId ? validateString(mat.groupId, 'groupId', { maxLength: 100 }) : null
        const id = mat.id ? validateString(mat.id, 'id', { minLength: 1, maxLength: 100 }) : undefined

        if (existingIds.has(id || '')) {
          if (strategy === 'skip') {
            imported.skipped++
            continue
          } else if (strategy === 'new') {
            saveCustomMaterial({
              name, kind, keywords, thumbnail, html, group_id: groupId,
            })
            imported.added++
            continue
          }
          imported.overwritten++
        }

        saveCustomMaterial({ id, name, kind, keywords, thumbnail, html, group_id: groupId })
        if (!existingIds.has(id || '')) {
          imported.added++
        }
      }
    }

    return imported
  })
}
