import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getUpcomingFestivals } from '../festivals'
import type { FestivalMeta } from '../materials/types'

describe('getUpcomingFestivals', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setNow(dateStr: string) {
    vi.setSystemTime(new Date(dateStr))
  }

  it('finds a solar festival within 30 days', () => {
    setNow('2025-01-01T12:00:00Z')
    const festivals: FestivalMeta[] = [
      { name: '春节', month: 1, day: 28, color: '#ff0000', icon: '🧧' },
    ]
    const result = getUpcomingFestivals(festivals)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('春节')
    expect(result[0].daysLeft).toBeGreaterThanOrEqual(25)
    expect(result[0].daysLeft).toBeLessThanOrEqual(28)
  })

  it('returns empty for festivals more than 30 days away', () => {
    setNow('2025-01-01T12:00:00Z')
    const festivals: FestivalMeta[] = [
      { name: '儿童节', month: 6, day: 1, color: '#00ff00', icon: '🎈' },
    ]
    const result = getUpcomingFestivals(festivals)
    expect(result).toHaveLength(0)
  })

  it('returns festivals sorted by daysLeft ascending', () => {
    setNow('2025-01-01T12:00:00Z')
    const festivals: FestivalMeta[] = [
      { name: '较远', month: 1, day: 25, color: '#pink', icon: '💕' },
      { name: '较近', month: 1, day: 15, color: '#green', icon: '🐲' },
    ]
    const result = getUpcomingFestivals(festivals)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('较近')
    expect(result[1].name).toBe('较远')
    expect(result[0].daysLeft).toBeLessThan(result[1].daysLeft)
  })

  it('looks ahead to next year if festival has passed', () => {
    setNow('2025-12-25T12:00:00Z')
    const festivals: FestivalMeta[] = [
      { name: '元旦', month: 1, day: 1, color: '#gold', icon: '🎉' },
    ]
    const result = getUpcomingFestivals(festivals)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('元旦')
    expect(result[0].daysLeft).toBeGreaterThanOrEqual(5)
    expect(result[0].daysLeft).toBeLessThanOrEqual(8)
  })

  it('returns empty array for empty input', () => {
    setNow('2025-06-01T12:00:00Z')
    expect(getUpcomingFestivals([])).toHaveLength(0)
  })

  it('filters out festivals beyond 30 days', () => {
    setNow('2025-01-01T12:00:00Z')
    const festivals: FestivalMeta[] = [
      { name: '三月', month: 3, day: 1, color: '#ccc', icon: '📅' },
    ]
    const result = getUpcomingFestivals(festivals)
    expect(result).toHaveLength(0)
  })

  it('detects festival within a few days', () => {
    // Use Sep 30 noon UTC — Oct 1 local midnight is Sep 30 ~16:00 UTC in +8, so it's still in the future
    setNow('2025-09-30T12:00:00Z')
    const festivals: FestivalMeta[] = [
      { name: '国庆节', month: 10, day: 1, color: '#ff0000', icon: '🇨🇳' },
    ]
    const result = getUpcomingFestivals(festivals)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('国庆节')
    expect(result[0].daysLeft).toBeLessThanOrEqual(1)
  })
})
