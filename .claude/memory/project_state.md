---
name: Estado atual do projeto e próximos passos
description: O que está funcionando, o que está pendente, e próxima prioridade
type: project
originSessionId: 7c100e83-ac8d-4d06-9628-c081741764ed
---
**Estado em 2026-04-17** — branch ativa: `main` (em sincronia com `develop`)

**Em produção:**
- ✅ Cortador de biscoito (OpenSCAD, perfil CookieCad, parede para fora)
- ✅ Carimbo com detalhes reais (Potrace multi-path, base no formato da silhueta)
- ✅ CI em PRs, Deploy automático no GitHub Pages

**Catálogo completo V1 — decidido pela equipe (2026-04-17):**

Sprint 1 (P1 — próximas branches):
1. `feat/keychain-text` — Chaveiro com texto (OpenSCAD, 2 linhas, NFC boolean)
2. `feat/keychain-image` — Chaveiro com imagem (silhueta vira formato do chaveiro)

Sprint 2 (P2):
3. `feat/letreiro-2-camadas` — Letreiro com offset 2 camadas (190 downloads Mafagrafos)
4. `feat/tag` — Plaquinha/Tag (@social, pet tag, maçaneta)

Sprint 3 (P3):
5. `feat/url-routing` — React Router v7
6. `fix/cutter-stamp-potrace` — Cortador + Carimbo com Potrace (2 STLs)
7. `feat/wasm-worker` — Web Worker para OpenSCAD
8. `feat/ux-polish` — Skeleton, toaster, mobile

**Fora do escopo V1:** flexi animals, @social com ícones, litofane, string art, cumbuca

**NFC:** boolean `addNfc` em todos os chaveiros OpenSCAD → recesso ⌀26mm × 1.2mm no verso

**Próxima branch:** `feat/keychain-text`

**Why:** Catálogo definido com base em análise de mercado (Mafagrafos + MakerWorld). O chaveiro de texto tem menor custo de implementação (OpenSCAD puro) e demanda imediata comprovada.

**How to apply:** Seguir o catálogo da ordem definida. NFC é parâmetro boolean. Letreiro e Tag são variações de texto — máximo reuso do OpenSCAD template.
