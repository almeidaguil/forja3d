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
| Formulário de parâmetros | ✅ Completo (com ImageField) |
| Upload de imagem | ✅ Completo |
| Export STL | ✅ Completo |
| Offset de polígono (bevel join) | ✅ Completo |
| OpenSCAD WASM renderer | ✅ Implementado (builder principal) |
| Canvas image tracer | ⚠️ Funcional, qualidade de contorno a melhorar |
| Cortador de biscoito — modo Cortador | ⚠️ Geometria ok em polígonos simples; instável em polígonos muito côncavos |
| Cortador de biscoito — modo Cortador+Carimbo | ⚠️ Renderiza os dois objetos; visual precisa refinamento |
| Roteamento por URL | 🔲 A implementar (V1 usa useState) |
| Logo v2 (forja/faíscas) | ✅ Completo |
| Documentação completa (PT) | ✅ Completo |
| **ParameterForm com ImageField** | ✅ Completo (tipos dinâmicos) |

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
- **CI auto-release** workflow para `develop→main` automático

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
| Arquivo | Estratégia | Parâmetros principais | Status |
|---------|-----------|----------------------|--------|
| `cookie-cutter.json` | `three-extrude / image` | cutterHeight, wallThickness, tipWidth, chamferHeight, baseWidth, baseHeight, targetSize, threshold, color | ⚠️ Ver P0 |
| `stamp.json` | `three-extrude / image` | baseHeight, reliefHeight, targetSize, threshold, mirror, color | 🔲 Não implementado ainda |
| `keychain.json` | `openscad` | text, fontSize, depth, padding, thickness, color | 🔲 Não implementado ainda |

### Páginas e Componentes
- **Home:** grid responsivo (1/2/3 col), modelos agrupados por categoria, cards com badge, ícone colorido, título e descrição
- **ModelEditor:** funcional — formulário de parâmetros + upload de imagem + preview 3D + botão download STL
- **ThreePreview:** Three.js com STLLoader, OrbitControls, câmera em `(0, 0, maxDim*2)`, MeshPhongMaterial com cor configurável
- **ParameterForm:** renderiza inputs dinâmicos por tipo (number, select, color, image, boolean, string)
  - **ImageField:** componente dedicado com validação de tipo (PNG, JPG, WEBP) e tamanho (max 5 MB)
- **UI:** `Button` (variants: primary/secondary/ghost) + `Badge`
- **ModelCard:** card clicável com badge de categoria

### Logo e Brand
- **Favicon:** `/forja3d/favicon.svg` — cubo isométrico com gradientes (sem texto)
- **Logo completa:** `/forja3d/logo.svg` — cubo + wordmark "Forja**3D**"
- **Logo ícone:** `/forja3d/logo-icon.svg` — cubo standalone com faíscas e brilho
- **Conceito:** cubo forjado — gradientes âmbar→laranja nas faces, faíscas 4-pontas, brilho de calor

### OpenSCAD WASM Renderer (builder principal do cortador)
- **`OpenScadGeometryBuilder`** em `src/infrastructure/openscad/OpenScadGeometryBuilder.ts`
- Perfil CookieCad com 3 camadas: chanfro (taper) + lâmina reta + base/pega
- Modo `cutter`: anel oco com transição de `tipWidth` para `bladeThickness` via 4 steps de chanfro
- Modo `cutter-stamp`: cutter + stamp lado a lado com tolerância de encaixe
- Conversão ASCII STL → Binary ArrayBuffer para compatibilidade com Three.js

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
| `docs/COOKIE_CUTTER_RESEARCH.md` | Pesquisa completa sobre o cortador: abordagens, o que funciona, o que quebra |
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

### 6. OpenSCAD: `The given mesh is not closed!` com polígonos côncavos

**Erro:** `ERROR: The given mesh is not closed! Unable to convert to CGAL_Nef_Polyhedron.`

**Causa raiz:** O Moore-Neighbor tracer usa 8-conectividade (movimentos diagonais). Em polígonos muito côncavos (ex: coelho com pescoço estreito), os movimentos diagonais criam **auto-interseções** no polígono resultante. O OpenSCAD rejeita polígonos auto-intersectados no `linear_extrude + difference()`.

**O que NÃO funciona:**
- Chaikin smoothing: agrava as auto-interseções em concavidades profundas
- Canvas blur antes do threshold: altera a forma do polígono, pode criar pontes em features estreitas

**Sintoma útil para diagnose:** No modo `cutter-stamp`, o stamp renderiza (usa `linear_extrude` direto, sem `difference()`) mas o cutter falha (usa `difference()`). Se stamp aparece e cutter não → polígono provavelmente auto-intersectado.

**Solução correta (a implementar):** Trocar Moore-Neighbor 8-conectividade por 4-conectividade. Ou usar Potrace (curvas Bezier, zero diagonal moves). Ver `docs/COOKIE_CUTTER_RESEARCH.md` seção 10.5.

---

## Próximos Passos (por prioridade)

### 🔴 P0 — BLOQUEANTE: Cortador de biscoito não funciona corretamente

**Situação atual (2026-04-15):** O feature principal do produto — gerar um cortador de biscoito a partir de imagem — **não está funcionando como deveria.** O estado atual:

| Modo | Comportamento | Status |
|------|--------------|--------|
| Cortador | Dá "Erro inesperado" com imagens de formas côncavas (ex: coelho) | ❌ Quebrado |
| Cortador + Carimbo | Renderiza os dois objetos juntos; qualidade visual abaixo do esperado | ⚠️ Parcial |

