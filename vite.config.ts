import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// O Vite adiciona ?v=HASH a todos os módulos servidos pelo dev server.
// Esse hash muda após npm run build ou restart, fazendo o dynamic import
// do openscad-wasm-prebuilt falhar com "Failed to fetch dynamically imported module"
// quando o browser ainda tem a referência antiga.
//
// Fix: middleware que remove ?v= das requisições ao pacote WASM,
// fazendo o Vite sempre servir a versão atual sem depender do hash.
function openscadWasmStable(): Plugin {
  return {
    name: 'openscad-wasm-stable',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.includes('openscad-wasm-prebuilt') && req.url.includes('?v=')) {
          req.url = req.url.replace(/[?&]v=[^&]+/, '')
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/forja3d/',
  plugins: [
    react(),
    tailwindcss(),
    openscadWasmStable(),
  ],
  optimizeDeps: {
    // Excluir do pre-bundling: o arquivo tem 11 MB (WASM em base64)
    // e não precisa de transformação pelo Vite.
    exclude: ['openscad-wasm-prebuilt'],
  },
})
