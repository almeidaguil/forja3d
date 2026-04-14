# AGENTS.md — Forja3D

Instruções para agentes de IA que trabalham neste repositório.

---

## Visão geral do projeto

**Forja3D** é um gerador de modelos 3D paramétricos que roda no navegador, construído com React + TypeScript + Vite. Funciona totalmente no cliente — sem backend, sem autenticação na V1. Toda geração de modelos 3D acontece via OpenSCAD WASM ou geometria Three.js.

Veja o [README.md](README.md) para a descrição voltada ao usuário.

---

## Regras de arquitetura (inegociáveis)

Este projeto segue **Arquitetura Limpa** + **Domain-Driven Design**. Respeite rigorosamente os limites entre camadas:

```
domain → não possui dependências de nenhuma outra camada
application → depende apenas do domain
infrastructure → depende de domain e application (implementa interfaces)
presentation → depende de application (nunca de infrastructure diretamente)
shared → utilizado por todas as camadas
```

- **Nunca** importe infrastructure diretamente da presentation
- **Nunca** importe React nas camadas domain ou application
- **Nunca** coloque lógica de negócio dentro de componentes React — use casos de uso da application
- Interfaces (ports) são definidas em `application/` ou `domain/`; implementações (adapters) ficam em `infrastructure/`

---

## Estrutura de pastas

```
src/
├── domain/
│   ├── model/              # Entidade Model, objetos de valor
│   ├── parameter/          # Tipos e validação de parâmetros
│   └── generation/         # GenerationResult, GenerationStatus
├── application/
│   └── useCases/
│       ├── generateModel/  # Orquestra geração via WASM/Three.js
│       ├── traceImage/     # Orquestra traçado imagem → SVG
│       └── exportStl/      # Lógica de exportação STL
├── infrastructure/
│   ├── openscad/           # Adapter OpenSCAD WASM
│   ├── tracer/             # Adapter de traçado de imagem (Canvas/Potrace)
│   ├── three/              # Builder de geometria Three.js e exportador STL
│   └── storage/            # Helpers de I/O de arquivo
├── presentation/
│   ├── components/
│   │   ├── ModelViewer/    # Componente canvas Three.js
│   │   ├── ParameterForm/  # Formulário dinâmico de parâmetros
│   │   ├── ImageUpload/    # Input de imagem com drag-and-drop
│   │   ├── ModelCard/      # Card de listagem de modelos
│   │   └── ui/             # Primitivos de UI genéricos (Button, Input, etc.)
│   ├── pages/
│   │   ├── Home/           # Página de catálogo de modelos
│   │   └── ModelEditor/    # Página do editor com formulário + preview
│   └── hooks/              # Hooks React customizados (useModelGenerator, etc.)
├── shared/
│   ├── types/              # Tipos TypeScript globais
│   ├── utils/              # Funções utilitárias puras
│   └── constants/          # Constantes globais da aplicação
└── data/
    └── models/             # Configs JSON para cada modelo disponível
```

---

## Padrões de código

### Geral
- Linguagem: **TypeScript** — modo strict, sem `any`
- Estilo: **Tailwind CSS** — sem estilos inline, sem CSS modules
- Siga os princípios do **Clean Code**: funções fazem uma coisa, nomes claros, sem números mágicos
- Tamanho máximo de função: 30 linhas. Quebre se for maior
- Sem código comentado — delete
- Sem `console.log` em código de produção — use um logger ou remova

### Convenções de nomenclatura
- Arquivos: `camelCase.ts` para módulos, `PascalCase.tsx` para componentes React
- Diretórios: `camelCase/`
- Interfaces: prefixo `I` apenas para ports/adapters (ex: `IModelRenderer`)
- Tipos: `PascalCase`
- Constantes: `SCREAMING_SNAKE_CASE`

### Componentes React
- Apenas componentes funcionais — sem class components
- Cada componente em seu próprio diretório com `index.tsx`
- Props tipadas com uma interface nomeada no mesmo arquivo
- Sem lógica além de renderização e delegação de eventos — delegar para hooks

### Domínio
- Entidades são objetos de valor imutáveis sempre que possível
- Validação na construção da entidade, não no ponto de uso
- A camada de domínio deve ter zero dependências externas

---

## Fluxo Git

**Nunca faça commit diretamente em `main` ou `develop`.**

| Branch | Finalidade |
|---|---|
| `main` | Protegida. Apenas merge de `develop` via PR após revisão. |
| `develop` | Integração. Branches de feature são mergeadas aqui. |
| `feature/<nome>` | Novas funcionalidades |
| `fix/<nome>` | Correções de bugs |
| `docs/<nome>` | Alterações apenas de documentação |
| `chore/<nome>` | Ferramentas, dependências, configuração |

### Mensagens de commit — Conventional Commits

Formato: `<tipo>(<escopo>): <assunto>`

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`

Exemplos:
```
feat(cortador): adiciona upload de imagem e traçado de contorno
fix(model-viewer): corrige posição da câmera ao atualizar modelo
docs(arquitetura): adiciona ADR para abordagem de geometria Three.js
refactor(domain): extrai validação de parâmetro para objeto de valor
```

---

## Consciência sobre a V2

Ao trabalhar em features da V1, sempre verifique se sua implementação tem implicações para a V2. Se tiver:
- Registre na seção relevante de [docs/V2_ROADMAP.md](docs/V2_ROADMAP.md)
- Deixe um comentário `// V2: <nota>` próximo ao código relevante

A V2 introduzirá: autenticação, sistema de créditos, renderização server-side, pagamentos com Stripe. Projete o código da V1 para ser substituível, não reescrito.

---

## Decisões técnicas principais

1. **Sem backend na V1** — toda a renderização é client-side (OpenSCAD WASM + Three.js)
2. **OpenSCAD WASM** — para modelos paramétricos com texto/geometria (chaveiros, letreiros)
3. **Three.js ExtrudeGeometry** — para modelos baseados em imagem (cortadores, carimbos); mais rápido que WASM
4. **API Canvas / Potrace** — para traçado imagem→SVG no navegador
5. **Exportação STL** — via `STLExporter` do Three.js; suporte a 3MF é questão da V2
6. **GitHub Pages** — hospedagem estática, sem servidor necessário

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalhes completos dos ADRs.

---

## O que evitar

- Não adicione código de backend, servidores ou variáveis de ambiente apontando para APIs externas na V1
- Não adicione código de autenticação na V1
- Não use `any` em TypeScript — use `unknown` e narrowing de tipos
- Não importe dependências pesadas na camada de domínio
- Não coloque conteúdo de arquivos `.scad` inline em componentes — mantenha em `src/data/models/`
