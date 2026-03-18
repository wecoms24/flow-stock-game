import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Production error reporting hook — integrate Sentry or custom endpoint here
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      try {
        const payload = {
          message: error.message,
          stack: error.stack?.slice(0, 2000),
          componentStack: errorInfo.componentStack?.slice(0, 2000),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }
        // Beacon API for reliable delivery even during page unload
        navigator.sendBeacon?.('/api/error-report', JSON.stringify(payload))
      } catch {
        // Silently fail — error reporting should never break the app
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className="flex h-screen items-center justify-center bg-gray-900 text-white"
          role="alert"
          aria-live="assertive"
        >
          <div className="win-panel max-w-md p-6 text-center">
            <h1 className="mb-4 text-2xl font-bold">오류 발생</h1>
            <p className="mb-4 text-gray-300">
              게임 실행 중 오류가 발생했습니다. 페이지를 새로고침해주세요.
            </p>
            {this.state.error && (
              <pre className="mb-4 overflow-auto rounded bg-black p-2 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <button
              className="win-button px-6 py-2"
              onClick={() => window.location.reload()}
              aria-label="페이지 새로고침"
            >
              새로고침
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
