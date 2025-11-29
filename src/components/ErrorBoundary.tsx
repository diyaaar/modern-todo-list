import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { initializationError } from '../lib/supabase'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    // Check for Supabase initialization error first
    if (initializationError) {
      const isSecretKeyError = initializationError.message.includes('SECRET key')
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-background-secondary border border-danger/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-danger" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                  Configuration Error
                </h1>
                {isSecretKeyError ? (
                  <div className="space-y-4">
                    <p className="text-text-secondary">
                      You are using a <strong>SECRET key</strong> in your environment file, which cannot be used in the browser.
                    </p>
                    <div className="bg-background-tertiary rounded-lg p-4 space-y-2">
                      <p className="text-text-primary font-medium">To fix this:</p>
                      <ol className="list-decimal list-inside space-y-1 text-text-secondary text-sm">
                        <li>Go to your Supabase dashboard: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com/dashboard</a></li>
                        <li>Select your project → Settings → API</li>
                        <li>Copy the <strong>anon public</strong> key (starts with <code className="bg-background-secondary px-1 rounded">eyJ...</code>)</li>
                        <li>Update your <code className="bg-background-secondary px-1 rounded">.env</code> file: Replace <code className="bg-background-secondary px-1 rounded">VITE_SUPABASE_ANON_KEY=sb_secret_...</code> with <code className="bg-background-secondary px-1 rounded">VITE_SUPABASE_ANON_KEY=eyJ...</code></li>
                        <li>Restart the dev server</li>
                      </ol>
                    </div>
                    <p className="text-xs text-text-tertiary mt-4">
                      See <code className="bg-background-secondary px-1 rounded">FIX_ENV.md</code> for detailed instructions.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-text-secondary mb-4 whitespace-pre-line">{initializationError.message}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    if (this.state.hasError) {
      const isSecretKeyError = this.state.error?.message.includes('SECRET key')
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-background-secondary border border-danger/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-danger" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                  Configuration Error
                </h1>
                {isSecretKeyError ? (
                  <div className="space-y-4">
                    <p className="text-text-secondary">
                      You are using a <strong>SECRET key</strong> in your environment file, which cannot be used in the browser.
                    </p>
                    <div className="bg-background-tertiary rounded-lg p-4 space-y-2">
                      <p className="text-text-primary font-medium">To fix this:</p>
                      <ol className="list-decimal list-inside space-y-1 text-text-secondary text-sm">
                        <li>Go to your Supabase dashboard: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com/dashboard</a></li>
                        <li>Select your project → Settings → API</li>
                        <li>Copy the <strong>anon public</strong> key (starts with <code className="bg-background-secondary px-1 rounded">eyJ...</code>)</li>
                        <li>Update your <code className="bg-background-secondary px-1 rounded">.env</code> file with the anon key</li>
                        <li>Restart the dev server</li>
                      </ol>
                    </div>
                    <p className="text-xs text-text-tertiary mt-4">
                      See <code className="bg-background-secondary px-1 rounded">FIX_ENV.md</code> for detailed instructions.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-text-secondary mb-4">{this.state.error?.message}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

