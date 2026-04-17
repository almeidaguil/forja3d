---
name: Estado atual do projeto e próximos passos
description: O que está funcionando, o que está pendente, e próxima prioridade
type: project
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Estado em 2026-04-17** — branch ativa: `develop` (em sincronia com `main`)

**P0 RESOLVIDO:** Cortador de biscoito funciona para qualquer forma, incluindo côncavas complexas (coelho, estrela, etc.).

**Implementado e funcionando:**
- Infraestrutura completa (React 19 + Vite + Tailwind v4 + Husky + CI)
- Home com grid de 3 modelos (cookie-cutter, stamp, keychain)
- ModelEditor: form + preview 3D + download STL
- `OpenScadGeometryBuilder` — cortador com perfil CookieCad, parede para FORA da silhueta
- Flood-fill (`fillEnclosedRegions`) em `src/application/services/imageProcessing.ts`
- 4-conectividade no tracer, winding CCW, opening morfológico 0.5mm
- Fix Vite WASM: plugin `openscadWasmStable` em `vite.config.ts`
- CI em PRs: `.github/workflows/ci.yml`
- Equipe de agentes: Dev Geometry, Dev Frontend, Dev MakerWorld, Arquiteto, Revisor, Documentador
- Memórias Claude versionadas em `.claude/memory/` no repo

**Próxima prioridade — P1:**
Branch `feat/potrace-stamp`:
- Usar Potrace (v2.1.8 já instalado) para gerar carimbo com detalhes reais
- Potrace produz multi-path: contorno externo + detalhes internos (olhos, nariz)
- Cada path extrudado em altura diferente (binário, não heightmap)
- Isso também corrige o modo "Cortador + Carimbo" para ter carimbo com detalhes

**Pendente (P2+):**
- `keychain.json` — chaveiro com texto (OpenSCAD, estrutura JSON existe)
- Roteamento por URL (React Router v7)
- Web Worker para WASM (não bloquear UI)
- Responsividade mobile do ModelEditor

**Why:** O cortador foi o bloqueante central do produto. Agora com P0 resolvido, o foco é nos outros modelos (carimbo + chaveiro) para completar a V1.

**How to apply:** Ao retomar o trabalho, começar lendo `docs/PLANO.md`, verificar git log, e seguir o fluxo: branch → PR → develop → main.
