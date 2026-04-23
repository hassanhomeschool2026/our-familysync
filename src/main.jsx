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

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => {
      if (import.meta.env.DEV) {
        /* eslint-disable no-console */
        console.log('Service worker registered', reg.scope);
      }
    })
    .catch((err) => console.warn('Service worker registration failed:', err));
}
