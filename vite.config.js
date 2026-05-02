import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const netlifyDev = mode === 'netlify-dev'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Netlify Dev listens on 8888 and proxies to Vite on 5173. Do NOT set hmr.port to 8888 — that
    // makes Vite try to bind its WebSocket server on 8888 and fights Netlify → HTTP GET returns 426 Upgrade Required on Windows.
    server: netlifyDev
      ? {
          port: 5173,
          strictPort: true,
          origin: 'http://localhost:8888',
          hmr: {
            clientPort: 8888,
          },
        }
      : undefined,
  }
})
