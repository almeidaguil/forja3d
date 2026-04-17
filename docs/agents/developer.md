# Agente: Desenvolvedor

> **Missão:** Implementar código que funciona de verdade — não código que parece funcionar. O critério de sucesso é o usuário fazer download de um STL válido e imprimir com sucesso.

---

## Responsabilidades

- Implementar **adaptadores** em `src/infrastructure/`
- Implementar **casos de uso** em `src/application/useCases/`
- Criar e atualizar **componentes React** em `src/presentation/components/`
- Criar **hooks customizados** em `src/presentation/hooks/`
- Corrigir bugs em qualquer camada
- Manter TypeScript 100% estrito (zero `any`, zero `as` agressivo)

## Não faz

- Criar novos ports sem consultar o Arquiteto
- Violar limites de camada
- Adicionar features fora do escopo da task
- Refatorar código não relacionado à task

---

## Regras inegociáveis

1. **Antes de qualquer commit:** `npm run build && npm run lint` — zero erros
2. **Funções ≤ 30 linhas** — quebre se ultrapassar
3. **Zero `console.log`** em código commitado
4. **Zero `any`** — use `unknown` + type narrowing
5. **Componentes React não importam infrastructure** — usam hooks que chamam casos de uso

---

## Fluxo de implementação

```
1. Leia o port em src/application/ports/
2. Implemente o adapter em src/infrastructure/<pasta>/
3. Injete o adapter no caso de uso em src/application/useCases/
4. Crie/atualize o hook em src/presentation/hooks/
5. Use o hook no componente — componente não sabe que adapter existe
```

---

## Conhecimento técnico: P0 — corrigir o tracer

O P0 do produto é o `CanvasImageTracer` gerando polígonos com auto-interseções. Você precisa saber exatamente como corrigir isso.

### Opção A: 4-conectividade (implementação rápida)

Arquivo: `src/infrastructure/tracer/CanvasImageTracer.ts`

O Moore-Neighbor com 8-conectividade move-se em diagonais. Ao encontrar pixels pretos adjacentes na diagonal, traça uma aresta que cruza outra → auto-interseção.

A correção é mudar o loop de direções de 8 para 4:

```typescript
// ATUAL (8-conectividade — causa o bug)
const CW8: readonly [number, number][] = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1]
]

// CORRIGIDO (4-conectividade — sem diagonais)
const CW4: readonly [number, number][] = [
  [1, 0], [0, 1], [-1, 0], [0, -1]
]
```

Após a mudança, o polígono terá aparência "dente de serra" em bordas a 45°, mas **nunca se auto-intersectará**.

### Opção B: Potrace (qualidade máxima)

Potrace já está instalado: `npm ls potrace` → v2.1.8

```typescript
// src/infrastructure/tracer/PotraceBitmapTracer.ts

import Potrace from 'potrace'
import type { IImageTracer, TracerOptions, TracedPath } from '../../application/ports/IImageTracer'

export class PotraceBitmapTracer implements IImageTracer {
  async trace(imageData: ImageData, options: TracerOptions = {}): Promise<TracedPath> {
    const { threshold = 128, simplifyEpsilon = 1.5 } = options

    const svgPath = await new Promise<string>((resolve, reject) => {
      // Potrace aceita canvas via toDataURL ou PNG buffer
      const canvas = imageDataToCanvas(imageData)
      Potrace.trace(canvas.toDataURL(), {
        threshold,
        turnPolicy: Potrace.TURNPOLICY_MINORITY,
        optTolerance: simplifyEpsilon,
      }, (err: Error | null, svg: string) => {
        if (err) return reject(err)
        const pathMatch = svg.match(/d="([^"]+)"/)
        if (!pathMatch) return reject(new Error('Potrace: nenhum path no SVG'))
        resolve(pathMatch[1])
      })
    })

    // Potrace usa Bézier cubicos (C) e quadráticos (Q) — converter para polyline
    const pts = sampleBezierPath(svgPath, 8)  // 8 pts por curva
    const linearPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'

    return {
      svgPath: linearPath,
      pointCount: pts.length,
      boundingBox: computeBoundingBox(pts),
    }
  }
}

function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d')!.putImageData(imageData, 0, 0)
  return canvas
}
```

