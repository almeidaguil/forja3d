---
name: Convenções de código e idioma
description: Regras de idioma, nomenclatura e qualidade de código do projeto
type: feedback
originSessionId: 7bb87f33-c75b-4886-98cb-59cbe0253db7
---
**Idioma:**
- Código (variáveis, funções, tipos, interfaces, nomes de arquivo): **inglês**
- Comentários, commits, documentação (PLANO.md, AGENTS.md, etc.): **português**

**Commits — Conventional Commits:**
```
<tipo>(<escopo>): <assunto em português>
```
Tipos: `feat|fix|docs|refactor|test|chore|style|ci`

**Qualidade de código (regras do developer.md):**
- Sem `console.log` em código commitado
- Sem `any` — usar `unknown` + type narrowing
- Funções ≤ 30 linhas
- Tipos de retorno explícitos em funções públicas
- Sem `as Type` agressivo — preferir type guards

**Nomenclatura:**
- Arquivos de módulo: `camelCase.ts`
- Componentes React: `PascalCase/index.tsx`
- Hooks: `useNomeCamelCase.ts`
- Interfaces (ports): prefixo `I` (ex: `IGeometryBuilder`)
- Constantes: `SCREAMING_SNAKE_CASE`

**Why:** Padrões definidos no AGENTS.md e docs/agents/developer.md para consistência e revisão de código.
**How to apply:** Ao gerar qualquer código, seguir essas convenções sem precisar ser lembrado.
