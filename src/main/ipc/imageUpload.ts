import { ipcMain, safeStorage } from 'electron'
import { getUploader } from '../../lib/imageUpload/providers'
import {
  validateString,
  validateObject,
  ValidationError
} from '../lib/validation'

const MAX_CONFIG_VALUE_LENGTH = 8192
const MAX_CONFIG_KEY_LENGTH = 100
const MAX_FILE_NAME_LENGTH = 255
const MAX_BUFFER_BYTES = 50 * 1024 * 1024

function encryptConfig(config: Record<string, string>): Buffer {
  const json = JSON.stringify(config)
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(json)
  }
  return Buffer.from(json, 'utf-8')
}

function decryptConfig(encrypted: Buffer): Record<string, string> {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const json = safeStorage.decryptString(encrypted)
      return JSON.parse(json)
    }
    return JSON.parse(encrypted.toString('utf-8'))
  } catch {
    return {}
  }
}

function validateConfig(value: unknown, fieldName: string): Record<string, string> {
  const obj = validateObject<Record<string, unknown>>(value, fieldName)
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (key.length > MAX_CONFIG_KEY_LENGTH) {
      throw new ValidationError(`config key "${key.slice(0, 30)}..." exceeds ${MAX_CONFIG_KEY_LENGTH} chars`, `${fieldName}.${key}`)
    }
    if (val === null || val === undefined) {
      result[key] = ''
      continue
    }
    if (typeof val !== 'string') {
      throw new ValidationError(`config value for "${key}" must be string`, `${fieldName}.${key}`)
    }
    if (val.length > MAX_CONFIG_VALUE_LENGTH) {
      throw new ValidationError(`config value for "${key}" exceeds ${MAX_CONFIG_VALUE_LENGTH} chars`, `${fieldName}.${key}`)
    }
    result[key] = val
  }
  return result
}

export function registerImageUploadHandlers(db: any): void {
  // ── Image Host Config CRUD ──
  ipcMain.handle('image-host:save-config', (_e, providerId: unknown, config: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeConfig = validateConfig(config, 'config')
    const encrypted = encryptConfig(safeConfig)
    return db
      .prepare(
        'INSERT INTO image_host_configs (provider_id, encrypted_config, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(provider_id) DO UPDATE SET encrypted_config = ?, updated_at = unixepoch()'
      )
      .run(safeProviderId, encrypted, encrypted)
  })

  ipcMain.handle('image-host:get-config', (_e, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const row = db
      .prepare('SELECT encrypted_config FROM image_host_configs WHERE provider_id = ?')
      .get(safeProviderId) as { encrypted_config: Buffer } | undefined
    if (!row) return null
    return decryptConfig(row.encrypted_config)
  })

  ipcMain.handle('image-host:delete-config', (_e, providerId: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    return db.prepare('DELETE FROM image_host_configs WHERE provider_id = ?').run(safeProviderId).changes > 0
  })

  ipcMain.handle('image-host:list-configured', () => {
    const rows = db.prepare('SELECT provider_id FROM image_host_configs').all() as { provider_id: string }[]
    return rows.map((r) => r.provider_id)
  })

  // ── Image Host Settings ──
  ipcMain.handle('image-host:get-setting', (_e, key: unknown) => {
    const safeKey = validateString(key, 'key', { minLength: 1, maxLength: 100 })
    const row = db.prepare('SELECT value FROM image_host_settings WHERE key = ?').get(safeKey) as { value: string } | undefined
    return row?.value ?? null
  })

  ipcMain.handle('image-host:set-setting', (_e, key: unknown, value: unknown) => {
    const safeKey = validateString(key, 'key', { minLength: 1, maxLength: 100 })
    const safeValue = validateString(value, 'value', { allowEmpty: true, maxLength: MAX_CONFIG_VALUE_LENGTH })
    return db
      .prepare(
        'INSERT INTO image_host_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
      )
      .run(safeKey, safeValue, safeValue)
  })

  // ── Upload (proxied through main process to bypass CORS) ──
  ipcMain.handle('image:upload', async (_e, providerId: unknown, fileData: unknown, config: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeFile = validateObject<Record<string, unknown>>(fileData, 'fileData')
    const safeName = validateString(safeFile.name, 'fileData.name', { minLength: 1, maxLength: MAX_FILE_NAME_LENGTH })
    if (!(safeFile.buffer instanceof ArrayBuffer)) {
      throw new ValidationError('fileData.buffer must be an ArrayBuffer', 'fileData.buffer')
    }
    if (safeFile.buffer.byteLength > MAX_BUFFER_BYTES) {
      throw new ValidationError(`File too large (max ${MAX_BUFFER_BYTES / 1024 / 1024}MB)`, 'fileData.buffer')
    }
    const safeConfig = validateConfig(config, 'config')

    const provider = getUploader(safeProviderId)
    try {
      const buffer = Buffer.from(safeFile.buffer)
      const result = await provider.upload(buffer, safeName, safeConfig)
      return { success: true, data: result }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Test Connection ──
  ipcMain.handle('image:test-connection', async (_e, providerId: unknown, config: unknown) => {
    const safeProviderId = validateString(providerId, 'providerId', { minLength: 1, maxLength: 100 })
    const safeConfig = validateConfig(config, 'config')
    const provider = getUploader(safeProviderId)
    return provider.testConnection(safeConfig)
  })
}
