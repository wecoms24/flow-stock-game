import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const COOP_COEP = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

/**
 * sql-wasm.wasm을 virtual module 'virtual:sql-wasm-base64' 로 번들에 인라인.
 * URL fetch를 완전히 우회하므로 nginx/proxy MIME type 문제에 영향받지 않음.
 */
function sqlWasmInlinePlugin(): Plugin {
  const VIRTUAL_ID = 'virtual:sql-wasm-base64'
  const RESOLVED_ID = '\0' + VIRTUAL_ID

  return {
    name: 'sql-wasm-inline',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      const candidates = [
        resolve(process.cwd(), 'public/sql-wasm.wasm'),
        resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
      ]
      for (const p of candidates) {
        try {
          const base64 = readFileSync(p).toString('base64')
          return `export default "${base64}"`
        } catch {
          // 파일 없으면 다음 후보로
        }
      }
      throw new Error('[sql-wasm-inline] sql-wasm.wasm을 찾을 수 없습니다.')
    },
  }
}

export default defineConfig({
  plugins: [sqlWasmInlinePlugin(), wasm(), topLevelAwait(), react(), tailwindcss()],
  esbuild: {
    // 프로덕션 빌드에서 console/debugger 문 제거
    drop: ['console', 'debugger'],
  },
  server: {
    headers: COOP_COEP,
    watch: {
      // Python venv, scripts 디렉토리 감시 제외 → ENOSPC 방지
      ignored: ['**/scripts/venv/**', '**/scripts/__pycache__/**'],
    },
    proxy: {
      // NOTE: 개발 전용 프록시 — 프로덕션에서는 별도 백엔드 프록시 사용
      '/kis-api': {
        target: 'https://openapi.koreainvestment.com:9443',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kis-api/, ''),
        // secure: false — 개발 환경 전용 (self-signed cert 허용).
        // 프로덕션 백엔드 프록시에서는 반드시 SSL 검증 활성화할 것.
        secure: false,
      },
    },
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
