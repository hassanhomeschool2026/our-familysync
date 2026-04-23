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

// Service worker breaks Vite / Netlify dev (HMR and module scripts must not be intercepted).
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch((err) => console.warn('Service worker registration failed:', err));
}
