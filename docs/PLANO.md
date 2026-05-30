# Plano do Projeto — Forja3D

> Documento vivo. Se o contexto do chat foi perdido, comece por aqui.

Última atualização: 2026-05-30

Site ao vivo: https://almeidaguil.github.io/forja3d/

## Estado Atual

| Item | Status |
|---|---|
| Infraestrutura React 19 + TypeScript + Vite 8 | ✅ Completo |
| Tailwind CSS v4 | ✅ Completo |
| Husky + lint-staged + commitlint | ✅ Completo |
| CI em PRs para `develop` e `main` | ✅ Completo |
| Deploy automático GitHub Pages em `main` | ✅ Completo |
| Catálogo estático de modelos JSON | ✅ 8 modelos |
| Home com cards por categoria | ✅ Completo |
| ModelEditor | ✅ Funcional |
| ParameterForm dinâmico | ✅ Completo |
| Upload de imagem PNG/JPG/WEBP/GIF/BMP até 5 MB | ✅ Completo |
| Preview 3D com Three.js | ✅ Completo |
| Export STL | ✅ Completo |
| Export SVG/PNG para QR Codes | ✅ Completo |
| Cortador de Biscoito | ✅ Produção |
| Cortador + Carimbo | ✅ Produção, dois STLs |
| Carimbo com Potrace | ✅ Produção |
| Chaveiro com Texto | ✅ Produção |
| Chaveiro NFC | ✅ Produção |
| QR Code Pix | ✅ Produção |
| QR Code genérico | ✅ Produção |
| Conversor de Imagens | ✅ Produção V1 (PNG, JPG, WebP, BMP, SVG; STL opcional) |
| Suporte para Celular | ✅ Produção V1 (STL) |
| Roteamento por URL | ✅ Completo |
| Injeção de dependências na raiz | ✅ Completo |
| Testes de caracterização para QR em `generateModel` | ✅ Completo |
| Testes de caracterização para imagem/OpenSCAD em `generateModel` | ✅ Completo |
| Limpeza de camada QR em `generateModel` | ✅ Completo |
| Web Worker para OpenSCAD WASM | ✅ Implementado |
| Documentação sincronizada | ✅ Atualizada em 2026-05-30 |

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
| Chaveiro NFC | `nfc-tag-keychain` | OpenSCAD WASM + fontes TTF locais | STL |
| QR Code Pix | `qr-pix` | EMV BR Code + qrcode + Three.js | STL, SVG, PNG |
| QR Code | `qr-code` | qrcode + Three.js | STL, SVG, PNG |
| Conversor de Imagens | `image-converter` | Canvas + encoder BMP | PNG, JPG, WebP, BMP, SVG, STL opcional |
| Suporte para Celular | `phone-stand` | OpenSCAD WASM | STL |

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
- `generateModel` recebe portas de QR (`IQrContentBuilder` e `IQrAssetExporter`) e não importa `src/infrastructure` nem `qrcode` diretamente.

### Pesquisa de Mercado

A análise de produto sobre modelos personalizados registrou oportunidades em chaveiros, chaveiro NFC, ornamentos com nome, letreiros, cortadores temáticos, suportes para celular e organizadores.

Decisão executada: a P1 de arquitetura foi concluída antes da nova feature de produto.

Feature de produto concluída nesta branch: **Porta tag NFC / chaveiro NFC parametrizado**.

Próxima feature recomendada após o NFC: **Suporte para celular/tablet parametrizável**.

Detalhes: [MARKET_RESEARCH.md](MARKET_RESEARCH.md).

### Fluxos Principais

- **Cortador:** imagem → flood-fill → tracer 4-conectado → OpenSCAD WASM → STL.
- **Cortador + Carimbo:** gera STL do cortador via OpenSCAD e STL do carimbo via Potrace com tolerância de encaixe.
- **Carimbo:** imagem → Potrace WASM multi-path → Three.js ExtrudeGeometry → STL.
- **Chaveiro:** texto e parâmetros → template SCAD → fonte TTF local → OpenSCAD WASM → STL.
- **Chaveiro NFC:** texto, formato, tipo de encaixe NFC e borda para resina → template SCAD → fonte TTF local → OpenSCAD WASM → STL.
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

