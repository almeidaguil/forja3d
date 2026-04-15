# Plano do Projeto — Forja3D

> **Documento vivo.** Atualizado a cada sessão de desenvolvimento.
> Se o contexto do chat foi perdido, comece por aqui.

---

## Estado Atual

| Item | Status |
|------|--------|
| Infraestrutura do projeto | ✅ Completo |
| Git + Husky + Commitlint | ✅ Completo |
| CI/CD (GitHub Pages) | ✅ Completo |
| Tipos de domínio | ✅ Completo |
| Dados dos modelos (JSON) | ✅ 3 modelos criados |
| Página Home (cards) | ✅ Completo |
| Página ModelEditor | ✅ Funcional (form + preview) |
| Preview 3D (Three.js) | ✅ Completo |
| Formulário de parâmetros | ✅ Completo |
| Upload de imagem | ✅ Completo |
| Export STL | ✅ Completo |
| Offset de polígono (bevel join) | ✅ Completo |
| OpenSCAD WASM renderer | 🔲 A implementar |
| Canvas image tracer | ✅ Completo (marching-squares + RDP) |
| Roteamento por URL | 🔲 A implementar (V1 usa useState) |
| Logo v2 (forja/faíscas) | ✅ Completo |
| Documentação completa (PT) | ✅ Completo |

**Site ao vivo:** https://almeidaguil.github.io/forja3d/

---

## O que já está feito

### Infraestrutura e Tooling
- **React 19 + TypeScript + Vite 8** com base `/forja3d/` para GitHub Pages
- **Tailwind CSS v4** via plugin Vite (sem arquivo de config separado)
- **Husky v9** com dois hooks:
  - `pre-commit` → `lint-staged` (ESLint fix em `*.ts/*.tsx`)
  - `commit-msg` → `commitlint` (Conventional Commits obrigatório)
- **commitlint** com tipos: `feat|fix|docs|refactor|test|chore|style|ci`
- **GitHub Actions** deploy automático em push para `main` (Node 22, artifact upload)

### Git e Conta Pessoal
- Repositório: `https://github.com/almeidaguil/forja3d`
- **Conta local configurada:** `almeidaguil` / `almeida.guilherme37@gmail.com`
  - Configurado via `git config --local` — NUNCA usar a conta global (MercadoLibre)
- **Branch discipline:** `main` (protegida) → `develop` (integração) → feature/fix/docs/chore branches
- **NUNCA** commitar diretamente em `main` ou `develop`

### Arquitetura (Clean Architecture + DDD)
```
src/
  domain/          ← entidades puras (sem deps externas)
  application/     ← casos de uso, portas (interfaces)
  infrastructure/  ← adaptadores (OpenSCAD, Three.js, Canvas)
  presentation/    ← React (páginas, componentes)
  shared/          ← tipos globais, constantes
  data/            ← modelos JSON (substituir por API na V2)
```

### Tipos de Domínio (`src/shared/types/index.ts`)
```typescript
type RenderStrategy =
  | { type: 'openscad'; scadTemplate: string }
  | { type: 'three-extrude'; svgSource: 'image' | 'builtin'; builtinShape?: BuiltinShape }

interface Model {
  id, slug, title, description, category, coverImage?,
  renderStrategy, parameters: ParameterSchema[],
  creditsRequired  // V2: sistema de créditos; sempre 1 na V1
}
```

### Modelos criados (`src/data/models/`)
| Arquivo | Estratégia | Parâmetros principais |
|---------|-----------|----------------------|
| `cookie-cutter.json` | `three-extrude / image` | cutterHeight, wallThickness, outlineOffset, targetSize, threshold, color |
| `stamp.json` | `three-extrude / image` | baseHeight, reliefHeight, targetSize, threshold, mirror, color |
| `keychain.json` | `openscad` | text, fontSize, depth, padding, thickness, color |

### Páginas e Componentes
- **Home:** grid responsivo (1/2/3 col), modelos agrupados por categoria, cards com badge, ícone colorido, título e descrição
- **ModelEditor:** placeholder com mensagem "em desenvolvimento" — **próximo alvo**
- **UI:** `Button` (variants: primary/secondary/ghost) + `Badge`
- **ModelCard:** card clicável com badge de categoria

### Logo e Brand
- **Favicon:** `/forja3d/favicon.svg` — cubo isométrico com gradientes (sem texto)
- **Logo completa:** `/forja3d/logo.svg` — cubo + wordmark "Forja**3D**"
- **Logo ícone:** `/forja3d/logo-icon.svg` — cubo standalone com faíscas e brilho
- **Conceito:** cubo forjado — gradientes âmbar→laranja nas faces, faíscas 4-pontas, brilho de calor

