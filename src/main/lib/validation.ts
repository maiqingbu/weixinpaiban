export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a finite number`, fieldName)
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName)
  }
  if (options.min !== undefined && value < options.min) {
    throw new ValidationError(`${fieldName} must be >= ${options.min}`, fieldName)
  }
  if (options.max !== undefined && value > options.max) {
    throw new ValidationError(`${fieldName} must be <= ${options.max}`, fieldName)
  }
  return value
}

export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; allowEmpty?: boolean } = {}
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName)
  }
  if (!options.allowEmpty && value.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName)
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters`,
      fieldName
    )
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${options.maxLength} characters`,
      fieldName
    )
  }
  return value
}

export function validateStringOrNull(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) return null
  return validateString(value, fieldName, { allowEmpty: true })
}

export function validateHtmlContent(
  value: unknown,
  fieldName: string,
  maxLength = 50 * 1024 * 1024
): string {
  const str = validateString(value, fieldName, { allowEmpty: true, maxLength })
  if (str.length > maxLength) {
    throw new ValidationError(
      `${fieldName} exceeds maximum length of ${maxLength} bytes`,
      fieldName
    )
  }
  return str
}

export function validateId(value: unknown, fieldName: string = 'id'): number {
  return validateNumber(value, fieldName, { min: 1, integer: true })
}

/**
 * 校验 16 进制短 id（preview server 用）
 * - 必须由 a-f0-9 组成
 * - 长度 8-32
 */
export function validateHexId(value: unknown, fieldName: string = 'id'): string {
  const str = validateString(value, fieldName, { minLength: 8, maxLength: 32 })
  if (!/^[a-f0-9]+$/i.test(str)) {
    throw new ValidationError(`${fieldName} must be a hex string`, fieldName)
  }
  return str
}

export function validateUrl(value: unknown, fieldName: string): string {
  const str = validateString(value, fieldName)
  try {
    const url = new URL(str)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ValidationError(`${fieldName} must use http or https protocol`, fieldName)
    }
    return str
  } catch (err) {
    if (err instanceof ValidationError) throw err
    throw new ValidationError(`${fieldName} is not a valid URL`, fieldName)
  }
}

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`, fieldName)
  }
  return value as T
}

export function validateObject<T extends Record<string, unknown>>(
  value: unknown,
  fieldName: string
): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName)
  }
  return value as T
}

export function safeValidate<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch (err) {
    if (err instanceof ValidationError) {
      console.warn(`[validation] ${err.message}`)
    } else {
      console.error('[validation] Unexpected error:', err)
    }
    return fallback
  }
}

