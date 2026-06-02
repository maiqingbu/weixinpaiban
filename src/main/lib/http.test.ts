import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout, fetchWithTimeout } from './http'

describe('withTimeout', () => {
  it('returns a signal that fires after the timeout', async () => {
    const signal = withTimeout(undefined, 50)
    expect(signal.aborted).toBe(false)
    await new Promise((r) => setTimeout(r, 80))
    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(Error)
  })

  it('aborts immediately if parent signal is already aborted', () => {
    const ac = new AbortController()
    ac.abort(new Error('parent'))
    const child = withTimeout(ac.signal, 1000)
    expect(child.aborted).toBe(true)
  })

  it('forwards parent abort to child', () => {
    const ac = new AbortController()
    const child = withTimeout(ac.signal, 1000)
    ac.abort(new Error('parent cancel'))
    expect(child.aborted).toBe(true)
  })
})

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('throws on timeout', async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')))
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const promise = fetchWithTimeout('https://example.com', { timeoutMs: 100 })
    vi.advanceTimersByTime(150)
    await expect(promise).rejects.toThrow()
  })

  it('returns response on success', async () => {
    const mockResp = new Response('ok', { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(mockResp)
    vi.stubGlobal('fetch', fetchMock)
    const resp = await fetchWithTimeout('https://example.com', { timeoutMs: 5000 })
    expect(resp.status).toBe(200)
  })
})