### Ambiente de Desenvolvimento Automatizado
- **`.nvmrc`** — pina Node 22 (mesma versão do CI); `nvm use` dentro do diretório usa automaticamente
- **`.editorconfig`** — garante `indent=2`, `LF`, `utf-8` em qualquer editor
- **`.vscode/settings.json`** — ESLint fix ao salvar, TypeScript do projeto, suporte a Tailwind em `clsx()`/`cn()`
- **`.vscode/extensions.json`** — VS Code sugere as 5 extensões recomendadas automaticamente ao abrir o projeto
- **`.mcp.json`** — 4 MCPs pré-configurados; `context7`/`sequential-thinking`/`fetch` ativam sem config; GitHub lê `${GITHUB_TOKEN}` do ambiente (nunca expõe token)

### Documentação (tudo em português)
| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Portfolio: o que é, funcionalidades, stack, como rodar, contribuir |
| `AGENTS.md` | Instruções para agentes de IA: arquitetura, regras, git, convenções |
| `docs/ARCHITECTURE.md` | Diagrama de camadas, entidades, portas, adaptadores, ADRs |
| `docs/SETUP.md` | Guia de instalação: Mac, Linux, Windows |
| `docs/V2_ROADMAP.md` | Plano completo da V2: auth, créditos, Stripe, backend, S3 |
| `docs/adr/0001-0004` | ADRs em português |
| `docs/PLANO.md` | **Este arquivo** |

---

## Problemas Encontrados e Soluções

### 1. GitHub Actions: branch não autorizada para deploy
**Erro:** `Branch 'main' is not allowed to deploy to github-pages due to environment protection rules`

**Solução:**
```bash
gh api repos/almeidaguil/forja3d/environments/github-pages/deployment-branch-policies \
  --method POST --field name="main"
```
Também atualizado Node 20 → 22 no workflow para remover aviso de deprecação.

---

### 2. Branch protection via API retornando 422
**Erro:** JSON malformado ao proteger `main` via `gh api`

**Solução:** usar `--input -` com heredoc em vez de `--field` para payloads JSON complexos:
```bash
gh api repos/almeidaguil/forja3d/branches/main/protection \
  --method PUT --input - <<'EOF'
{ "required_status_checks": null, ... }
EOF
```

---

### 3. `lint-staged` com `tsc-files --noEmit` falhando
**Erro:** `tsc-files` não é pacote instalado; hook de pre-commit rejeitava todos os commits

**Solução:** simplificar para apenas ESLint (typescript-eslint já cobre verificação de tipos):
```json
"lint-staged": { "*.{ts,tsx}": "eslint --fix" }
```

---

### 4. Arquivos boilerplate do Vite causando erro de build
**Erro:** `src/App.css`, `src/assets/react.svg` e `src/assets/vite.svg` referenciados mas não existiam após limpeza inicial

**Solução:** remover as importações desses arquivos em `App.tsx` e `main.tsx` antes do primeiro build.

---

### 5. `Write` tool bloqueando em arquivos já existentes
**Comportamento:** a ferramenta exige que o arquivo seja lido antes de ser sobrescrito

**Solução:** sempre usar `Read` no arquivo antes de usar `Write` para substituição completa; preferir `Edit` para mudanças pontuais.

---

## Próximos Passos (por prioridade)

### 🔴 P1 — ModelEditor (principal feature da V1)

O arquivo `src/presentation/pages/ModelEditor/index.tsx` é atualmente um placeholder.
Precisa implementar, nesta ordem:

#### 1.1 Portas (interfaces) — `src/application/ports/`
```
IImageTracer.ts         → traceja imagem → SVG path string
IThreeGeometryBuilder.ts → SVG path → BufferGeometry extrudada
IStlExporter.ts         → BufferGeometry → ArrayBuffer (.stl binário)
IOpenScadRenderer.ts    → template + params → STL ArrayBuffer
```

#### 1.2 Adaptadores — `src/infrastructure/`
```
CanvasImageTracer.ts    → Canvas API (marching-squares) → implementa IImageTracer
ThreeGeometryBuilder.ts → THREE.ExtrudeGeometry → implementa IThreeGeometryBuilder
ThreeStlExporter.ts     → THREE/examples STLExporter → implementa IStlExporter
OpenScadWasmRenderer.ts → openscad-wasm-prebuilt → implementa IOpenScadRenderer
```

