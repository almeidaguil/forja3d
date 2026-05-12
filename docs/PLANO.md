# Plano do Projeto — Forja3D

> Documento vivo. Se o contexto do chat foi perdido, comece por aqui.

Última atualização: 2026-05-12

Site ao vivo: https://almeidaguil.github.io/forja3d/

## Estado Atual

| Item | Status |
|---|---|
| Infraestrutura React 19 + TypeScript + Vite 8 | ✅ Completo |
| Tailwind CSS v4 | ✅ Completo |
| Husky + lint-staged + commitlint | ✅ Completo |
| CI em PRs para `develop` e `main` | ✅ Completo |
| Deploy automático GitHub Pages em `main` | ✅ Completo |
| Catálogo estático de modelos JSON | ✅ 5 modelos |
| Home com cards por categoria | ✅ Completo |
| ModelEditor | ✅ Funcional |
| ParameterForm dinâmico | ✅ Completo |
| Upload de imagem PNG/JPG/WEBP até 5 MB | ✅ Completo |
| Preview 3D com Three.js | ✅ Completo |
| Export STL | ✅ Completo |
| Export SVG/PNG para QR Codes | ✅ Completo |
| Cortador de Biscoito | ✅ Produção |
| Cortador + Carimbo | ✅ Produção, dois STLs |
| Carimbo com Potrace | ✅ Produção |
| Chaveiro com Texto | ✅ Produção |
| QR Code Pix | ✅ Produção |
| QR Code genérico | ✅ Produção |
| Roteamento por URL | ✅ Completo |
| Injeção de dependências na raiz | ✅ Completo |
| Web Worker para OpenSCAD WASM | 🔲 A implementar |
| Documentação sincronizada | ✅ Atualizada em 2026-05-12 |

## O Que Já Está Feito

### Infraestrutura

- Projeto Vite com React 19, TypeScript 6 e Tailwind CSS v4.
- Node 22 usado no CI e documentado em `.nvmrc`.
- `npm run build` executa `tsc -b` e `vite build`.
- `npm run lint` executa ESLint.
- Husky executa lint-staged no pre-commit e commitlint no commit-msg.
- GitHub Actions:
  - `.github/workflows/ci.yml`: lint e build em PRs para `develop`/`main` e push em `develop`.
  - `.github/workflows/deploy.yml`: build e deploy para GitHub Pages em push para `main`.

### Catálogo V1

| Modelo | Slug | Tecnologia | Saídas |
|---|---|---|---|
| Cortador de Biscoito | `cookie-cutter` | Canvas tracer + OpenSCAD WASM | STL |
| Carimbo | `stamp` | Potrace WASM + Three.js | STL |
| Chaveiro com Texto | `keychain` | OpenSCAD WASM + fontes TTF locais | STL |
| QR Code Pix | `qr-pix` | EMV BR Code + qrcode + Three.js | STL, SVG, PNG |
| QR Code | `qr-code` | qrcode + Three.js | STL, SVG, PNG |

### Arquitetura Real da V1

```text
src/
  app/              composição de dependências da aplicação
  application/      casos de uso, portas e serviços
  infrastructure/   adaptadores OpenSCAD, Three.js, Potrace, QR e Canvas
  presentation/     React, páginas, hooks e componentes
  shared/           tipos e constantes
  data/             catálogo JSON estático
```

Observação: não existe `src/domain/` físico na V1 atual. Os tipos de domínio ficam em `src/shared/types/`. A separação desejada está documentada em [ARCHITECTURE.md](ARCHITECTURE.md), junto das dívidas técnicas.

### Composição de Dependências

- `src/app/dependencies.ts` instancia os adaptadores concretos da V1.
- `main.tsx` cria `AppDependencies` uma vez e injeta em `App`.
- `ModelEditor` recebe as dependências do gerador e repassa para `useModelGenerator`.
- `useModelGenerator` chama `generateModel` sem importar `src/infrastructure`.

### Pesquisa Mafagrafos

A análise de produto sobre a Mafagrafos registrou oportunidades em chaveiros, porta tag NFC, ornamentos com nome, letreiros e cortadores temáticos.

