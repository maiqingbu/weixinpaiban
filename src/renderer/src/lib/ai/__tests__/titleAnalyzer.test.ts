import { describe, it, expect, beforeEach } from 'vitest'
import {
  setCachedResult,
  getCachedResult,
  invalidateCache,
  clearAllCache,
  getCacheKey,
  computeOverallScore,
  getOverallLevel,
  getScoreLevel,
  getClickbaitLevel,
  getStyleEmoji,
} from '../titleAnalyzer'
import type { TitleAnalysisResult, TitleScores } from '../titleAnalyzer'

// Helper to create a mock TitleAnalysisResult
function makeResult(id = 'test'): TitleAnalysisResult {
  return {
    scores: { attractiveness: 80, truthfulness: 90, clickbaitRisk: 20, platformFit: 75 },
    analysis: {
      attractiveness: 'Good appeal',
      truthfulness: 'Very truthful',
      clickbaitRisk: 'Low risk',
      platformFit: 'Good fit',
    },
    overallComment: 'Good title overall',
    suggestions: [{ title: `Alternative ${id}`, style: '稳健派', reason: 'Balanced' }],
  }
}

describe('Cache functions', () => {
  beforeEach(() => {
    clearAllCache()
  })

  it('setCachedResult stores a result retrievable by key', () => {
    const key = 'test-key'
    const result = makeResult()
    setCachedResult(key, result)
    expect(getCachedResult(key)).toEqual(result)
  })

  it('getCachedResult returns null for unknown key', () => {
    expect(getCachedResult('nonexistent')).toBeNull()
  })

  it('setCachedResult overwrites existing key', () => {
    const key = 'overwrite-key'
    const original = makeResult('original')
    setCachedResult(key, original)
    const updated = makeResult('updated')
    setCachedResult(key, updated)
    expect(getCachedResult(key)!.suggestions[0].title).toBe('Alternative updated')
  })

  it('invalidateCache removes a single key', () => {
    const key1 = 'key-1'
    const key2 = 'key-2'
    setCachedResult(key1, makeResult('a'))
    setCachedResult(key2, makeResult('b'))
    invalidateCache(key1)
    expect(getCachedResult(key1)).toBeNull()
    expect(getCachedResult(key2)).not.toBeNull()
  })

  it('clearAllCache removes all entries', () => {
    setCachedResult('a', makeResult('a'))
    setCachedResult('b', makeResult('b'))
    setCachedResult('c', makeResult('c'))
    clearAllCache()
    expect(getCachedResult('a')).toBeNull()
    expect(getCachedResult('b')).toBeNull()
    expect(getCachedResult('c')).toBeNull()
  })

  it('invalidateCache is a no-op for unknown key', () => {
    // Should not throw
    expect(() => invalidateCache('unknown')).not.toThrow()
  })
})

describe('getCacheKey', () => {
  it('produces stable key for same inputs', () => {
    const key1 = getCacheKey(42, 'My Title', 'Some content here')
    const key2 = getCacheKey(42, 'My Title', 'Some content here')
    expect(key1).toBe(key2)
  })

  it('produces different keys for different articleId', () => {
    const key1 = getCacheKey(1, 'Title', 'Content')
    const key2 = getCacheKey(2, 'Title', 'Content')
    expect(key1).not.toBe(key2)
  })

  it('produces different keys for different title', () => {
    const key1 = getCacheKey(1, 'Title A', 'Content')
    const key2 = getCacheKey(1, 'Title B', 'Content')
    expect(key1).not.toBe(key2)
  })

  it('only uses first 500 chars of content in key', () => {
    const prefix = 'A'.repeat(500)
    const key1 = getCacheKey(1, 'Title', prefix + 'extra content')
    const key2 = getCacheKey(1, 'Title', prefix + 'different extra')
    expect(key1).toBe(key2) // Same because first 500 chars identical
  })
})

describe('computeOverallScore', () => {
  it('computes weighted score correctly', () => {
    const scores: TitleScores = {
      attractiveness: 80,
      truthfulness: 90,
      clickbaitRisk: 20,
      platformFit: 75,
    }
    // 80*0.35 + 90*0.30 + (100-20)*0.20 + 75*0.15
    // = 28 + 27 + 16 + 11.25 = 82.25 → round to 82
    expect(computeOverallScore(scores)).toBe(82)
  })

  it('returns 0 for all-zero scores', () => {
    const scores: TitleScores = { attractiveness: 0, truthfulness: 0, clickbaitRisk: 0, platformFit: 0 }
    expect(computeOverallScore(scores)).toBe(20) // (100-0)*0.20 = 20
  })

  it('penalizes high clickbait risk heavily', () => {
    const good: TitleScores = { attractiveness: 80, truthfulness: 80, clickbaitRisk: 10, platformFit: 80 }
    const bad: TitleScores = { attractiveness: 80, truthfulness: 80, clickbaitRisk: 90, platformFit: 80 }
    expect(computeOverallScore(good)).toBeGreaterThan(computeOverallScore(bad))
  })
})

describe('getOverallLevel', () => {
  it('returns 优秀 for score >= 90', () => {
    expect(getOverallLevel(90).label).toBe('优秀')
    expect(getOverallLevel(95).label).toBe('优秀')
  })
  it('returns 良好 for score >= 75', () => {
    expect(getOverallLevel(75).label).toBe('良好')
    expect(getOverallLevel(80).label).toBe('良好')
  })
  it('returns 一般 for score >= 60', () => {
    expect(getOverallLevel(60).label).toBe('一般')
    expect(getOverallLevel(70).label).toBe('一般')
  })
  it('returns 较差 for score < 60', () => {
    expect(getOverallLevel(59).label).toBe('较差')
    expect(getOverallLevel(0).label).toBe('较差')
  })
})

describe('getScoreLevel', () => {
  it('returns 优秀 for score >= 85 (non-reverse)', () => {
    expect(getScoreLevel(85, false).label).toBe('优秀')
  })
  it('returns 良好 for score >= 70', () => {
    expect(getScoreLevel(70, false).label).toBe('良好')
  })
  it('returns 一般 for score >= 50', () => {
    expect(getScoreLevel(50, false).label).toBe('一般')
  })
  it('returns 较差 for score < 50', () => {
    expect(getScoreLevel(49, false).label).toBe('较差')
  })
  it('reverses score when isReverse is true', () => {
    // With reverse, 20 becomes 80 → 良好
    expect(getScoreLevel(20, true).label).toBe('良好')
  })
})

describe('getClickbaitLevel', () => {
  it('returns 低风险 for risk <= 20', () => {
    expect(getClickbaitLevel(10).label).toBe('低风险')
  })
  it('returns 轻微 for risk <= 40', () => {
    expect(getClickbaitLevel(30).label).toBe('轻微')
  })
  it('returns 中等 for risk <= 60', () => {
    expect(getClickbaitLevel(50).label).toBe('中等')
  })
  it('returns 高风险 for risk > 60', () => {
    expect(getClickbaitLevel(70).label).toBe('高风险')
  })
})

describe('getStyleEmoji', () => {
  it('matches known styles', () => {
    expect(getStyleEmoji('稳健派')).toBe('🛡')
    expect(getStyleEmoji('数字派标题')).toBe('🔢')
    expect(getStyleEmoji('悬念派')).toBe('🎭')
    expect(getStyleEmoji('吸引派风格')).toBe('⚡')
    expect(getStyleEmoji('直白派')).toBe('📰')
  })
  it('returns fallback emoji for unknown style', () => {
    expect(getStyleEmoji('未知风格')).toBe('📌')
  })
})

