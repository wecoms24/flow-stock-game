import React from 'react'

interface Props {
  children: React.ReactNode
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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
          <div className="win-panel max-w-md p-6 text-center">
            <h1 className="mb-4 text-2xl font-bold">🚨 오류 발생</h1>
            <p className="mb-4 text-gray-300">
              게임 실행 중 오류가 발생했습니다. 페이지를 새로고침해주세요.
            </p>
            {this.state.error && (
              <pre className="mb-4 overflow-auto rounded bg-black p-2 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <button className="win-button px-6 py-2" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
