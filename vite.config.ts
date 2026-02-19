import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const COOP_COEP = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [
    // sql-wasm.wasm 전용 미들웨어 — wasm() 플러그인보다 먼저 실행하여
    // application/wasm MIME type을 강제 설정. Vite SPA fallback 차단.
    {
      name: 'serve-sql-wasm',
      enforce: 'pre',
      configureServer(server) {
        const candidates = [
          resolve(process.cwd(), 'public/sql-wasm.wasm'),
          resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        ]
        server.middlewares.use((req, res, next) => {
          const pathname = new URL(req.url ?? '/', 'http://x').pathname
          if (pathname !== '/sql-wasm.wasm') return next()
          for (const p of candidates) {
            if (existsSync(p)) {
              const buf = readFileSync(p)
              res.writeHead(200, {
                'Content-Type': 'application/wasm',
                'Content-Length': String(buf.length),
                'Cross-Origin-Resource-Policy': 'same-origin',
              })
              res.end(buf)
              return
            }
          }
          next()
        })
      },
    },
    wasm(),
    topLevelAwait(),
    react(),
    tailwindcss(),
  ],
  server: {
    headers: COOP_COEP,
  },
  preview: {
    headers: COOP_COEP,
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    exclude: ['@subframe7536/sqlite-wasm'],
  },
})
