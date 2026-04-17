# AGENTS.md — Forja3D

Instruções para agentes de IA. **Leia este arquivo primeiro**, depois abra o arquivo do seu papel específico.

---

## Qual é o seu papel?

Identifique a tarefa e adote **apenas** o papel correspondente:

| Tarefa recebida | Papel | Arquivo |
|---|---|---|
| "Decida como implementar X", "Crie a interface para Y", "Avalie a arquitetura" | Arquiteto | [docs/agents/architect.md](docs/agents/architect.md) |
| "Implemente geometria", "Corrija tracer", "Novo modelo SCAD", "Algoritmo de polígono" | Dev Geometry | [docs/agents/dev-geometry.md](docs/agents/dev-geometry.md) |
| "Implemente componente", "Corrija UI", "Novo hook", "Formulário", "Roteamento" | Dev Frontend | [docs/agents/dev-frontend.md](docs/agents/dev-frontend.md) |
| "Publicar no MakerWorld", "Criar SCAD paramétrico", "Customizer", "Template OpenSCAD" | Dev MakerWorld | [docs/agents/dev-makerworld.md](docs/agents/dev-makerworld.md) |
| "Revise este código", "Verifique a qualidade", "Há problemas aqui?" | Revisor | [docs/agents/reviewer.md](docs/agents/reviewer.md) |
| "Atualize os docs", "Sincronize o PLANO.md", "Explique o projeto" | Documentador | [docs/agents/documenter.md](docs/agents/documenter.md) |

> **Nunca misture papéis em uma mesma sessão.** Se a tarefa toca Dev Geometry e Dev Frontend (ex: novo modelo que tem builder + hook + UI), execute na ordem: Geometry primeiro, Frontend depois.

**Dúvida sobre qual Dev usar?**
- Toca `src/infrastructure/` ou algoritmo matemático → **Dev Geometry**
- Toca `src/presentation/` ou `src/application/useCases/` → **Dev Frontend**
- Toca arquivo `.scad` standalone ou publicação no MakerWorld → **Dev MakerWorld**
- Toca os dois (geometry + UI) → Geometry implementa o builder/adapter, Frontend implementa o hook/componente

---

## Regras globais — todos os papéis

### Git (inegociável)
- **Nunca** commite diretamente em `main` ou `develop`
- **Nunca** faça `git merge` local em `main` ou `develop` — branches protegidas só aceitam PR
- Sempre crie branch: `feature/`, `fix/`, `docs/`, `chore/`
- Fluxo: `branch` → **PR para `develop`** → **PR para `main`** (tudo via GitHub)
- Abra PRs com `gh pr create` — nunca merge manual local em branches protegidas
- Conta local configurada: `almeidaguil` / `almeida.guilherme37@gmail.com`
  - Nunca use a conta global (é de trabalho — MercadoLibre)
  - Verifique com `git config --local user.email` antes do primeiro commit

### Commits — Conventional Commits (obrigatório via Husky)
```
<tipo>(<escopo>): <assunto em português>
```
Tipos aceitos: `feat` `fix` `docs` `refactor` `test` `chore` `style` `ci`

### Regra de ouro — commits só com código funcionando (inegociável)

**Antes de qualquer `git commit`, execute sempre:**
```bash
npm run build && npm run lint
```
- `build` com erro → **não commite**
- `lint` com erro → **não commite**
- Commits "WIP", "de progresso" ou com código quebrado são proibidos
- Cada commit deve representar um estado funcional e completo

### Idioma
- Código (variáveis, funções, tipos, interfaces): **inglês**
- Comentários, commits, documentação: **português**

### Limites de camada (arquitetura limpa)
```
domain       → zero dependências externas
application  → só importa de domain
infrastructure → importa de domain e application (implementa ports)
presentation → só importa de application (nunca de infrastructure diretamente)
shared       → pode ser importado por qualquer camada
```

---

## Contexto do projeto

- **Stack:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **Rendering:** OpenSCAD WASM (modelos com texto/geometria) + Three.js ExtrudeGeometry (imagem→3D)
- **Deploy:** GitHub Pages — totalmente estático, sem backend na V1
- **Repositório:** https://github.com/almeidaguil/forja3d
- **Caminho local:** `/Users/guisalmeida/Documents/Pessoal/forja3d`

Para contexto completo leia nesta ordem:
1. `docs/PLANO.md` — estado atual, o que foi feito, próximos passos
2. `docs/ARCHITECTURE.md` — diagrama de camadas, ports, adapters, ADRs
3. `docs/V2_ROADMAP.md` — o que vem depois (não implemente antes da hora)

---

## MCPs disponíveis neste projeto

O arquivo `.mcp.json` na raiz configura os servidores MCP. Após ativar (veja `docs/SETUP.md`):

