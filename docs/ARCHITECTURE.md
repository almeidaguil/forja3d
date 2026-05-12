# Arquitetura — Forja3D

## Visão Geral

O Forja3D V1 é uma aplicação React estática que gera modelos 3D no navegador. A arquitetura usa camadas para separar casos de uso, adaptadores de renderização e interface.

A intenção arquitetural é Clean Architecture. O estado real da V1 ainda possui algumas dívidas técnicas documentadas neste arquivo, principalmente na fronteira entre `presentation` e `infrastructure`.

## Camadas Atuais

```text
src/
├── application/
│   ├── ports/
│   ├── services/
│   └── useCases/
├── infrastructure/
│   ├── openscad/
│   ├── qr/
│   ├── three/
│   └── tracer/
├── presentation/
│   ├── components/
│   ├── hooks/
│   └── pages/
├── shared/
│   ├── constants/
│   └── types/
└── data/
    └── models/
```

### `src/shared/`

Contém tipos e constantes usados por todas as camadas.

Tipos principais em `src/shared/types/index.ts`:

- `Model`
- `ParameterSchema`
- `RenderStrategy`
- `GenerationResult`
- `ModelCategory`

`Model.creditsRequired` já existe para preparar a V2. Na V1, os modelos usam `1`.

### `src/data/`

Contém o catálogo estático da V1. `src/data/index.ts` importa os JSONs e exporta:

- `models`
- `getModelBySlug(slug)`

Modelos atuais:

| Arquivo | Slug | Estratégia |
|---|---|---|
| `cookie-cutter.json` | `cookie-cutter` | `three-extrude` com imagem |
| `stamp.json` | `stamp` | `potrace-stamp` |
| `keychain.json` | `keychain` | `openscad` com template `keychain` |
| `qr-pix.json` | `qr-pix` | `three-qr` |
| `qr-code.json` | `qr-code` | `three-qr` |

### `src/application/`

Contém os contratos e casos de uso.

Portas atuais:

| Porta | Arquivo | Função |
|---|---|---|
| `IGeometryBuilder` | `application/ports/IGeometryBuilder.ts` | Gera um `ArrayBuffer` STL a partir de uma configuração de geometria |
| `IImageTracer` | `application/ports/IImageTracer.ts` | Converte `ImageData` em `pathData` vetorial |
| `IOpenScadRenderer` | `application/ports/IOpenScadRenderer.ts` | Contrato legado para renderização OpenSCAD |

Casos de uso:

| Caso de uso | Arquivo | Responsabilidade |
|---|---|---|
| `generateModel` | `application/useCases/generateModel/index.ts` | Despacha a geração conforme `renderStrategy` |
| `exportStl` | `application/useCases/exportStl/index.ts` | Dispara download de STL a partir de `ArrayBuffer` |

Serviços:

- `fillEnclosedRegions(imageData, threshold)`: preenche regiões internas antes de rastrear o contorno do cortador.

### `src/infrastructure/`

Implementa renderização, vetorização e geração de payloads.

| Adaptador | Tecnologia | Uso |
|---|---|---|
| `OpenScadGeometryBuilder` | OpenSCAD WASM | Cortador e chaveiro com texto |
| `CanvasImageTracer` | Canvas API | Contorno 4-conectado para cortador |
| `PotraceStampBuilder` | Potrace + Three.js | Carimbo com detalhes vetoriais |
| `HeightmapStampBuilder` | Three.js | Builder legado para carimbo heightmap |
| `QrCodeGeometryBuilder` | qrcode + Three.js | QR Code Pix e QR Code genérico |
| `PixPayloadBuilder` | TypeScript puro | Payload EMV BR Code Pix |
| `SvgStampBuilder` | Three.js | Builder legado |
| `ThreeGeometryBuilder` | Three.js | Builder legado |

### `src/presentation/`

Contém React, UI e estado de tela.

Páginas:

- `Home`: lista modelos por categoria.
- `ModelEditor`: exibe formulário, upload de imagem, preview 3D e downloads.

Componentes principais:

- `ModelCard`
- `ParameterForm`
- `ThreePreview`
- `Button`
- `Badge`

Hooks:

- `useParameterForm`
- `useModelGenerator`

`App.tsx` usa um roteamento local por `useState`, com páginas `home` e `editor`.

## Fluxos de Geração

### Cortador de Biscoito

1. Usuário envia imagem.
2. `fillEnclosedRegions` preenche regiões internas.
3. `CanvasImageTracer` extrai `pathData`.
4. `OpenScadGeometryBuilder` gera STL.
5. No modo Cortador + Carimbo, `PotraceStampBuilder` também gera um segundo STL para o carimbo.

### Carimbo

1. Usuário envia imagem.
2. `PotraceStampBuilder` vetoriza com Potrace.
3. Three.js gera geometria extrudada.
4. O STL é baixado pelo navegador.

### Chaveiro com Texto

1. Usuário informa texto, formato, fonte e dimensões.
2. `OpenScadGeometryBuilder` monta o template SCAD.
3. A fonte TTF é carregada de `public/fonts/`.
4. OpenSCAD WASM compila STL no cliente.

### QR Code Pix

1. `PixPayloadBuilder` gera payload EMV BR Code.
2. `QrCodeGeometryBuilder` transforma a matriz QR em geometria 3D.
3. O caso de uso também gera SVG e PNG com `qrcode`.
4. A UI mostra o Pix copia-e-cola para validação.

### QR Code Genérico

1. Usuário escolhe link, texto ou Wi-Fi.
2. `generateModel` normaliza o conteúdo.
3. `QrCodeGeometryBuilder` gera STL.
4. `qrcode` gera SVG e PNG.

## Restrições da V1

| Restrição | Motivo |
|---|---|
| Sem backend | GitHub Pages hospeda apenas arquivos estáticos |
| Sem autenticação | V1 é uma ferramenta local/client-side |
| Sem banco de dados | Catálogo vem de JSON estático |
| Sem pagamentos | Créditos e Stripe são escopo da V2 |
| Sem analytics | Rastreamento entra apenas na V2 |
| Exportação principal em STL | 3MF fica para a V2 |

## Dívidas Técnicas Conhecidas

| Dívida | Estado atual | Direção |
|---|---|---|
| Camada `domain/` física ausente | Tipos de domínio vivem em `src/shared/types/` | Criar `src/domain/` apenas quando houver regras puras suficientes |
| `presentation` importa `infrastructure` | `useModelGenerator` instancia adaptadores diretamente | Mover composição para uma raiz/injeção de dependências |
| Roteamento por `useState` | URLs não representam a página atual | Adicionar React Router em branch própria |
| `IOpenScadRenderer` pouco usado | O builder atual implementa `IGeometryBuilder` | Remover ou adaptar quando a renderização server-side da V2 for definida |
| Catálogo importado direto | `src/data/index.ts` exporta JSONs diretamente | Introduzir `IModelRepository` antes da V2 |

## ADRs

| ADR | Decisão |
|---|---|
| [0001](adr/0001-client-side-only.md) | Toda renderização é client-side na V1 |
| [0002](adr/0002-openscad-wasm.md) | OpenSCAD WASM para modelos paramétricos |
| [0003](adr/0003-three-extrude-for-images.md) | Three.js ExtrudeGeometry para modelos baseados em imagem |
| [0004](adr/0004-canvas-tracer-v1.md) | Canvas tracer para cortador e Potrace para carimbo |

## Regras de Evolução

- Código de domínio e aplicação não deve depender de React.
- Adaptadores externos ficam em `infrastructure`.
- Componentes React ficam em `presentation`.
- Novos modelos entram primeiro em JSON estático na V1.
- Implicações de auth, créditos, backend, Stripe, storage ou analytics devem ser registradas em [V2_ROADMAP.md](V2_ROADMAP.md).