Decisão tomada: primeiro concluir a P1 de arquitetura, depois iniciar a próxima feature de produto.

Próxima feature recomendada: **Porta tag NFC / chaveiro NFC parametrizado**.

Detalhes e fontes: [MAFAGRAFOS_RESEARCH.md](MAFAGRAFOS_RESEARCH.md).

### Fluxos Principais

- **Cortador:** imagem → flood-fill → tracer 4-conectado → OpenSCAD WASM → STL.
- **Cortador + Carimbo:** gera STL do cortador via OpenSCAD e STL do carimbo via Potrace com tolerância de encaixe.
- **Carimbo:** imagem → Potrace WASM multi-path → Three.js ExtrudeGeometry → STL.
- **Chaveiro:** texto e parâmetros → template SCAD → fonte TTF local → OpenSCAD WASM → STL.
- **QR Code Pix:** payload Pix EMV BR Code client-side → matriz QR → geometria 3D → STL/SVG/PNG.
- **QR Code genérico:** link, texto ou Wi-Fi → matriz QR → geometria 3D → STL/SVG/PNG.

### UI

- `Home` lista modelos por categoria.
- `ModelEditor` renderiza parâmetros, upload de imagem quando necessário, preview e botões de download.
- `ParameterForm` suporta `string`, `number`, `boolean`, `select`, `color` e `image`.
- `ThreePreview` renderiza o STL principal e, quando existe, o STL secundário.
- `App.tsx` usa React Router com `BrowserRouter` e `basename` baseado em `import.meta.env.BASE_URL`.
- Links diretos para editores seguem o formato `/forja3d/editor/:slug`.
- `public/404.html` preserva deep links no GitHub Pages e redireciona para o SPA.

### Brand e Assets

- `public/logo.svg`
- `public/logo-icon.svg`
- `public/favicon.svg`
- Fontes TTF em `public/fonts/` usadas pelo OpenSCAD WASM.

## Problemas Encontrados e Soluções

### 1. GitHub Pages com branch não autorizada

**Erro/Sintoma:** Deploy bloqueado por política de ambiente.

**Causa:** `main` não estava autorizada no ambiente `github-pages`.

**Solução:** Autorizar `main` via API do GitHub e manter deploy em `.github/workflows/deploy.yml`.

### 2. Hook de commit com pacote ausente

**Erro/Sintoma:** pre-commit falhava por dependência inexistente.

**Causa:** configuração antiga usava `tsc-files`.

**Solução:** `lint-staged` foi simplificado para ESLint em `*.ts` e `*.tsx`.

### 3. OpenSCAD rejeitava malhas de cortadores côncavos

**Erro/Sintoma:** `The given mesh is not closed!`.

**Causa:** tracing antigo gerava auto-interseções em formas côncavas.

**Solução:** tracer 4-conectado, flood-fill, abertura morfológica e winding CCW. O cortador usa parede para fora da silhueta.

### 4. WASM falhava com hash do Vite

**Erro/Sintoma:** `Failed to fetch` ao carregar assets do OpenSCAD WASM.

**Causa:** Vite adicionava `?v=hash` em arquivos esperados pelo pacote WASM.

**Solução:** plugin no `vite.config.ts` estabiliza o caminho dos assets WASM.

### 5. Documentação divergente da árvore real

**Erro/Sintoma:** README, PLANO e ARCHITECTURE citavam `src/domain/`, ports antigos e estado anterior do catálogo.

**Causa:** features recentes foram mergeadas antes de uma revisão completa da documentação.

**Solução:** documentação principal sincronizada em 2026-05-12 com a árvore atual, modelos existentes e dívidas técnicas reais.

## Próximos Passos

### P0 — Fluxo Git e Deploy desta Atualização

- Abrir PR desta branch para `develop`.
- Validar CI no PR.
- Depois do merge em `develop`, abrir PR de `develop` para `main`.
- Confirmar deploy automático do GitHub Pages após merge em `main`.

### P1 — Testes e Limpeza de Camada em `generateModel`

