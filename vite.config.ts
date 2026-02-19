import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { createReadStream } from 'fs'
import { resolve } from 'path'

const SQL_WASM_PATH = resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')

/** sql.js WASM 파일을 node_modules에서 직접 서빙하는 미들웨어
 *  - public/ 파일 유무와 무관하게 항상 동작
 *  - Content-Type: application/wasm 을 명시하여 스트리밍 컴파일 허용
 */
function sqlWasmMiddleware(middlewares: any) {
  middlewares.use('/sql-wasm.wasm', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/wasm')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    createReadStream(SQL_WASM_PATH).pipe(res)
  })
}

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    tailwindcss(),
    {
      name: 'sql-wasm-serve',
      configureServer(server) {
        sqlWasmMiddleware(server.middlewares)
      },
      configurePreviewServer(server) {
        sqlWasmMiddleware(server.middlewares)
      },
    },
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    exclude: ['@subframe7536/sqlite-wasm'],
  },
})