### 6. SVG de QR Code importava como bloco único no fatiador

**Erro/Sintoma:** downloads SVG de QR Code Pix e QR Code genérico eram importados em fatiadores como um bloco preenchido, sem preservar os módulos do QR.

**Causa:** o SVG gerado pela biblioteca incluía um fundo branco preenchido e representava os módulos escuros como traços, o que alguns fatiadores interpretam como massa única.

**Solução:** `QrAssetExporter` passou a gerar SVG próprio com fundo transparente e módulos escuros como elementos vetoriais `rect`, sem alterar PNG ou STL.

## Próximos Passos

### P0 — Fluxo Git e Deploy desta Atualização

- Abrir PR desta branch para `develop`.
- Validar CI no PR.
- Depois do merge em `develop`, abrir PR de `develop` para `main`.
- Confirmar deploy automático do GitHub Pages após merge em `main`.

### P1 — Ampliar Testes em `generateModel` ✅ Concluído

- Cobertura adicionada para fluxos de imagem: cortador, cortador + carimbo, carimbo Potrace e heightmap legado.
- Cobertura adicionada para fluxos OpenSCAD com chaveiro de texto e chaveiro NFC usando builders fake.
- Casos negativos adicionados para imagem ausente, contorno não detectado e builder Potrace indisponível.
- `application` permanece sem imports diretos de `infrastructure`.

### P2 — Validar Chaveiro NFC em Produção

- Testar geração do modelo `nfc-tag-keychain` no GitHub Pages após deploy.
- Ajustar dimensões padrão com base em uma tag NFC física real.
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
| QR SVG/PNG e Pix via ports de application | Decidido e implementado |
| Porta Tag NFC como feature de produto | Decidido e implementado |
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

## Atualização Técnica 2026-05-30 (Worker + Phone Stand)

- P2 (NFC) fica **concluído com ressalva**: geração validada em produção, pendente apenas calibração final com tag física real.
- P3 (OpenSCAD Worker) foi implementado com mensagens tipadas, timeout e cancelamento de geração.
- `useModelGenerator` recebeu proteção contra race condition para não sobrescrever preview com resposta antiga.
- Novo modelo `phone-stand` adicionado no catálogo V1 com estratégia `openscad` e saída STL.

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
| 2026-05-12 | Produto: pesquisa de mercado registrada e Chaveiro NFC escolhido como próxima feature após a P1 arquitetural |
| 2026-05-12 | Arquitetura: dependências concretas movidas para `src/app/dependencies.ts` e injetadas a partir da raiz |
| 2026-05-12 | Testes: Vitest adicionado com cobertura de caracterização para QR Link, Texto, Wi-Fi e Pix em `generateModel` |
| 2026-05-12 | Testes: regressão do hook `useModelGenerator` cobre o repasse completo das dependências de QR |
| 2026-05-12 | Arquitetura: geração de conteúdo/assets QR movida para ports e adapters, removendo imports de infraestrutura/lib externa do caso de uso |
| 2026-05-12 | Produto: Porta Tag NFC (`nfc-tag-keychain`) adicionado ao catálogo com template OpenSCAD próprio |
| 2026-05-12 | Produto: Chaveiro NFC atualizado com bolso interno como padrão e modo opcional de recesso adesivo/resina |
| 2026-05-13 | Correção: SVG de QR Code Pix e QR Code genérico passa a exportar módulos vetoriais sem fundo preenchido |
| 2026-05-30 | Produto: Conversor de Imagens adicionado com saída PNG/JPG/WebP/BMP/SVG e STL opcional |
| 2026-05-30 | Testes: cobertura de `generateModel` ampliada para cortador, cortador + carimbo, carimbo Potrace, heightmap legado e chaveiros OpenSCAD |
| 2026-05-30 | Performance: OpenSCAD movido para Web Worker com timeout/cancelamento e novo modelo `phone-stand` adicionado ao catálogo |
