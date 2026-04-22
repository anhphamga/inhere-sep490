import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './style/index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

if (import.meta.env.DEV) {
  const originalConsoleError = console.error
  console.error = (...args) => {
    const firstArg = String(args?.[0] || '')
    if (firstArg.includes('Warning: findDOMNode is deprecated')) return
    originalConsoleError(...args)
  }
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