export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} must be a boolean`, fieldName)
  }
  return value
}

export function validateArray<T = unknown>(
  value: unknown,
  fieldName: string,
  options: {
    minLength?: number
    maxLength?: number
    itemValidator?: (item: unknown, index: number) => T
  } = {}
): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName)
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${options.minLength} items`,
      fieldName
    )
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must have at most ${options.maxLength} items`,
      fieldName
    )
  }
  if (options.itemValidator) {
    return value.map((item, i) => options.itemValidator!(item, i))
  }
  return value as T[]
}

export function validateFilePath(value: unknown, fieldName: string): string {
  const str = validateString(value, fieldName, { maxLength: 4096 })
  if (str.includes('\0')) {
    throw new ValidationError(`${fieldName} contains null bytes`, fieldName)
  }
  return str
}

export function validateSafePath(value: unknown, fieldName: string, baseDir?: string): string {
  const str = validateFilePath(value, fieldName)
  if (str.includes('..')) {
    throw new ValidationError(`${fieldName} contains path traversal '..'`, fieldName)
  }
  if (/^[a-zA-Z]:[\\/]/.test(str) || str.startsWith('/')) {
    if (baseDir && !str.startsWith(baseDir)) {
      throw new ValidationError(`${fieldName} is outside allowed directory`, fieldName)
    }
  }
  return str
}

export interface AISchema {
  providerId: string
  modelId: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  stream?: boolean
  model?: string
}

const AI_ROLES = ['system', 'user', 'assistant'] as const

export function validateAIInput(value: unknown, fieldName: string): AISchema {
  const obj = validateObject<Record<string, unknown>>(value, fieldName)
  return {
    providerId: validateString(obj.providerId, 'providerId', { minLength: 1, maxLength: 100 }),
    modelId: validateString(obj.modelId, 'modelId', { minLength: 1, maxLength: 100 }),
    messages: validateArray(obj.messages, 'messages', {
      minLength: 1,
      maxLength: 200,
      itemValidator: (item, idx) => {
        const msg = validateObject<Record<string, unknown>>(item, `messages[${idx}]`)
        return {
          role: validateEnum(msg.role, AI_ROLES, `messages[${idx}].role`),
          content: validateString(msg.content, `messages[${idx}].content`, {
            maxLength: 100 * 1024
          })
        }
      }
    }),
    ...(obj.temperature !== undefined && {
      temperature: validateNumber(obj.temperature, 'temperature', { min: 0, max: 2 })
    }),
    ...(obj.maxTokens !== undefined && {
      maxTokens: validateNumber(obj.maxTokens, 'maxTokens', { min: 1, max: 32000, integer: true })
    }),
    ...(obj.systemPrompt !== undefined && {
      systemPrompt: validateString(obj.systemPrompt, 'systemPrompt', {
        allowEmpty: true,
        maxLength: 32 * 1024
      })
    }),
    ...(obj.stream !== undefined && { stream: validateBoolean(obj.stream, 'stream') }),
    ...(obj.model !== undefined && {
      model: validateString(obj.model, 'model', { minLength: 1, maxLength: 200 })
    })
  }
}

export interface ProviderSchema {
  id: string
  name: string
  type: 'openai' | 'custom' | 'anthropic' | 'gemini' | string
  apiKey: string
  apiBase: string
  model: string
  enabled?: boolean
}

export function validateProvider(value: unknown, fieldName: string): ProviderSchema {
  const obj = validateObject<Record<string, unknown>>(value, fieldName)
  return {
    id: validateString(obj.id, 'id', { minLength: 1, maxLength: 100 }),
    name: validateString(obj.name, 'name', { minLength: 1, maxLength: 200 }),
    type: validateString(obj.type, 'type', { minLength: 1, maxLength: 50 }),
    apiKey: validateString(obj.apiKey, 'apiKey', { minLength: 1, maxLength: 1024 }),
    apiBase: validateString(obj.apiBase, 'apiBase', { minLength: 1, maxLength: 500 }),
    model: validateString(obj.model, 'model', { minLength: 1, maxLength: 200 }),
    ...(obj.enabled !== undefined && { enabled: validateBoolean(obj.enabled, 'enabled') })
  }
}

export function validateCustomMaterial(
  value: unknown,
  fieldName: string
): {
  name: string
  kind: string
  keywords: string
  thumbnail: string
  html: string
  groupId: string | null
} {
  const obj = validateObject<Record<string, unknown>>(value, fieldName)
  return {
    name: validateString(obj.name, 'name', { minLength: 1, maxLength: 200 }),
    kind: validateString(obj.kind, 'kind', { minLength: 1, maxLength: 50 }),
    keywords: validateString(obj.keywords ?? '', 'keywords', { allowEmpty: true, maxLength: 500 }),
    thumbnail: validateString(obj.thumbnail ?? '', 'thumbnail', {
      allowEmpty: true,
      maxLength: 5000
    }),
    html: validateString(obj.html, 'html', { minLength: 1, maxLength: 1024 * 1024 }),
    groupId: validateStringOrNull(obj.groupId, 'groupId')
  }
}

export function validateSearchQuery(value: unknown, fieldName: string): string {
  return validateString(value, fieldName, { minLength: 1, maxLength: 500 })
}