**Causa raiz confirmada:** O `CanvasImageTracer` usa Moore-Neighbor com 8-conectividade (inclui movimentos diagonais). Para polígonos côncavos complexos, os movimentos diagonais produzem **auto-interseções** no polígono traçado. O OpenSCAD rejeita esses polígonos em `linear_extrude + difference()` com `ERROR: The given mesh is not closed!`.

**O que já foi tentado e NÃO resolve:**
- Chaikin smoothing — agrava as auto-interseções
- Canvas blur preprocessing — muda a forma, pode criar pontes em features estreitas
- RDP com epsilon diferente — não elimina o problema estrutural das diagonais

**Referência visual esperada:** https://app.cookiecad.com — cortador com parede fina, chanfro na ponta, base larga. O nosso `OpenScadGeometryBuilder.ts` já gera o SCAD correto; o problema é o polígono de entrada.

**Soluções a tentar (por ordem de facilidade):**

1. **4-conectividade no Moore-Neighbor** _(menor esforço)_
   - Mudar `CW8` para 4 direções (N/S/E/W, sem diagonais)
   - Garante polígonos simples por construção; resultado mais "dente de serra" mas sem auto-interseções
   - Arquivo: `src/infrastructure/tracer/CanvasImageTracer.ts`

2. **Potrace** _(médio esforço, melhor resultado)_
   - Já instalado: `npm ls potrace` → v2.1.8
   - Produz curvas Bezier suaves sem diagonais
   - Requer: converter saída SVG do potrace (com `C`/`Q` Bezier) em polyline antes de passar ao OpenSCAD
   - Necessário: parsear `d="M x,y C ..."` e amostrar as curvas em pontos

3. **`manifold-3d`** _(maior esforço, mais robusto)_
   - Engine do CookieCad: `npm install manifold-3d`
   - API JavaScript direta para CSG + offset — não depende da qualidade do tracer
   - Ver `docs/COOKIE_CUTTER_RESEARCH.md` seção 9.3

---

### 🟡 P1 — Mais modelos

Após cortador funcionar:
- `stamp.json` — carimbo sozinho (sem cortador)
- `sign.json` — placa com texto (OpenSCAD)
- `keychain.json` — chaveiro com texto (OpenSCAD — estrutura já existe)

---

### 🟢 P2 — Roteamento por URL

Atualmente a navegação usa `useState<Route>` em `App.tsx`. Migrar para React Router v7:
- `/` → Home
- `/editor/:slug` → ModelEditor
- Habilita deep-link e botão voltar do navegador

---

### 🔵 P3 — Polimentos

- Web Worker para OpenSCAD WASM (não bloqueia UI durante geração)
- Skeleton loading nos cards da Home
- Toaster de notificação (download concluído, erro de geração)
- Responsividade do ModelEditor em mobile

---

## Decisões Pendentes

| Decisão | Opções | Contexto |
|---------|--------|----------|
| Tracer | 4-conectividade vs Potrace vs manifold-3d | Ver P0 acima. 4-conectividade é o caminho mais rápido. |
| Roteamento | React Router v7 vs TanStack Router | TanStack tem melhor TS mas é mais verboso |
| Workers para WASM | Web Worker vs main thread | OpenSCAD WASM bloqueia UI ~2-5s por geração |

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
7. **Próximo foco:** corrigir o tracer do cortador de biscoito (ver **P0** acima) — é o único bloqueante para o produto funcionar

---

## Histórico de Sessões

| Data | O que foi feito |
|------|----------------|
| 2026-04-13 | Setup inicial: projeto, arquitetura, CI/CD, tipos, dados, Home, brand v1 |
| 2026-04-14 | Logo v2 (conceito forja: gradientes, faíscas, brilho), docs em PT, Husky+commitlint |
| 2026-04-14 | Criação deste arquivo de plano |
| 2026-04-14 | Ambiente automatizado: `.nvmrc`, `.editorconfig`, `.vscode/`, `.mcp.json` com `${GITHUB_TOKEN}`, SETUP.md reescrito |
| 2026-04-14 | ModelEditor: formulário dinâmico, ParameterForm, upload de imagem, ThreePreview com OrbitControls |
| 2026-04-14 | Pipeline completo: CanvasImageTracer (Moore-Neighbor + RDP) → ThreeGeometryBuilder (clipper + bvh-csg) → STL |
| 2026-04-14 | Melhorias de geometria: bevel join (anti-spike), stamp deslocado, defaults intuitivos; revisão + merge develop→main |
| 2026-04-14 | Migração para OpenSCAD WASM: `OpenScadGeometryBuilder.ts` com perfil CookieCad (3 camadas), modo cutter + stamp. Conversão ASCII→Binary STL. |
| 2026-04-14 | Investigação de suavização do contorno: Chaikin (❌ causa auto-interseções → "mesh not closed"), Canvas blur (⚠️ altera forma do polígono). Revertido ao tracer original. Ver `docs/COOKIE_CUTTER_RESEARCH.md` seção 10. |
| 2026-04-15 | Deploy validado: GitHub Pages online (HTTP 200), build passa, nenhuma funcionalidade quebrada. |
| 2026-04-15 | ParameterForm: adicionado ImageField (PNG/JPG/WEBP, max 5MB, validação). Mergeado em develop. |
| 2026-04-15 | Retomada: leitura de contexto completo, criação de memórias persistentes para sessões futuras. |
| 2026-04-15 | Rebase de `feature/openscad-cookie-cutter` sobre `develop` atualizado. Conflito de PLANO.md resolvido manualmente. |
