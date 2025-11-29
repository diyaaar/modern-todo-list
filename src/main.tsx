import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

try {
  ReactDOM.createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
} catch (error) {
  console.error('Failed to render app:', error)
  rootElement.innerHTML = `
    <div style="padding: 40px; color: #ef4444; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div style="max-width: 600px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Configuration Error</h1>
        <p style="margin-bottom: 16px;">You are using a SECRET key in your .env file. Please update it with the ANON key from your Supabase dashboard.</p>
        <p style="font-size: 14px; color: #9ca3af;">See FIX_ENV.md for instructions.</p>
      </div>
    </div>
  `
}