| MCP | Quando usar |
|---|---|
| `context7` | Buscar docs atualizadas de Three.js, React 19, TypeScript — sem alucinar APIs |
| `github` | Criar issues, consultar PRs, verificar releases do repo |
| `sequential-thinking` | Raciocinar passo a passo sobre decisões complexas antes de agir |
| `fetch` | Buscar documentação externa, specs de formato (STL, 3MF, SVG) |

---

## CAD/3D Expert Reference

Use esta seção em qualquer tarefa que envolva geometria, tracer, OpenSCAD ou Three.js.

### OpenSCAD — motor principal de STL
```scad
// Polígono 2D → sólido 3D
linear_extrude(height = H) { polygon(points = pts); }

// Parede oca — padrão central do Forja3D
difference() {
  polygon(points = pts);
  offset(r = -espessura_parede) polygon(points = pts);
}

// Operações CSG
union()        { a; b; }   // juntar
difference()   { base; subtrair; }  // base menos subtrair (ORDEM IMPORTA)
intersection() { a; b; }   // só sobreposição
hull()         { a; b; }   // envoltória convexa
```

### Winding order (orientação do polígono)
- OpenSCAD `polygon()`: **CCW = sólido**, CW = buraco
- SVG/Canvas: Y cresce para baixo → após flip Y, verificar se ainda é CCW

```typescript
function signedArea(pts: [number, number][]): number {
  return pts.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    return sum + (x1 * y2 - x2 * y1)
  }, 0) / 2
  // > 0 → CCW ✓   < 0 → CW (reverter array para corrigir)
}
```

### Bug P0 — Moore-Neighbor 8-conectividade
**Arquivo:** `src/infrastructure/tracer/CanvasImageTracer.ts`
**Sintoma:** OpenSCAD retorna `mesh not closed` em formas côncavas.
**Causa:** 8-conectividade traça diagonais → polígono auto-toca em vértice → SCAD rejeita.
**Correções em ordem de complexidade:**
1. **4-conectividade** — só N/E/S/W. Sem diagonais = sem auto-interseções.
2. **Potrace** — `import Potrace from 'potrace'`. Gera curvas Bézier suaves, muito mais limpo.
3. **Pós-processamento** — remover vértices duplicados após o trace.

### Simplificação Douglas-Peucker
```typescript
type Pt = [number, number]
function simplify(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length <= 2) return pts
  const [x1, y1] = pts[0], [x2, y2] = pts.at(-1)!
  const len = Math.hypot(x2 - x1, y2 - y1)
  let maxDist = 0, maxIdx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    const d = len === 0 ? Math.hypot(px - x1, py - y1)
      : Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / len
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > epsilon)
    return [...simplify(pts.slice(0, maxIdx + 1), epsilon).slice(0, -1),
             ...simplify(pts.slice(maxIdx), epsilon)]
  return [pts[0], pts.at(-1)!]
}
```

### Formato STL binário (80 + 4 + 50×n bytes)
```
[80 bytes]  Header texto
[4 bytes]   uint32 LE — nº de triângulos
por triângulo:
  [12 bytes] normal (3× float32 LE)
  [12 bytes] vértice 1 (3× float32 LE)
  [12 bytes] vértice 2 (3× float32 LE)
  [12 bytes] vértice 3 (3× float32 LE)
  [2 bytes]  attribute byte count (uint16 LE, geralmente 0)
```

### Fluxo de dados: imagem → STL
```
CanvasImageTracer.trace()    → path SVG: "M x y L x y … Z"
OpenScadGeometryBuilder.build()
  parseSimplePath()          → Pt[] em pixels
  × (targetSizeMm / maxDimPx) → Pt[] em mm
  center + flip Y            → coordenadas OpenSCAD
  generateCutterScad()       → código SCAD
  openscad.renderToStl()     → ASCII STL
  asciiStlToArrayBuffer()    → ArrayBuffer binário
```

### Erros comuns → causas → correções
| Erro | Causa | Correção |
|---|---|---|
| `mesh not closed` | Polígono auto-intersecta | 4-conectividade ou Potrace |
| `Object may not be a valid 2-manifold` | Pontos duplicados / edge auto-tocando | Remover duplicados, verificar winding |
| Output vazio do `difference()` | Inner maior que outer | Checar escala; inner deve ser menor |
| Three.js mesh preto | Normais ausentes | `geometry.computeVertexNormals()` |

---

## V2 — consciência obrigatória

A V2 adicionará auth, créditos, Stripe e backend. Ao trabalhar em qualquer feature:
- Verifique se há implicação de V2
- Registre em `docs/V2_ROADMAP.md` se houver
- Deixe `// V2: <nota>` no código quando relevante
- **Nunca** implemente infraestrutura de V2 em código de V1
