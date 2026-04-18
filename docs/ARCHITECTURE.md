# Arquitetura — Forja3D

## Visão geral

O Forja3D segue os princípios de **Clean Architecture** (Robert C. Martin) combinados com **Domain-Driven Design**. O objetivo é uma base de código onde as regras de negócio são independentes de frameworks de UI, bibliotecas de renderização e restrições de hospedagem.

---

## Diagrama de camadas

```
┌─────────────────────────────────────────────────────────────────┐
│  Presentation (React, Three.js canvas, Tailwind)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Application (Use Cases)                                │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Domain (Entities, Value Objects, Interfaces)   │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │  Infrastructure (WASM, Three.js, Canvas, File I/O)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

Regra de dependência: **as setas apontam apenas para dentro**. As camadas internas não conhecem as camadas externas.

---

## Camada de domínio (`src/domain/`)

O coração da aplicação. Contém TypeScript puro — sem framework, sem importações de bibliotecas externas.

### Entidades e objetos de valor principais

#### `Model`
Representa um template de modelo 3D gerado.

```typescript
interface Model {
  id: string
  slug: string
  title: string
  category: ModelCategory
  parameters: ParameterSchema[]
  renderStrategy: RenderStrategy
}
```

#### `Parameter`
Descreve uma única entrada configurável de um modelo.

```typescript
type ParameterType = 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image'

interface ParameterSchema {
  key: string
  type: ParameterType
  label: string
  default: ParameterValue
  min?: number        // para 'number'
  max?: number        // para 'number'
  step?: number       // para 'number'
  options?: string[]  // para 'select'
}
```

#### `GenerationResult`
Resultado retornado por qualquer caso de uso de geração.

```typescript
interface GenerationResult {
  status: 'success' | 'error'
  geometry?: ArrayBuffer  // dados STL binários
  error?: string
}
```

#### `RenderStrategy`
União discriminada que informa à camada de aplicação qual renderizador utilizar.

```typescript
type RenderStrategy =
  | { type: 'openscad'; scadTemplate: string }
  | { type: 'three-extrude'; svgSource: 'image' | 'builtin'; builtinShape?: BuiltinShape }
```

---

## Camada de aplicação (`src/application/`)

Contém os casos de uso. Cada caso de uso é uma classe ou função com um contrato claro de entrada/saída. Sem React, sem UI.

### Casos de uso

#### `generateModel`
Despacha para o renderizador correto com base na `RenderStrategy` do modelo.
- Chama `IOpenScadRenderer` para a estratégia `openscad`
- Chama `IThreeGeometryBuilder` para a estratégia `three-extrude`

#### `traceImage`
Recebe um arquivo de imagem bruto, executa pelo traçador de imagem e retorna uma string de caminho SVG.
- Chama a porta `IImageTracer`

#### `exportStl`
Recebe uma `BufferGeometry` do Three.js e retorna um `ArrayBuffer` binário STL.
- Chama a porta `IStlExporter`

### Portas (interfaces definidas aqui, implementadas na infraestrutura)

```typescript
interface IOpenScadRenderer {
  compile(scadCode: string): Promise<ArrayBuffer>
}

interface IImageTracer {
  trace(imageData: ImageData): Promise<string>  // retorna string de caminho SVG
}

interface IThreeGeometryBuilder {
  buildFromSvgPath(path: string, params: ExtrudeParams): BufferGeometry
  buildFromScad(scadCode: string): Promise<BufferGeometry>
}

