/// <reference types="vite/client" />

// vite-plugin-wasm: .wasm import → 사전 컴파일된 WebAssembly.Module 반환
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}

// sql-wasm-inline plugin: sql-wasm.wasm을 base64 문자열로 번들에 인라인
declare module 'virtual:sql-wasm-base64' {
  const base64: string
  export default base64
}
