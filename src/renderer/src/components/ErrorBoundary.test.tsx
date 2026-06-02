import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return null
}

function mountInDiv(element: React.ReactElement): { container: HTMLDivElement; unmount: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    }
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { container } = mountInDiv(
      <ErrorBoundary>
        <div>No error here</div>
      </ErrorBoundary>
    )
    expect(container.textContent).toContain('No error here')
  })

  it('catches errors and shows default fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = mountInDiv(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(container.textContent).toContain('Test error')
    expect(container.textContent).toContain('Error')
    consoleSpy.mockRestore()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mountInDiv(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(onError).toHaveBeenCalledTimes(1)
    expect((onError.mock.calls[0][0] as Error).message).toBe('Test error')
    consoleSpy.mockRestore()
  })

  it('uses custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fallback = vi.fn((error: Error) => <div>Custom: {error.message}</div>)
    const { container } = mountInDiv(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(fallback).toHaveBeenCalled()
    expect(container.textContent).toContain('Custom: Test error')
    consoleSpy.mockRestore()
  })

  it('recoverable: shows retry button in section mode', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = mountInDiv(
      <ErrorBoundary level="section">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(container.textContent).toContain('重试')
    consoleSpy.mockRestore()
  })

  it('recoverable: shows reload button in app mode', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = mountInDiv(
      <ErrorBoundary level="app">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(container.textContent).toContain('重新加载')
    consoleSpy.mockRestore()
  })
})