interface IStlExporter {
  export(geometry: BufferGeometry): ArrayBuffer
}
```

---

## Camada de infraestrutura (`src/infrastructure/`)

Implementa as portas. Tem conhecimento de bibliotecas externas (Three.js, OpenSCAD WASM, Canvas API).

### Adaptadores

| Adaptador | Porta | Tecnologia | Modelos |
|---|---|---|---|
| `OpenScadGeometryBuilder` | `IGeometryBuilder` | `openscad-wasm-prebuilt` (WASM) | Cortador, Chaveiro, template SCAD |
| `PotraceStampBuilder` | `IGeometryBuilder` | `potrace` + Three.js | Carimbo (detalhes reais) |
| `QrCodeGeometryBuilder` | `IGeometryBuilder` | `qrcode` + Three.js | QR Code Pix |
| `HeightmapStampBuilder` | `IGeometryBuilder` | Three.js | Legado — heightmap flat |
| `CanvasImageTracer` | `IImageTracer` | Canvas API + Moore-Neighbor 4-conn | Extração de contorno para cortador |
| `ThreeGeometryBuilder` | `IGeometryBuilder` | Three.js `ExtrudeGeometry` | Legado |

### Serviços de aplicação

- **`src/application/services/imageProcessing.ts`**: `fillEnclosedRegions()` — flood-fill BFS que converte imagens de contorno em silhuetas sólidas antes do rastreamento. Usado pelo cortador antes de passar para o tracer.

### Estratégia de rastreamento e geração de geometria

**Cortador de biscoito:**
1. `fillEnclosedRegions(imageData, threshold)` — preenche interior da forma
2. `CanvasImageTracer.trace()` — Moore-Neighbor 4-conectividade → path SVG
3. `OpenScadGeometryBuilder.build()` — path → SCAD → WASM → STL

**Carimbo (detalhes reais):**
1. `PotraceStampBuilder.build()` — imageData → Potrace multi-path → Three.js ExtrudeGeometry com holes → STL

**Chaveiro com Texto:**
1. `OpenScadGeometryBuilder.buildFromTemplate('keychain', params)` — template SCAD parametrizado, fontes TTF de `public/fonts/`

**QR Code Pix:**
1. `buildPixPayload()` — gera payload EMV BR Code (100% client-side)
2. `QrCodeGeometryBuilder.build()` — matriz QR → Three.js BoxGeometry por módulo → STL

### Fontes tipográficas

19 fontes TTF em `public/fonts/` (servidas como assets estáticos, sem CDN). Usadas pelo OpenScadGeometryBuilder via Emscripten FS. Script de download: `scripts/download-fonts.mjs`.

---

## Camada de apresentação (`src/presentation/`)

Componentes React e hooks. Os componentes são "burros" — recebem dados e disparam eventos. Toda a lógica vive nos hooks, que chamam os casos de uso da aplicação.

### Hooks principais

- `useModelGenerator(model, params)` — chama o caso de uso `generateModel`, gerencia estado de carregamento/erro
- `useImageTracer(file)` — chama o caso de uso `traceImage`, retorna o caminho SVG
- `useModelViewer(geometry)` — inicializa a cena Three.js, atualiza a geometria

### Regras de componentes

- Componentes renderizam apenas o que os hooks fornecem
- Nenhuma importação de caso de uso dentro de arquivos `.tsx`
- O canvas Three.js é encapsulado no componente `ModelViewer` com sua própria lógica imperativa via ref

---

## Camada de dados (`src/data/models/`)

Arquivos JSON, um por tipo de modelo. Definem os metadados do modelo, os esquemas de parâmetros e a estratégia de renderização. Esta é a fonte de verdade para quais modelos existem e como se comportam.

Exemplo (`cookie-cutter.json`):

```json
{
  "id": "cookie-cutter",
  "slug": "cookie-cutter",
  "title": "Cookie Cutter",
  "category": "cutters",
  "renderStrategy": {
    "type": "three-extrude",
    "svgSource": "image"
  },
  "parameters": [
    { "key": "cutterHeight", "type": "number", "label": "Height (mm)", "default": 20, "min": 10, "max": 50, "step": 1 },
    { "key": "wallThickness", "type": "number", "label": "Wall thickness (mm)", "default": 2, "min": 1, "max": 5, "step": 0.5 },
    { "key": "outlineOffset", "type": "number", "label": "Outline offset (mm)", "default": 3, "min": 0, "max": 10, "step": 0.5 },
    { "key": "color", "type": "color", "label": "Preview color", "default": "#e07b54" }
  ]
}
```

---

## Architecture Decision Records (ADRs)

Armazenados em `docs/adr/`. Formato: `NNNN-titulo.md`.

| # | Decisão | Status |
|---|---|---|
| [0001](adr/0001-client-side-only.md) | Toda renderização é client-side (sem backend na V1) | Aceito |
| [0002](adr/0002-openscad-wasm.md) | Usar OpenSCAD WASM para modelos paramétricos de texto/geometria | Aceito |
| [0003](adr/0003-three-extrude-for-images.md) | Usar Three.js ExtrudeGeometry para modelos baseados em imagem | Aceito |
| [0004](adr/0004-canvas-tracer-v1.md) | Canvas API para cortador; Potrace para carimbo com detalhes | **Atualizado** — Potrace adotado para stamp (P1a) |
| 0005 | QR Code Pix gerado 100% client-side via payload EMV BR Code | Aceito |
| 0006 | Fontes TTF em `public/fonts/` (sem CDN) para OpenSCAD WASM | Aceito |

---

## Restrições tecnológicas

| Restrição | Motivo |
|---|---|
| Sem backend na V1 | Hospedado no GitHub Pages (apenas estático) |
| Sem autenticação na V1 | Uso pessoal, sem necessidade de gerenciamento de usuários |
| Sem exportação 3MF na V1 | STL é suficiente; 3MF é uma preocupação da V2 |
| Sem i18n na V1 | Idioma único (PT-BR); i18n é uma preocupação da V2 |
| Sem pagamento na V1 | Apenas uso pessoal; integração com Stripe é V2 |
