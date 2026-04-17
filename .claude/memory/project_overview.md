---
name: Visão geral do projeto Forja3D
description: Stack, repositório, deploy e estrutura de pastas do projeto
type: project
originSessionId: 7bb87f33-c75b-4886-98cb-59cbe0253db7
---
**Forja3D** é uma web app que gera modelos 3D paramétricos (cortadores de biscoito, carimbos, chaveiros) diretamente no browser e exporta STL para impressão 3D.

- **Stack:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **Rendering:** OpenSCAD WASM (`openscad-wasm-prebuilt`) como builder principal para cortador de biscoito; Three.js como fallback/preview
- **Deploy:** GitHub Pages — totalmente estático, sem backend na V1
- **Repositório:** https://github.com/almeidaguil/forja3d
- **Caminho local:** `/Users/guisalmeida/Documents/Pessoal/forja3d`
- **Site ao vivo:** https://almeidaguil.github.io/forja3d/

**Estrutura:**
```
src/
  domain/          ← entidades puras (sem deps externas)
  application/     ← casos de uso + ports (interfaces)
  infrastructure/  ← adaptadores (OpenSCAD, Three.js, Canvas)
  presentation/    ← React (páginas, componentes, hooks)
  shared/          ← tipos globais, constantes
  data/            ← modelos JSON (cookie-cutter, stamp, keychain)
```

**Why:** Projeto pessoal/portfólio do Guilherme Almeida, conta GitHub `almeidaguil`.
**How to apply:** Ao sugerir soluções, lembrar que é client-side only (GitHub Pages), sem backend, sem auth na V1.
