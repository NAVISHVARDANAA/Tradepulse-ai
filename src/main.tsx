import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MfaGate } from './components/MfaGate'
import './index.css'
import { AuthProvider } from './lib/auth/AuthProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <MfaGate>
        <App />
      </MfaGate>
    </AuthProvider>
  </React.StrictMode>,
)
