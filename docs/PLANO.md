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
| Canvas image tracer | ✅ 4-conectividade + flood-fill + winding CCW |
| Cortador de biscoito — modo Cortador | ✅ Funcional para qualquer forma (coelho, formas côncavas) |
| Cortador de biscoito — modo Cortador+Carimbo | ✅ Cortador (OpenSCAD) + Carimbo Potrace (dois STLs) |
| CI em PRs (build + lint) | ✅ Workflow ci.yml rodando em todos os PRs |
| Fix WASM fetch (Vite) | ✅ Plugin middleware remove ?v= do openscad-wasm |
| QR Code Pix 3D | ✅ EMV BR Code, download STL/SVG/PNG, Pix copia-e-cola |
| Chaveiro com Texto | ✅ 19 fontes locais, picker visual, NFC, 3 formatos |
| Roteamento por URL | 🔲 A implementar (V1 usa useState) |
| Logo v2 (forja/faíscas) | ✅ Completo |
| Documentação completa (PT) | ✅ Completo |
| **ParameterForm com ImageField** | ✅ Completo (tipos dinâmicos) |
| Memórias Claude versionadas no repo | ✅ `.claude/memory/` no repositório |
| Equipe de agentes especializados | ✅ Arquiteto, Dev Geometry, Dev Frontend, Dev MakerWorld, Revisor, Documentador |

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
| `cookie-cutter.json` | `openscad` | cutterHeight, wallThickness, tipWidth, chamferHeight, baseWidth, baseHeight, targetSize, threshold, color | ✅ Funcionando |
| `stamp.json` | `three-heightmap` | baseHeight, reliefHeight, targetSize, threshold, stampResolution, mirror, color | ⚠️ Gera; sem detalhes internos |
| `keychain.json` | `openscad` | text, fontSize, depth, padding, thickness, color | 🔲 Template SCAD pendente |

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

### ✅ P0 — RESOLVIDO: Cortador de biscoito funcionando (2026-04-17)

| Problema | Causa raiz | Solução |
|----------|------------|---------|
| "mesh not closed" côncavos | 8-conectividade + protrusions finas + winding CW + ponto duplicado | 4-conectividade + flood-fill + opening morfológico + winding CCW |
| "Failed to fetch" WASM após build | Vite adicionava `?v=hash` ao openscad-wasm | Plugin middleware `openscadWasmStable` em `vite.config.ts` |
| Parede do cortador para dentro | `outer=silhueta, inner=silhueta-wall` (invertido) | `inner=silhueta (cookie exato), outer=silhueta+wall` |

**Arquivos-chave:**
- `src/infrastructure/openscad/OpenScadGeometryBuilder.ts` — opening morfológico, winding, direção da parede
- `src/application/services/imageProcessing.ts` — `fillEnclosedRegions` (flood-fill)
- `src/infrastructure/tracer/CanvasImageTracer.ts` — 4-conectividade
- `vite.config.ts` — plugin WASM stable
- `.github/workflows/ci.yml` — CI em PRs

---

### ✅ P1 — Carimbo com detalhes reais — CONCLUÍDO (2026-04-17)

Branch: `feat/potrace-stamp` → mergeado em main

- PotraceStampBuilder: ImageData → Potrace multi-path → ExtrudeGeometry com holes
- Base no formato da silhueta (não mais retângulo)
- Parâmetros: threshold, turdSize, bezierSteps, mirror, reliefHeight

---

## Catálogo de Modelos V1 — Decisões da Equipe (2026-04-17)

> Decisões tomadas com base em análise do mercado brasileiro (Mafagrafos, downloads reais) e MakerWorld.

### Modelos já em produção (✅)

| Modelo | Slug | Tecnologia | Status |
|--------|------|-----------|--------|
| Cortador de Biscoito | `cookie-cutter` | OpenSCAD WASM | ✅ Produção |
| Carimbo | `stamp` | Potrace + Three.js | ✅ Produção |

---

### Sprint 1 — P1 (próximas branches)

#### Chaveiro com Texto
- **Branch:** `feat/keychain-text`
- **Referência:** Mafagrafos "Chaveiro Retangular com Nome" (56 downloads), "Chaveiro com Nome Completo" (77)
- **Tecnologia:** OpenSCAD — `text()` + placa + furo de argola
- **Parâmetros:** `text` (linha 1), `text2` (linha 2, opcional), `font_size`, `shape: retangular|oval|retangular_arredondado`, `thickness`, `padding`, `hole_diameter`, `add_nfc`
- **NFC:** boolean — adiciona recesso ⌀26mm × 1.2mm no verso para tag NFC padrão (215/213)
- **Dimensões padrão:** ~55×28×4mm, furo ⌀6mm, parede ao redor do furo ≥3mm

#### Chaveiro com Imagem
- **Branch:** `feat/keychain-image`
- **Referência:** MakerWorld "Image to Keychain" (viral TikTok 2024), Mafagrafos "Imagem para 3D com Bordas" (87)
- **Tecnologia:** CanvasImageTracer → OpenSCAD `polygon()` + `offset()` para borda + furo
- **Parâmetros:** `image`, `size_mm`, `thickness`, `border_width`, `add_nfc`
- **Diferencial:** silhueta do objeto vira o formato do chaveiro (não retângulo fixo)

---

### Sprint 2 — P2

