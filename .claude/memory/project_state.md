---
name: Estado atual do projeto e próximos passos
description: O que está funcionando, o que está pendente, e próxima prioridade
type: project
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Estado em 2026-04-17** — branch ativa: `main` (em sincronia com `develop`)

**Em produção (✅):**
- Cortador de biscoito — parede para fora, perfil CookieCad
- Carimbo com detalhes reais (Potrace multi-path, base na silhueta)
- Cortador + Carimbo — dois STLs separados, encaixe garantido (0.4mm folga)
- QR Code Pix 3D — EMV BR Code client-side, download STL/SVG/PNG, Pix copia-e-cola
- Chaveiro com Texto — 19 fontes TTF locais, picker visual, NFC, 3 formatos
- CI em PRs, Deploy automático GitHub Pages

**Workflow de documentação definido (2026-04-17):**
Docs (PLANO.md + memórias) são atualizados no MESMO PR da feature — não branch separada.
A cada feature concluída: atualizar PLANO.md (status + histórico) + .claude/memory/project_state.md + sincronizar .claude/memory/ para o repo.

**Próxima prioridade — Sprint 2 (P2):**
1. `feat/letreiro-2-camadas` — Letreiro com offset 2 camadas (190 downloads Mafagrafos)
2. `feat/tag` — Plaquinha/Tag (@social, pet tag, maçaneta)

**Sprint 3 (P3) — depois do Sprint 2:**
- `feat/url-routing` — React Router v7
- `feat/wasm-worker` — Web Worker para OpenSCAD (eliminar o freeze da UI)
- `feat/ux-polish` — Skeleton, toaster, mobile
- `fix/cutter-stamp-params` — parâmetros do carimbo ajustáveis no modo Cortador+Carimbo

**Por que a ordem importa:**
Letreiro tem 190 downloads no Mafagrafos — alta demanda comprovada e implementação simples (OpenSCAD template). A plaquinha (Tag) é variação do mesmo padrão. Ambas completam o catálogo de "texto personalizado" antes de investir em polimentos técnicos.

**Why:** Sprint 2 completa o catálogo de texto. Sprint 3 melhora qualidade/performance sem adicionar modelos novos.
**How to apply:** Iniciar sempre pelo item mais alto da lista. Documentar no mesmo PR da feature.
