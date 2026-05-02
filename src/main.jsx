import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="fs-theme" disableTransitionOnChange>
    <App />
  </ThemeProvider>
)

// Avoid registering the app SW during `vite` — it can cause 404s on optimized deps.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister())
    })
  } else {
    navigator.serviceWorker.register('/sw.js')
  }
}
