---
name: Soluções para P0 — tracer de contorno com auto-interseções
description: Três abordagens para corrigir o CanvasImageTracer que gera polígonos inválidos em formas côncavas
type: project
originSessionId: 7bb87f33-c75b-4886-98cb-59cbe0253db7
---
**Problema:** `CanvasImageTracer` usa Moore-Neighbor 8-conectividade (inclui diagonais NE/SE/NW/SW). Em polígonos côncavos, movimentos diagonais criam cruzamentos de arestas (auto-interseções) → OpenSCAD rejeita com "The given mesh is not closed!".

**Soluções por ordem de esforço:**

### 1. 4-conectividade (menor esforço, tentar primeiro)
- Mudar `CW8` (8 direções) para apenas 4: N/S/E/W, sem diagonais
- Arquivo: `src/infrastructure/tracer/CanvasImageTracer.ts`, array `CW8`
- Resultado: polígonos mais dentados ("dente de serra") mas matematicamente simples
- Tempo estimado: 30min

### 2. Potrace (médio esforço, melhor qualidade)
- Já instalado: `potrace` v2.1.8 (`npm ls potrace`)
- Produz curvas Bezier sem diagonais
- Requer: parsear SVG path com comandos `C`/`Q` Bezier e amostrar em pontos antes de passar ao OpenSCAD
- Tempo estimado: 2-3h

### 3. manifold-3d (maior esforço, mais robusto)
- Engine do CookieCad original
- API JavaScript direta para CSG + offset — não depende do tracer
- `npm install manifold-3d`
- Ver `docs/COOKIE_CUTTER_RESEARCH.md` seção 9.3

**O que NÃO funciona (já tentado):**
- Chaikin smoothing — agrava as auto-interseções
- Canvas blur antes do threshold — altera a forma, cria pontes em features estreitas
- RDP com epsilon diferente — não resolve o problema estrutural das diagonais

**Why:** O diagnóstico foi confirmado observando que no modo `cutter-stamp`, o stamp renderiza (linear_extrude direto) mas o cutter falha (usa difference()) — sinal claro de polígono auto-intersectado.
**How to apply:** Ao trabalhar no tracer, começar pela 4-conectividade (opção 1) e testar com imagem de coelho.
