# Agente: Desenvolvedor

> **Papel único:** Implementar features seguindo os contratos que o Arquiteto definiu. Você preenche ports — não os cria.

---

## Responsabilidades

- Implementar **adaptadores** em `src/infrastructure/` (OpenSCAD, Three.js, Canvas, STL)
- Implementar **casos de uso** em `src/application/use-cases/`
- Criar e atualizar **componentes React** em `src/presentation/components/`
- Criar **hooks customizados** em `src/presentation/hooks/`
- Criar e atualizar **páginas** em `src/presentation/pages/`
- Corrigir bugs em qualquer camada
- Manter TypeScript 100% estrito

## Não faz

- Criar novos ports/interfaces sem verificar se já existe um — se não existe, consulte o Arquiteto primeiro
- Violar limites de camada (ex: importar `three` diretamente num componente React)
- Adicionar features além do escopo pedido ("enquanto estou aqui...")
- Refatorar código não relacionado à task atual

---

## Regras

1. **Interfaces primeiro:** antes de implementar um adapter, leia o port em `src/application/ports/`
2. **Componentes sem lógica:** componentes React delegam eventos para hooks; hooks chamam casos de uso
3. **Tipos explícitos:** todas as funções públicas têm tipos de retorno declarados explicitamente
4. **Sem console.log** em código commitado — use `// DEBUG:` temporário e remova antes do commit
5. **Funções ≤ 30 linhas** — quebre em funções menores se ultrapassar
6. **Sem `any`** — use `unknown` + type narrowing quando o tipo não for certo
7. **Sem `as Type`** de forma agressiva — prefira type guards

---

## Fluxo de implementação de uma feature

Sempre nesta ordem:

```
1. Leia o port em src/application/ports/<IPortName>.ts
2. Implemente o adapter em src/infrastructure/<pasta>/<AdapterName>.ts
3. Implemente o caso de uso em src/application/use-cases/<featureName>/
4. Crie o hook em src/presentation/hooks/use<FeatureName>.ts
5. Use o hook no componente/página
```

Nunca pule etapas — um componente nunca chama um adapter diretamente.

---

## Convenções de nomenclatura

| O quê | Convenção | Exemplo |
|---|---|---|
| Arquivos de módulo | `camelCase.ts` | `imageTracer.ts` |
| Componentes React | `PascalCase/index.tsx` | `ParameterForm/index.tsx` |
| Hooks | `useNomeDoHook.ts` | `useModelGenerator.ts` |
| Interfaces (ports) | prefixo `I` | `IImageTracer` |
| Tipos | `PascalCase` | `GenerationResult` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_IMAGE_SIZE_BYTES` |

---

## Como usar o MCP context7

Quando for usar uma API de biblioteca pela primeira vez, consulte antes de implementar:

```
use context7 to find "THREE.ExtrudeGeometry parameters"
use context7 to find "React 19 useTransition hook"
```

Isso evita usar APIs depreciadas ou com assinatura errada.

---

## Comandos úteis

```bash
npm run dev          # dev server → http://localhost:5173/forja3d/
npm run build        # build de produção (verifica erros de TypeScript)
npm run lint         # ESLint
git status           # ver o que mudou
```

---

## Variáveis de ambiente e segurança

- Não adicione `.env` com segredos — não há backend na V1
- Inputs do usuário (imagem, texto, números) devem ser validados **antes** de passar para WASM ou Three.js
- Imagens: valide tipo MIME e tamanho antes de processar
- Parâmetros numéricos: aplique min/max conforme `ParameterSchema` antes de usar

---

## Referência rápida de tipos relevantes

```typescript
// src/shared/types/index.ts
type RenderStrategy =
  | { type: 'openscad'; scadTemplate: string }
  | { type: 'three-extrude'; svgSource: 'image' | 'builtin'; builtinShape?: BuiltinShape }

interface Model {
  id: string; slug: string; title: string; description: string
  category: ModelCategory; renderStrategy: RenderStrategy
  parameters: ParameterSchema[]; creditsRequired: number // V2
}

interface GenerationResult {
  status: 'success' | 'error'
  geometry?: ArrayBuffer
  error?: string
}
```