- Adicionar suíte mínima de testes de caracterização.
- Remover import direto de infraestrutura/lib externa dentro de `application`.
- Cobrir fluxos de QR Link, Texto, Wi-Fi e Pix.

### P2 — Porta Tag NFC / Chaveiro NFC Parametrizado

- Criar novo modelo parametrizado inspirado na pesquisa Mafagrafos.
- Suportar formatos simples, texto curto em relevo, furo para argola e cavidade para tag NFC.
- Manter V1 sem backend, sem leitura/gravação NFC e sem pagamentos.

### P3 — Worker para OpenSCAD WASM

- Mover compilação OpenSCAD para Web Worker.
- Manter UI responsiva durante gerações longas.
- Documentar mensagens e contrato do worker.

### P4 — Ajustes Antes da V2

- Introduzir `IModelRepository` para o catálogo.
- Revisar `IOpenScadRenderer`, que hoje é legado em relação ao uso principal de `IGeometryBuilder`.
- Planejar exportação 3MF sem mudar a V1 antes da hora.

## Decisões Técnicas

| Decisão | Status |
|---|---|
| V1 sem backend | Decidido e implementado |
| GitHub Pages para deploy V1 | Decidido e implementado |
| OpenSCAD WASM para modelos paramétricos | Decidido e implementado |
| Potrace para carimbos com detalhes | Decidido e implementado |
| QR Codes gerados no cliente | Decidido e implementado |
| React Router para rotas da V1 | Decidido e implementado |
| Injeção de dependências na raiz | Decidido e implementado |
| Porta Tag NFC como próxima feature de produto | Decidido, pendente |
| Web Worker para OpenSCAD | Decidido, pendente |

## Retomada de Sessão

1. Leia este arquivo.
2. Leia [ARCHITECTURE.md](ARCHITECTURE.md).
3. Leia [AGENTS.md](../AGENTS.md).
4. Verifique Git:

```bash
git status --short --branch
git log --oneline -10
```

5. Rode validações:

```bash
npm run build
npm run lint
```

6. Rode localmente:

```bash
npm run dev
```

7. Acesse http://localhost:5173/forja3d/

## Histórico de Sessões

| Data | O que foi feito |
|---|---|
| 2026-04-13 | Setup inicial: projeto, arquitetura, CI/CD, tipos, dados, Home e brand v1 |
| 2026-04-14 | Logo v2, documentação em PT, Husky e commitlint |
| 2026-04-14 | ModelEditor, ParameterForm, upload de imagem e ThreePreview |
| 2026-04-14 | Pipeline de imagem para STL com CanvasImageTracer e ThreeGeometryBuilder |
| 2026-04-14 | Migração do cortador para OpenSCAD WASM |
| 2026-04-15 | Deploy validado no GitHub Pages |
| 2026-04-15 | ImageField no ParameterForm |
| 2026-04-17 | CI em PRs para `develop` e `main` |
| 2026-04-17 | Correções do cortador: flood-fill, tracer 4-conectado, winding e parede para fora |
| 2026-04-17 | Cortador + Carimbo com dois STLs e Potrace |
| 2026-04-17 | QR Code Pix 3D com STL/SVG/PNG e Pix copia-e-cola |
| 2026-04-17 | Chaveiro com Texto com fontes locais, NFC e 3 formatos |
| 2026-05-12 | Documentação principal sincronizada com o estado real do projeto e com o QR Code genérico |
| 2026-05-12 | Roteamento por URL com React Router: Home em `/`, editores em `/editor/:slug` e fallback para GitHub Pages |
| 2026-05-12 | Segurança: audit zerado com troca de `potrace`/Jimp por `esm-potrace-wasm`, atualização de `postcss` e transitivos |
| 2026-05-12 | Estabilidade: `PotraceStampBuilder` limita a entrada do Potrace WASM a 96 px no maior lado e usa saída de paths para evitar erro `offset is out of bounds` |
| 2026-05-12 | Produto: pesquisa Mafagrafos registrada e Porta Tag NFC escolhido como próxima feature após a P1 arquitetural |
| 2026-05-12 | Arquitetura: dependências concretas movidas para `src/app/dependencies.ts` e injetadas a partir da raiz |
