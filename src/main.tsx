import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { canRefract } from './lib/glass'

try {
  const theme = localStorage.getItem('zyklus-theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme)
} catch {
  /* storage blocked */
}

// the LiquidButton noise refraction only where backdrop-filter: url() renders (Chromium)
if (canRefract()) document.documentElement.setAttribute('data-refract', 'on')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined)
  })
}