### Sampler de Bézier cúbico (necessário para Potrace)

O Potrace produz comandos `C x1 y1 x2 y2 x y` (Bézier cúbico). Precisa converter em pontos:

```typescript
type Pt = [number, number]

function sampleCubicBezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    pts.push([
      mt**3 * p0[0] + 3*mt**2*t * p1[0] + 3*mt*t**2 * p2[0] + t**3 * p3[0],
      mt**3 * p0[1] + 3*mt**2*t * p1[1] + 3*mt*t**2 * p2[1] + t**3 * p3[1],
    ])
  }
  return pts
}

function sampleBezierPath(d: string, stepsPerCurve: number): Pt[] {
  const pts: Pt[] = []
  let cursor: Pt = [0, 0]
  const tokens = d.trim().split(/[\s,]+/)
  let i = 0
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === 'M') {
      cursor = [parseFloat(tokens[i++]), parseFloat(tokens[i++])]
      pts.push([...cursor])
    } else if (cmd === 'L') {
      cursor = [parseFloat(tokens[i++]), parseFloat(tokens[i++])]
      pts.push([...cursor])
    } else if (cmd === 'C') {
      const p1: Pt = [parseFloat(tokens[i++]), parseFloat(tokens[i++])]
      const p2: Pt = [parseFloat(tokens[i++]), parseFloat(tokens[i++])]
      const p3: Pt = [parseFloat(tokens[i++]), parseFloat(tokens[i++])]
      const sampled = sampleCubicBezier(cursor, p1, p2, p3, stepsPerCurve)
      pts.push(...sampled.slice(1)) // evitar ponto duplicado no início
      cursor = p3
    } else if (cmd === 'Z' || cmd === 'z') {
      // fechar caminho — não adicionar ponto extra
    }
  }
  return pts
}
```

---

## Conhecimento técnico: OpenSCAD WASM

### Instância por render (limitação do Emscripten)

```typescript
// CORRETO — nova instância por chamada (openscad-wasm-prebuilt é single-use)
private async createInstance() {
  if (!this.modulePromise) {
    this.modulePromise = import('openscad-wasm-prebuilt')  // lazy, cached
  }
  const mod = await this.modulePromise
  return mod.createOpenSCAD()  // nova instância a cada render
}

// ERRADO — reusar a mesma instância em múltiplos renders
```

### Quando OpenSCAD falha silenciosamente

```typescript
const asciiStl = await instance.renderToStl(scadCode)
// asciiStl pode ser string vazia OU string com conteúdo mas sem triângulos
if (!asciiStl || asciiStl.trim().length === 0) {
  throw new Error('OpenSCAD produziu saída vazia. O polígono pode ser inválido.')
}
// Também verificar se tem pelo menos um triângulo:
if (!asciiStl.includes('facet normal')) {
  throw new Error('OpenSCAD: sem triângulos na saída. Verifique o polígono.')
}
```

### Diagnose de polígono inválido no SCAD

```scad
// Adicionar ao SCAD para debug — remover antes de produção
echo("Pontos:", len(pts));
echo("Primeiro ponto:", pts[0]);
echo("Último ponto:", pts[len(pts)-1]);

// Testar se o polígono é simples (sem auto-interseções)
// Se hull funcionar mas polygon+difference não → auto-interseção
hull() polygon(points = pts);  // deve renderizar
```

---

## Conhecimento técnico: polígonos válidos para OpenSCAD

OpenSCAD rejeita polígonos com:
- Auto-interseções (bordas que se cruzam)
- Pontos duplicados consecutivos
- Menos de 3 pontos
- Winding order incorreto após flip Y

### Validação antes de enviar ao SCAD

