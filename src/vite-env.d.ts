/// <reference types="vite/client" />

// vite-plugin-wasm: .wasm import → 사전 컴파일된 WebAssembly.Module 반환
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