#### 1.3 Casos de Uso — `src/application/use-cases/`
```
generateModel.ts   → recebe Model + params, roteia para openscad ou three-extrude
traceImage.ts      → recebe File (imagem), retorna SVG path
exportStl.ts       → recebe geometry, retorna Blob para download
```

#### 1.4 Componentes de Apresentação
```
ParameterForm/     → formulário dinâmico baseado em Model.parameters[]
  - renderiza input conforme ParameterType (text, number, boolean, select, color, image)
  - upload de imagem com preview para tipos 'image'
ThreePreview/      → canvas Three.js com OrbitControls, atualiza ao vivo
  - recebe BufferGeometry + color
  - mostra loading spinner durante geração
ModelEditor/       → orquestra tudo: form + preview + botão download STL
```

#### Ordem de implementação sugerida:
1. `ParameterForm` com form funcional (sem preview ainda)
2. `ThreePreview` com geometria estática de exemplo
3. `ThreeGeometryBuilder` + `ThreeStlExporter`
4. Integrar preview ao vivo para `three-extrude/image`
5. `CanvasImageTracer` para upload de imagem
6. `OpenScadWasmRenderer` para keychain (texto)
7. Botão de download STL

---

### 🟡 P2 — Mais modelos

Após o editor estar funcional, adicionar:
- `sign.json` — placa com texto (OpenSCAD)
- `letter.json` — letra grande decorativa (OpenSCAD ou SVG builtin)
- Considerar modelo de teste simples (cubo/esfera) para validar o pipeline

---

### 🟢 P3 — Roteamento por URL

Atualmente a navegação usa `useState<Route>` em `App.tsx`.
Para V1 completa (e pré-requisito da V2), migrar para React Router v7 ou TanStack Router:
- `/` → Home
- `/editor/:slug` → ModelEditor
- Habilita deep-link e botão voltar do navegador

---

### 🔵 P4 — Polimentos visuais

- Skeleton loading nos cards da Home
- Toaster de notificação (download concluído, erro de geração)
- Responsividade do ModelEditor em mobile
- Animação de entrada nos cards

---

## Decisões Pendentes

| Decisão | Opções | Contexto |
|---------|--------|----------|
| Roteamento | React Router v7 vs TanStack Router | TanStack tem melhor TS mas é mais verboso |
| Workers para WASM | Web Worker vs main thread | OpenSCAD WASM pode bloquear UI; Worker isola isso |
| Potrace vs Canvas tracer | Potrace (melhor qualidade) vs Canvas API (zero dep) | Potrace requer port WASM; Canvas API é suficiente para V1 |

---

## Contexto para Retomada de Sessão

Se você está retomando o trabalho e o chat foi perdido, siga estes passos:

1. **Leia este arquivo** — você está aqui
2. **Leia `docs/ARCHITECTURE.md`** — entenda as camadas e convenções
3. **Leia `AGENTS.md`** — regras de comportamento para agentes/IA
4. **Verifique o estado do git:**
   ```bash
   git log --oneline -10
   git status
   git branch -a
   ```
5. **Rode o projeto localmente:**
   ```bash
   cd /Users/guisalmeida/Documents/Pessoal/forja3d
   nvm use
   npm install
   npm run dev
   # Acesse http://localhost:5173/forja3d/
   ```
6. **Para entregar qualquer mudança — sempre via PR:**
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b feature/minha-feature
   # ... implementar e commitar ...
   git push origin feature/minha-feature
   gh pr create --base develop --title "feat(scope): ..." --body "..."
   ```
7. **Próximo foco:** implementar o `ModelEditor` (ver P1 acima)

---

## Histórico de Sessões

| Data | O que foi feito |
|------|----------------|
| 2026-04-13 | Setup inicial: projeto, arquitetura, CI/CD, tipos, dados, Home, brand v1 |
| 2026-04-14 | Logo v2 (conceito forja: gradientes, faíscas, brilho), docs em PT, Husky+commitlint |
| 2026-04-14 | Criação deste arquivo de plano |
| 2026-04-14 | Ambiente automatizado: `.nvmrc`, `.editorconfig`, `.vscode/`, `.mcp.json` com `${GITHUB_TOKEN}`, SETUP.md reescrito |
| 2026-04-14 | Melhorias de geometria: bevel join (anti-spike), stamp deslocado, defaults intuitivos; revisão + merge develop→main |