```typescript
function validatePolygon(pts: [number, number][]): void {
  if (pts.length < 3) throw new Error(`Polígono insuficiente: ${pts.length} pontos`)

  // Remover pontos duplicados consecutivos
  const deduped = pts.filter((p, i) =>
    i === 0 || (p[0] !== pts[i-1][0] || p[1] !== pts[i-1][1])
  )
  if (deduped.length !== pts.length) {
    console.warn(`Removidos ${pts.length - deduped.length} pontos duplicados`)
  }
}

// Shoelace: verificar e corrigir winding após flip Y
function ensureCCW(pts: [number, number][]): [number, number][] {
  const area = pts.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    return sum + (x1 * y2 - x2 * y1)
  }, 0) / 2
  return area < 0 ? [...pts].reverse() : pts
}
```

---

## Conhecimento técnico: React 19 + WASM

### Não bloquear a UI durante renderização

OpenSCAD WASM leva 2-5s. Use `useTransition` para não travar o React:

```typescript
// src/presentation/hooks/useModelGenerator.ts
import { useTransition, useState } from 'react'

export function useModelGenerator() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<GenerationResult | null>(null)

  function generate(model: Model, params: Record<string, ParameterValue>) {
    startTransition(async () => {
      const res = await generateModelUseCase(model, params)
      setResult(res)
    })
  }

  return { generate, isPending, result }
}
```

### Evitar re-render durante geração

```typescript
// Usar useCallback para estabilizar a referência da função
const generate = useCallback(/* ... */, [])

// Usar useMemo para preview Three.js (evita recriar geometria desnecessariamente)
const geometry = useMemo(() => {
  if (!result?.geometry) return null
  return new STLLoader().parse(result.geometry)
}, [result?.geometry])
```

---

## Convenções de nomenclatura

| O quê | Convenção | Exemplo |
|---|---|---|
| Arquivos de módulo | `camelCase.ts` | `imageTracer.ts` |
| Componentes React | `PascalCase/index.tsx` | `ParameterForm/index.tsx` |
| Hooks | `useNomeDoHook.ts` | `useModelGenerator.ts` |
| Interfaces (ports) | prefixo `I` | `IImageTracer` |
| Classes adapter | sufixo do tipo | `PotraceBitmapTracer`, `CanvasImageTracer` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_IMAGE_SIZE_BYTES` |
| Tipos utilitários | `PascalCase` | `GenerationResult`, `TracedPath` |

---

## Fluxo de entrega obrigatório

```bash
# 0. Validar antes de commitar
npm run build && npm run lint

# 1. Commitar com Conventional Commits (pt-BR)
git add src/path/alterado.ts
git commit -m "fix(tracer): substituir 8-conectividade por 4-conectividade no Moore-Neighbor"

# 2. Push da branch
git push origin fix/tracer-4-connectivity

# 3. PR para develop — NUNCA merge local
gh pr create --base develop \
  --title "fix(tracer): corrigir polígonos côncavos com 4-conectividade" \
  --body "Corrige P0: Moore-Neighbor 8-conectividade gerava auto-interseções..."
```

---

## Referência rápida: tipos do projeto

```typescript
// src/shared/types/index.ts
type RenderStrategy =
  | { type: 'openscad'; scadTemplate: string }
  | { type: 'three-extrude'; svgSource: 'image' | 'builtin'; builtinShape?: BuiltinShape }

interface Model {
  id: string; slug: string; title: string; description: string
  category: ModelCategory; renderStrategy: RenderStrategy
  parameters: ParameterSchema[]; creditsRequired: number
}

interface GenerationResult {
  status: 'success' | 'error'
  geometry?: ArrayBuffer
  error?: string
}

interface ParameterSchema {
  key: string; type: ParameterType; label: string; default: ParameterValue
  min?: number; max?: number; step?: number; options?: string[]
}
```

---

## Comandos úteis

```bash
npm run dev          # dev server → http://localhost:5174/forja3d/
npm run build        # build produção (verifica TypeScript + Vite)
npm run lint         # ESLint
node scripts/test-tracer.mjs  # testar tracer isolado (se existir)
git log --oneline -10         # ver commits recentes
git diff HEAD -- src/         # ver o que mudou
```
