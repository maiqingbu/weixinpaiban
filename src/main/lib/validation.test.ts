import { describe, it, expect } from 'vitest'
import {
  validateNumber,
  validateString,
  validateStringOrNull,
  validateUrl,
  validateId,
  validateObject,
  validateEnum,
  validateHexId,
  safeValidate,
  ValidationError
} from './validation'

describe('validateNumber', () => {
  it('accepts valid finite numbers', () => {
    expect(validateNumber(42, 'x')).toBe(42)
    expect(validateNumber(0, 'x')).toBe(0)
    expect(validateNumber(-1.5, 'x')).toBe(-1.5)
  })

  it('rejects non-numbers', () => {
    expect(() => validateNumber('1', 'x')).toThrow(ValidationError)
    expect(() => validateNumber(null, 'x')).toThrow(ValidationError)
    expect(() => validateNumber(undefined, 'x')).toThrow(ValidationError)
    expect(() => validateNumber(NaN, 'x')).toThrow(ValidationError)
    expect(() => validateNumber(Infinity, 'x')).toThrow(ValidationError)
  })

  it('enforces integer constraint', () => {
    expect(() => validateNumber(1.5, 'x', { integer: true })).toThrow(ValidationError)
    expect(validateNumber(2, 'x', { integer: true })).toBe(2)
  })

  it('enforces min/max bounds', () => {
    expect(() => validateNumber(0, 'x', { min: 1 })).toThrow(ValidationError)
    expect(() => validateNumber(11, 'x', { max: 10 })).toThrow(ValidationError)
    expect(validateNumber(5, 'x', { min: 1, max: 10 })).toBe(5)
  })
})

describe('validateString', () => {
  it('accepts valid strings', () => {
    expect(validateString('hello', 'x')).toBe('hello')
  })

  it('rejects non-strings', () => {
    expect(() => validateString(123, 'x')).toThrow(ValidationError)
    expect(() => validateString(null, 'x')).toThrow(ValidationError)
    expect(() => validateString([], 'x')).toThrow(ValidationError)
  })

  it('enforces length constraints', () => {
    expect(() => validateString('', 'x')).toThrow(ValidationError)
    expect(validateString('', 'x', { allowEmpty: true })).toBe('')
    expect(() => validateString('ab', 'x', { minLength: 3 })).toThrow(ValidationError)
    expect(() => validateString('abcdef', 'x', { maxLength: 3 })).toThrow(ValidationError)
  })
})

describe('validateStringOrNull', () => {
  it('accepts null and undefined', () => {
    expect(validateStringOrNull(null, 'x')).toBeNull()
    expect(validateStringOrNull(undefined, 'x')).toBeNull()
  })

  it('accepts valid strings', () => {
    expect(validateStringOrNull('hello', 'x')).toBe('hello')
    expect(validateStringOrNull('', 'x')).toBe('')
  })
})

describe('validateUrl', () => {
  it('accepts http and https URLs', () => {
    expect(validateUrl('https://example.com', 'x')).toBe('https://example.com')
    expect(validateUrl('http://example.com/path', 'x')).toBe('http://example.com/path')
  })

  it('rejects invalid URLs', () => {
    expect(() => validateUrl('not-a-url', 'x')).toThrow(ValidationError)
    expect(() => validateUrl('javascript:alert(1)', 'x')).toThrow(ValidationError)
    expect(() => validateUrl('ftp://example.com', 'x')).toThrow(ValidationError)
    expect(() => validateUrl('file:///etc/passwd', 'x')).toThrow(ValidationError)
  })
})

describe('validateId', () => {
  it('accepts positive integers', () => {
    expect(validateId(1)).toBe(1)
    expect(validateId(1000)).toBe(1000)
  })

  it('rejects non-positive or non-integer values', () => {
    expect(() => validateId(0)).toThrow(ValidationError)
    expect(() => validateId(-1)).toThrow(ValidationError)
    expect(() => validateId(1.5)).toThrow(ValidationError)
    expect(() => validateId('1')).toThrow(ValidationError)
  })
})

describe('validateObject', () => {
  it('accepts plain objects', () => {
    expect(validateObject({ a: 1 }, 'x')).toEqual({ a: 1 })
  })

  it('rejects non-objects', () => {
    expect(() => validateObject(null, 'x')).toThrow(ValidationError)
    expect(() => validateObject('string', 'x')).toThrow(ValidationError)
    expect(() => validateObject([1, 2], 'x')).toThrow(ValidationError)
  })
})

describe('validateEnum', () => {
  const ALLOWED = ['a', 'b', 'c'] as const

  it('accepts allowed values', () => {
    expect(validateEnum('a', ALLOWED, 'x')).toBe('a')
    expect(validateEnum('b', ALLOWED, 'x')).toBe('b')
  })

  it('rejects disallowed values', () => {
    expect(() => validateEnum('d', ALLOWED, 'x')).toThrow(ValidationError)
    expect(() => validateEnum(123, ALLOWED, 'x')).toThrow(ValidationError)
  })
})

describe('safeValidate', () => {
  it('returns value on success', () => {
    const result = safeValidate(() => 42, 0)
    expect(result).toBe(42)
  })

  it('returns fallback on ValidationError', () => {
    const result = safeValidate(() => {
      throw new ValidationError('bad')
    }, 'fallback')
    expect(result).toBe('fallback')
  })

  it('returns fallback on other errors', () => {
    const result = safeValidate(() => {
      throw new Error('unexpected')
    }, 'fallback')
    expect(result).toBe('fallback')
  })
})

describe('validateHexId', () => {
  it('accepts valid hex strings', () => {
    expect(validateHexId('abcdef0123456789', 'id')).toBe('abcdef0123456789')
    expect(validateHexId('12345678', 'id')).toBe('12345678')
  })

  it('rejects non-hex characters', () => {
    expect(() => validateHexId('xyz12345', 'id')).toThrow(ValidationError)
    expect(() => validateHexId('abc-def', 'id')).toThrow(ValidationError)
    expect(() => validateHexId('<script>', 'id')).toThrow(ValidationError)
  })

  it('rejects too short / too long strings', () => {
    expect(() => validateHexId('ab', 'id')).toThrow(ValidationError)
    expect(() => validateHexId('a'.repeat(40), 'id')).toThrow(ValidationError)
  })

  it('rejects non-strings', () => {
    expect(() => validateHexId(123, 'id')).toThrow(ValidationError)
    expect(() => validateHexId(null, 'id')).toThrow(ValidationError)
  })
})
