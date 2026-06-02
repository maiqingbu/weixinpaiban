export interface TimeoutOptions {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
}

export function withTimeout(
  signal: AbortSignal | null | undefined,
  timeoutMs: number
): AbortSignal {
  const controller = new AbortController()
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
    }
  }
  const timer = setTimeout(
    () => controller.abort(new Error(`Request timeout after ${timeoutMs}ms`)),
    timeoutMs
  )
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
  return controller.signal
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...fetchOptions } = options
  return fetch(url, {
    ...fetchOptions,
    signal: withTimeout(fetchOptions.signal, timeoutMs)
  })
}

export async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options)
  return response.json() as Promise<T>
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit & TimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 15000, retries = 0, retryDelayMs = 1000, ...fetchOptions } = options
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, { ...fetchOptions, timeoutMs })
    } catch (err) {
      lastError = err as Error
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs))
      }
    }
  }
  throw lastError || new Error('Fetch failed')
}
