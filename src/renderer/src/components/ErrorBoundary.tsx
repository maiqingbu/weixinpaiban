import { Component, type ErrorInfo, type ReactNode } from 'react'
import { DefaultErrorFallback } from './ErrorFallback'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
  level?: 'app' | 'section'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', this.props.level || 'app', 'level error:', error, info)
    this.props.onError?.(error, info)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.reset()
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <DefaultErrorFallback
          error={this.state.error}
          reset={this.reset}
          level={this.props.level || 'app'}
        />
      )
    }
    return this.props.children
  }
}