#### Letreiro com Texto (2 camadas)
- **Branch:** `feat/letreiro-2-camadas`
- **Referência:** Mafagrafos "Letreiro Offset 2 Camadas" (185 downloads), "Letreiro 3 Camadas" (190)
- **Tecnologia:** OpenSCAD — camada base (texto + offset) + camada frente (texto puro)
- **Parâmetros:** `text`, `font`, `font_size`, `offset_distance`, `thickness_base`, `thickness_front`
- **Saída:** 2 STLs separados (cor1 + cor2), download como arquivo único nomeado

#### Plaquinha / Tag Personalizada
- **Branch:** `feat/tag`
- **Referência:** Mafagrafos "@Social - Retângulo 3 Cores" (162 downloads), pet tags, maçanetas
- **Tecnologia:** OpenSCAD — retângulo/oval com texto, furo opcional
- **Parâmetros:** `text`, `subtext`, `shape`, `size_mm`, `border_style`, `hole_diameter`, `add_nfc`

---

### Sprint 2b — P2 (gerador de QR Code)

#### QR Code 3D
- **Branch:** `feat/qr-code`
- **Referência:** MakerWorld "QR Code Sign & Keychain" (477k views), Elo7 placas Pix best-seller BR
- **Tecnologia:** `qrcode` (npm, 34M downloads/semana) → matriz N×N → `QrCodeGeometryBuilder` (Three.js InstancedMesh)
- **Pipeline:** `string → QRCode.create() → Uint8Array → BoxGeometry por módulo escuro → STL`
- **Tipos suportados:** URL/link, Pix (payload EMV BR Code), Wi-Fi (MECARD), WhatsApp, texto livre, vCard
- **Parâmetros:** `qr_type: url|pix|wifi|whatsapp|text|vcard`, `content`, `module_size_mm`, `base_height`, `module_height`, `border_modules`
- **Diferencial BR:** Suporte a Pix nativo — sem equivalente gratuito client-side no mercado

---

### Sprint 3 — P3 (polimentos + features técnicas)

#### Roteamento por URL
- **Branch:** `feat/url-routing`
- React Router v7 — `/` → Home, `/editor/:slug` → ModelEditor
- Decisão: React Router v7 (mais simples que TanStack para este escopo)

#### Modo Cortador + Carimbo com Potrace
- **Branch:** `fix/cutter-stamp-potrace`
- Substituir stamp flat do OpenSCAD pelo PotraceStampBuilder
- `GenerationResult` ganha `secondaryGeometry?: ArrayBuffer`
- UI: dois botões de download ("Baixar Cortador" + "Baixar Carimbo")

#### Web Worker para WASM
- **Branch:** `feat/wasm-worker`
- OpenSCAD WASM move para Worker → UI não trava durante geração (~3-5s)

#### Polimentos de UX
- **Branch:** `feat/ux-polish`
- Skeleton loading, toaster, responsividade mobile, erros mais claros

---

### Fora do escopo V1 (decisão da equipe)

| Item | Motivo |
|------|--------|
| Flexi articulado (axolotl, etc.) | Não parametrizável via web — geometria fixa |
| @Social com ícones de rede | Requer banco de ícones — fora do escopo geométrico |
| Litofane (translúcido) | Depende de filamento específico e luz — não controlável pelo app |
| String Art | Nicho muito específico — P4 se houver demanda |
| Cumbuca de imagem | Geometria 3D complexa — V2 |

---

## Decisões Técnicas Pendentes

| Decisão | Opções | Status |
|---------|--------|--------|
| Roteamento | React Router v7 vs TanStack | Decidido: **React Router v7** |
| Workers para WASM | Web Worker vs main thread | Decidido: **Web Worker (P3)** |
| NFC | Parâmetro em todos os chaveiros | Decidido: **boolean em modelos OpenSCAD de chaveiro** |
| Cortador+Carimbo com Potrace | GenerationResult com 2 buffers | Decidido: **P3, branch separada** |

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
7. **Próximo foco:** carimbo com detalhes reais via Potrace (`feat/potrace-stamp`) — ver P1 abaixo

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
| 2026-04-17 | Expansão da equipe de agentes: Dev Geometry, Dev Frontend, Dev MakerWorld, /cad-3d slash command, CLAUDE.md, copilot-instructions.md |
| 2026-04-17 | fix/openscad-wasm-fetch → develop → main: plugin Vite remove ?v= do openscad-wasm |
| 2026-04-17 | fix/tracer-flood-fill → develop → main: P0 resolvido — flood-fill + opening morfológico + winding + parede para fora |
| 2026-04-17 | ci.yml: CI Build & Lint em todos os PRs para develop/main |
| 2026-04-17 | docs/memory: memórias Claude versionadas em .claude/memory/ para reuso por outras IAs |
| 2026-04-17 | fix/cutter-stamp-potrace: Cortador+Carimbo gera dois STLs (OpenSCAD cortador + Potrace carimbo) com tolerância de encaixe 0.4mm |
| 2026-04-17 | feat/qr-code: QR Code Pix 3D — EMV BR Code client-side, download STL/SVG/PNG, Pix copia-e-cola para validação |
| 2026-04-17 | feat/keychain-text: Chaveiro com Texto — 19 fontes TTF locais, picker visual, slot NFC, borda decorativa, 3 formatos |
| 2026-04-17 | Workflow de documentação definido: docs atualizados no mesmo PR da feature (não branch separada) |
