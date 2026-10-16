import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// UI flows only (`vite --mode mock`): a scripted backend in place of Tauri. `MODE` is replaced
// statically, so a production build drops this branch and the module with it.
if (import.meta.env.MODE === 'mock') {
  await import('./test/mock-backend')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
