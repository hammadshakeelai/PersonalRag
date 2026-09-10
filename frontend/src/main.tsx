import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useRagStore } from './store/useRagStore'

// Expose store globally for programmatic control, testing, and screenshots
if (typeof window !== 'undefined') {
  (window as any).useRagStore = useRagStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
