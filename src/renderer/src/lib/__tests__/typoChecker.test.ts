import { describe, it, expect } from 'vitest'
import { checkTypos } from '../linter/typoChecker'

describe('checkTypos', () => {
  it('finds a common typo (做为 → 作为)', () => {
    const issues = checkTypos('他做为一名工程师', new Set())
    const found = issues.find((i) => i.word === '做为')
    expect(found).toBeDefined()
    expect(found!.suggestion).toBe('作为')
  })

  it('respects ignore list', () => {
    const ignore = new Set(['做为'])
    const issues = checkTypos('他做为一名工程师', ignore)
    const found = issues.find((i) => i.word === '做为')
    expect(found).toBeUndefined()
  })

  it('returns empty for clean text', () => {
    const issues = checkTypos('天气很好', new Set())
    expect(issues).toHaveLength(0)
  })

  it('returns empty for empty input', () => {
    const issues = checkTypos('', new Set())
    expect(issues).toHaveLength(0)
  })

  it('finds multiple occurrences of same word', () => {
    const issues = checkTypos('他做为一名工程师，也被做为顾问聘请', new Set())
    const count = issues.filter((i) => i.word === '做为').length
    expect(count).toBe(2)
  })

  it('returns issues with correct properties', () => {
    const issues = checkTypos('他做为工程师', new Set())
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]).toHaveProperty('word')
    expect(issues[0]).toHaveProperty('suggestion')
    expect(issues[0]).toHaveProperty('reason')
    expect(issues[0]).toHaveProperty('start')
    expect(issues[0]).toHaveProperty('end')
    expect(issues[0]).toHaveProperty('category')
  })
})
