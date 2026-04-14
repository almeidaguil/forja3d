# Cookie Cutter Generator — Pesquisa, Aprendizados e Referências

> Documento criado em 2026-04-14 para registrar tudo que foi aprendido, testado, o que funcionou, o que falhou, e o que falta fazer.

---

## 1. O Problema

Queremos gerar modelos 3D (STL) de cortadores de biscoito a partir de imagens enviadas pelo usuário. O pipeline é:

```
Imagem → Traçar contorno (polígono 2D) → Gerar geometria 3D (anel oco) → Exportar STL
```

### Modos de geometria
| Modo | Descrição |
|------|-----------|
| `solid` | Extrusão sólida do contorno |
| `cutter` | Anel oco (paredes finas) para cortar a massa |
| `cutter-stamp` | Anel oco + disco com contorno embossado para carimbar |

---

## 2. Pipeline Atual

### 2.1 Traçamento de Imagem (`CanvasImageTracer.ts`)
- **Binarização**: Grayscale com pesos padrão (0.299R + 0.587G + 0.114B), threshold configurável
- **Moore-Neighbor Tracing**: Contorno de borda em 8-conectividade, sentido horário
- **Simplificação RDP**: Ramer-Douglas-Peucker com epsilon = 1.5px
- **Saída**: String SVG path (`M x y L x y ... Z`)

### 2.2 Geração de Geometria
Duas implementações tentadas:

#### A) `ThreeGeometryBuilder.ts` (Three.js + CSG)
- Clipper-lib para offset inward do polígono
- three-bvh-csg para subtração booleana (outer - inner = anel)
- **Status**: Não funciona bem para formas côncavas complexas

#### B) `OpenScadGeometryBuilder.ts` (OpenSCAD WASM)
- Gera código SCAD com `offset(r=-wall)` + `difference()`
- Renderiza via `openscad-wasm-prebuilt`
- **Status**: Geometria correta, mas resultado visual no preview ainda com problemas

### 2.3 Preview 3D (`ThreePreview/index.tsx`)
- Three.js com STLLoader, OrbitControls
- Camera em `(0, 0, maxDim * 2)` olhando para origem
- MeshPhongMaterial com specular e shininess

---

## 3. Abordagens Tentadas (Cronologia)

### 3.1 ExtrudeGeometry + Shape com hole (earcut)
**Ideia**: Criar um `THREE.Shape` com o contorno externo e um `THREE.Path` hole interno (offset), depois extrudar.

**Resultado**: ❌ Falha
- earcut (triangulador do Three.js) não consegue triangular corretamente anéis de polígonos côncavos complexos
- Formas como coelho criam triângulos invertidos, spikes, e geometria sólida onde deveria ser oca

**Aprendizado**: earcut é um algoritmo 2D que assume polígonos simples. Polígonos côncavos com narrow features causam self-intersections no inner path que o earcut não consegue resolver.

### 3.2 Offset manual com Bevel/Miter Join
**Ideia**: Implementar offset inward manualmente calculando bissetrizes dos vértices.

**Resultado**: ❌ Falha
- **Bevel join**: Dava deslocamento ZERO em vértices com normais antiparalelas (pontas de orelhas, concavidades profundas). O inner path ficava no outer path → sem buraco → shape aparecia sólida.
- **Miter join**: Explode em vértices convexos agudos (d/cos(θ/2) → ∞). Tentamos cap a 3x wallThickness mas ainda falhava em features finas.

**Aprendizado**: Offset de polígonos côncavos é um problema computacional não-trivial. Soluções vertex-by-vertex (bevel/miter) não funcionam para polígonos complexos. É necessário um algoritmo de clipping real.

### 3.3 Clipper-lib para offset + ExtrudeGeometry com hole
**Ideia**: Usar clipper-lib (implementação JS do algoritmo de Vatti/Angus Johnson) para offset robusto, depois usar o resultado como hole no Shape.

**Resultado**: ⚠️ Parcial
- O offset do clipper funciona corretamente (verificado com testes)
- MAS o earcut do Three.js ainda falha na triangulação do anel resultante
- Clipper retorna múltiplos paths para features finas → paths nested dentro de outros paths criam "ilhas sólidas" dentro da área oca

**Aprendizado**: O problema não era o offset — era a triangulação. Clipper resolve o 2D mas Three.js falha no 3D.

### 3.4 Remoção de cap (removeCapAtZ)
**Ideia**: Remover a face traseira (z=0) do anel extrudado para evitar o "beiral interno" visível através do buraco.

**Resultado**: ⚠️ Parcial
- Remove a borda interna visível ✓
- Mas cria mesh aberta (non-manifold) → pode causar problemas na impressão 3D
- O anel fica visualmente "vazio" demais — difícil ver a profundidade

**Aprendizado**: Hacks de remoção de faces não são sustentáveis. A geometria precisa ser correta desde o início.

### 3.5 CSG com three-bvh-csg (subtração booleana)
**Ideia**: Extrudar outer e inner como dois sólidos separados, subtrair inner do outer = anel limpo.

**Resultado**: ⚠️ Parcial
- Melhor que earcut — produz anel reconhecível
- AINDA tem artifacts em features finas (spikes, faces invertidas)
- three-bvh-csg tem limitações de precisão com faces coplanares

**Aprendizado**: CSG no browser via JS/WASM não é tão robusto quanto CSG nativo (CGAL, OpenSCAD Manifold kernel).

### 3.6 OpenSCAD WASM
**Ideia**: Gerar código SCAD trivialmente correto e usar OpenSCAD's CGAL kernel via WASM.

**Resultado**: ✅ Geometria correta, ⚠️ visual no preview
- `offset(r=-wall)` + `difference()` produz anel geometricamente perfeito
- Sem artifacts, sem spikes de triangulação
- MAS: o contorno do traçador (Moore-neighbor) tem ruído pixelado que aparece como spikes na geometria
- Tentativa de suavização (`smoothPolygon` via clipper morphological close) removeu detalhes demais → cortador ficou sem "afiação"

**Aprendizado**: OpenSCAD é a solução correta para geometria. O problema restante é a qualidade do contorno de entrada (image tracing).

---

## 4. O Que Funciona Hoje

| Componente | Status | Nota |
|------------|--------|------|
| Upload de imagem | ✅ | PNG, JPG, WEBP, máx 5MB |
| Traçamento de contorno | ⚠️ | Funciona mas produz contornos irregulares em features finas |
| Offset de polígono (clipper) | ✅ | Robusto, testado com múltiplas formas |
| Geometria via OpenSCAD WASM | ✅ | Matematicamente correto |
| Conversão ASCII→Binary STL | ✅ | Testado e validado |
| Preview 3D | ✅ | Three.js com OrbitControls |
| Download STL | ✅ | Exportação binária funcional |
| Modo Cortador | ⚠️ | Geometria ok, visual precisa melhorar |
| Modo Cortador + Carimbo | ⚠️ | Duas peças lado a lado, carimbo precisa refinamento |

---

## 5. O Que Falta Fazer

### 5.1 CRÍTICO: Melhorar Qualidade do Contorno
O Moore-neighbor tracing + RDP produz contornos pixelados. Opções:
1. **Usar `potrace`** (já instalado no projeto!) — produz curvas Bezier suaves em vez de polylines pixeladas
2. **Aumentar epsilon do RDP** — menos vértices, menos ruído
3. **Suavização leve** — morphological close com raio menor (0.1-0.2mm em vez de 0.5mm)

### 5.2 CRÍTICO: Resolver Visualização 3D
O preview mostra a geometria mas não é intuitivo:
- Camera padrão olha diretamente na face frontal do anel → aparece como um contorno 2D
- Considerar rotacionar a geometria ou mudar a posição inicial da câmera
- Adicionar edges/wireframe para melhor visualização da espessura da parede

### 5.3 DESEJÁVEL: Perfil de corte (taper/wedge)
Cortadores de biscoito profissionais têm perfil em cunha:
```
    /\     ← ponta afiada (0mm)
   /  \
  |    |   ← parede reta (0.8mm de espessura)
  |    |
  |____|   ← base/pega (4mm de espessura, 1mm de altura)
```

Em OpenSCAD isso é feito com `minkowski()` mas é MUITO lento (~30-60s). Para impressão 3D, paredes retas a 0.8mm já funcionam como lâmina.

### 5.4 DESEJÁVEL: Carimbo com detalhe embossado
O stamp deveria mostrar:
- Base sólida (3mm) = superfície do carimbo
- Contorno do cortador elevado (1.5mm) no topo = padrão que fica marcado na massa

---

## 6. Referências Técnicas

### 6.1 Projetos Open-Source

| Projeto | Link | Linguagem | Relevância |
|---------|------|-----------|------------|
| CZDanol/cookieCutterStlGenerator | https://github.com/CZDanol/cookieCutterStlGenerator | Python + OpenSCAD | Melhor referência. Usa minkowski() para perfil em cunha. Template SCAD completo |
| cwalther/cookie-cutter-sweeper | https://github.com/cwalther/cookie-cutter-sweeper | C++ + Python | Sweep de cross-section ao longo do contorno. Extensão para Inkscape |
| OpenSCAD Advent Calendar 2019 | https://github.com/openscad/openscad-advent-calendar-2019/blob/master/cookie-cutter.scad | OpenSCAD | Exemplo limpo com minkowski() + tapered cylinder |
| Feuermurmel/cookie-cutters | https://github.com/Feuermurmel/cookie-cutters | OpenSCAD | Coleção de cortadores gerados com OpenSCAD |

### 6.2 Bibliotecas Usadas

| Biblioteca | npm | Versão | Para quê | Status |
|------------|-----|--------|----------|--------|
| three | three | ^0.183.2 | Rendering 3D, STL export/import | ✅ Em uso |
| openscad-wasm-prebuilt | openscad-wasm-prebuilt | ^1.2.0 | Geometria CSG via WASM | ✅ Em uso (builder principal) |
| clipper-lib | clipper-lib | ^6.4.2 | Polygon offset 2D | ✅ Em uso (Three.js builder) |
| three-bvh-csg | three-bvh-csg | ^0.0.18 | CSG boolean (subtraction/union) | ⚠️ Instalado, artifacts em formas complexas |
| potrace | potrace | ^2.1.8 | Raster→vector tracing (Bezier curves) | ❌ Instalado mas NÃO usado |

### 6.3 Artigos e Discussões

| Título | Link | Insight Principal |
|--------|------|-------------------|
| Three.js forum: Cookie cutter from 2D image | https://discourse.threejs.org/t/cookie-cutter-how-to-code-a-website-that-convert-any-2d-image-into-3d-cookie-cutter-model-ready-for-3d-printing/30170 | ExtrudeGeometry com extrudePath sweep |
| Three.js forum: Hollowed out extrusion | https://discourse.threejs.org/t/is-there-an-easy-way-to-create-a-hollowed-out-extrusion/61652 | CSG subtraction como abordagem recomendada |
| Three.js forum: Sweeping along a path | https://discourse.threejs.org/t/solved-sweeping-along-a-path/3183 | ExtrudeGeometry.extrudePath para sweep de cross-section |
| Cubehero: Cookie cutters with Minkowski in OpenSCAD | https://cubehero.com/2013/12/31/creating-cookie-cutters-using-offsets-in-openscad/ | Tutorial detalhado de offset + minkowski para cortadores |
| Gas Station Without Pumps: BOSL2 path_sweep | https://gasstationwithoutpumps.wordpress.com/2025/08/29/new-shakespeare-cookie-cutter/ | BOSL2 library path_sweep() para contornos complexos |
| Creality: How to make 3D printed cookie cutters | https://www.creality.com/blog/how-to-make-3d-printed-cookie-cutters | Guia prático com medidas recomendadas |
| Instructables: Cookie Cutters with Inkscape+OpenSCAD | https://www.instructables.com/3D-Printable-Cookie-Cutters-With-Inkscape-and-Open/ | Pipeline manual SVG→OpenSCAD |
| MakerBlock: OpenSCAD Club Cookies | https://makerblock.com/2025/04/openscad-club-cookies/ | Exemplos de cortadores com OpenSCAD |
| JSFiddle: Three.js cookie cutter demo | https://jsfiddle.net/greggman/9vosqw7j/ | Demo funcional de ExtrudeGeometry + extrudePath |

### 6.4 Documentação de APIs

| API | Link | Nota |
|-----|------|------|
| OpenSCAD offset() | https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#offset | `r` param para offset arredondado |
| OpenSCAD minkowski() | https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#minkowski | Para sweep de cross-section (lento) |
| Clipper-lib ClipperOffset | https://github.com/junmer/clipper-lib/blob/master/Documentation.md | JoinType, MiterLimit, EndType |
| Three.js ExtrudeGeometry | https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry | extrudePath para sweep ao longo de curva |
| three-bvh-csg | https://github.com/gkjohnson/three-bvh-csg | SUBTRACTION, ADDITION, INTERSECTION |
| openscad-wasm-prebuilt | https://www.npmjs.com/package/openscad-wasm-prebuilt | createOpenSCAD(), renderToStl() |

### 6.5 CookieCad (Referência Comercial)
- **URL**: https://cookiecad.com / https://app.cookiecad.com
- **Docs**: https://docs.cookiecad.com/cookiecad-designer/features-overview/
- **API pública**: NÃO existe
- **Parâmetros default**: blade=0.8mm, height=10mm, support blade opcional, imprint depth configurável
- **Modelo de negócio**: SaaS ($150/ano) + venda de filamento PLA food-safe

---

## 7. Conceitos Geométricos Aprendidos

### 7.1 Polygon Offset (Inward)
Para um polígono CW em coordenadas Y-down (SVG):
- **Normal inward**: Rotacionar edge 90° CCW → `[-ey, ex]`
- **Bevel join**: `d * normalize(in1 + in2)` — limita deslocamento mas dá ZERO em pontas agudas
- **Miter join**: Interseção de linhas offset — correto mas explode em cantos agudos
- **Solução real**: Clipper-lib com `jtRound` — handles TUDO corretamente

### 7.2 Winding (Sentido de Rotação)
- Polígono do traçador: **CW em Y-down** = **CCW em math padrão** (shoelace positivo)
- Three.js earcut: outer = CCW, holes = CW (em math padrão)
- Para buraco: **reverter** o inner path
- OpenSCAD: não se preocupa com winding — `polygon()` aceita qualquer sentido

### 7.3 CSG (Constructive Solid Geometry)
- **Subtração**: outer_solid - inner_solid = anel oco
- **Coplanar faces**: CSG falha quando faces dos dois sólidos coincidem → inner sólido precisa ser ligeiramente maior (±0.1mm)
- **CGAL** (usado pelo OpenSCAD): kernel geométrico robusto, handles degenerações
- **three-bvh-csg**: rápido mas menos robusto que CGAL

### 7.4 Perfil Cross-Section de Cookie Cutter
```
Parâmetros (CZDanol template):
- baseWidth:          4mm   (largura da pega)
- baseHeight:         1mm   (altura da pega)
- cutterWidth:        0.8mm (espessura da lâmina)
- cutterHeight:       10mm  (altura total)
- cutterWedgeHeight:  3mm   (altura do taper na ponta)
```

Para impressão 3D: paredes retas a 0.8mm funcionam bem como lâmina. O taper é bonus.

---

## 8. Arquitetura do Projeto

```
src/
├── application/
│   ├── ports/
│   │   ├── IGeometryBuilder.ts    ← Interface principal
│   │   ├── IImageTracer.ts        ← Interface do traçador
│   │   └── IOpenScadRenderer.ts   ← Interface (não usada ativamente)
│   └── useCases/
│       ├── generateModel/         ← Orquestra: trace → build → resultado
│       └── exportStl/             ← Download do arquivo STL
├── infrastructure/
│   ├── tracer/
│   │   └── CanvasImageTracer.ts   ← Moore-neighbor + RDP
│   ├── openscad/
│   │   └── OpenScadGeometryBuilder.ts  ← BUILDER PRINCIPAL (OpenSCAD WASM)
│   └── three/
│       └── ThreeGeometryBuilder.ts     ← Builder alternativo (Three.js CSG)
├── presentation/
│   ├── components/
│   │   ├── ThreePreview/          ← Visualização 3D
│   │   ├── ParameterForm/         ← Formulário dinâmico
│   │   └── ui/                    ← Componentes base (Button, etc.)
│   ├── hooks/
│   │   ├── useModelGenerator.ts   ← Hook principal de geração
│   │   └── useParameterForm.ts    ← Estado dos parâmetros
│   └── pages/
│       ├── Home/                  ← Catálogo de modelos
│       └── ModelEditor/           ← Editor com preview
└── data/
    └── models/
        └── cookie-cutter.json     ← Configuração do modelo
```

---

## 9. Repositórios e Projetos Descobertos (Abril 2026)

### 9.0 CookieCad — Schema Completo de Parâmetros (de docs.cookiecad.com)

Extraído da documentação oficial e de URLs de compartilhamento decodificadas.

#### Perfil Cross-Section do Cortador CookieCad
```
          ←── baseWidth (4mm) ──→
    ┌─────────────────────────────┐ ─┐
    │         HANDLE/BASE         │  │ baseHeight (3.5mm)
    │  (rectangle/round/chamfer)  │  │
    ├────────┐           ┌────────┤ ─┘
             │           │
             │  BLADE    │  bladeThickness (0.8mm)
             │  WALL     │
             │           │  bladeDepth (12.5mm) total
             │           │
             │     /     │ ─┐
             │    /      │  │ cutterChamferHeight (2mm)
             │   /       │  │
             └──┘        │ ─┘
          cutterChamferTipWidth (0.4mm)
```

#### Parâmetros Completos

**Dimensionamento:**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| cutterSize | 75mm | Tamanho geral |
| units | "mm" | Unidades |

**Lâmina (Blade):**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| bladeDepth | 12.5mm | Altura da lâmina |
| bladeThickness | 0.8mm | Espessura da parede |
| sharpCutter | false | Habilita chanfro na ponta |
| cutterChamferTipWidth | 0.4mm | Largura da ponta (mín = nozzle width) |
| cutterChamferHeight | 2mm | Altura do chanfro/taper |
| extraBladeDepth | 11.9mm | Lâmina de suporte (0 = desabilitada) |
| extraBladeThickness | 0mm | Espessura da lâmina de suporte |

**Handle/Base:**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| baseHeight | 3.5mm | Altura da pega |
| baseWidth | 4mm | Largura da pega |
| handleShape | "rectangle" | Perfil: rectangle / round / chamfer |

**Imprint (linhas internas):**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| imprintDepth | 4.5mm | Distância do topo da lâmina às linhas de imprint |

**Stamp/Carimbo:**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| stampCutterTolerance | 0.9mm | Gap entre stamp e cutter |
| stampBackHeight | 4.5mm | Altura da pega do stamp |
| stampImprintHeight | 3mm | Altura da superfície de imprint do stamp |
| deleteOuterPath | false | Remove borda externa (para embossers) |
| invertInterior | false | Inverte debosser → embosser |

**Modos (interiorType):**
| Valor | Descrição |
|-------|-----------|
| "outline" | Só contorno externo = cortador simples |
| "imprint" | Contorno + linhas internas da imagem como imprint |
| "stamp" | Modo carimbo |
| edge trace | Traça contornos de objetos preenchidos |

**Qualidade:**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| resolution | 100 | Resolução do mesh |
| simplificationDistance | 0.05mm | Tolerância de simplificação do path |
| minimumWallThickness | 0.5mm | Espessura mínima de parede |

**Auto Outline (V2):**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| outlineShape | "none" | circle / rectangle / square / hull / none |
| outlineOffset | 5mm | Espaçamento entre design e borda |

**Center Bar (barra de conexão):**
| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| centerBar | "none" | none / horizontal / vertical |
| centerBarWidth | 5-20mm | Largura da barra |

#### Pipeline de Geometria do CookieCad
```
1. Image upload (PNG/screenshot)
2. Contour tracing → paths 2D
3. Path classification: outline / imprint / edge-trace
4. Blade extrusion: paths → walls com bladeDepth × bladeThickness
5. Chamfer: taper de bladeThickness → cutterChamferTipWidth em cutterChamferHeight
6. Handle: base mais larga no topo (baseWidth × baseHeight)
7. Extra blade (opcional): segunda lâmina de suporte
8. Center bar (opcional): barra conectando peças flutuantes
9. Auto outline (opcional): borda automática (circle/rect/hull)
10. Stamp (se modo stamp): peça separada com stampCutterTolerance de gap
11. Export: STL ou OBJ
```

#### Valores Práticos da Comunidade
- **Fondant**: blade 0.6mm, depth 7mm
- **Geral**: blade 0.8-0.9mm, depth 9-12mm
- **Massa grossa/congelada**: blade 1.3mm
- **Handle pequeno**: 2mm thick × 2mm high
- **Handle grande**: 4mm thick × 4mm high
- **Imprint**: 3mm para massa de 5mm; 4.5mm default

### 9.1 CookieCad GitHub Organization
**URL**: https://github.com/cookiecad (13 repos)

O core app NÃO é open-source, mas os repos revelam a stack:

| Repo | URL | Revelação |
|------|-----|-----------|
| **Openscad-to-JSCAD-converter** | https://github.com/cookiecad/Openscad-to-JSCAD-converter | **Migraram de OpenSCAD para JSCAD**. Usa tree-sitter parser. |
| **cadit-embed-example** | https://github.com/cookiecad/cadit-embed-example | Editor "CADit" browser-based, embed via iframe + postMessage |
| **manifold-vscode-extension** | https://github.com/cookiecad/manifold-vscode-extension | **Usam a biblioteca Manifold** para geometria |

**Insight chave**: CookieCad usa **JSCAD + Manifold library** (não OpenSCAD!).

### 9.2 PROJETO MAIS RELEVANTE: welmoznine/Cookie-Cutter-STL-Generator
- **URL**: https://github.com/welmoznine/Cookie-Cutter-STL-Generator
- **Demo LIVE**: https://cookie-cutter-stl-generator.vercel.app/
- **Stack**: Next.js + React + Three.js + **OpenCV.js** + Tailwind CSS
- **Atualizado**: Janeiro 2025
- **Pipeline**: Upload → OpenCV.js detecta contorno → Three.js gera cortador 3D → STL
- **FUNCIONA** — deployed no Vercel
- **POR QUE IMPORTA**: Mesmo stack, mesmo objetivo, funciona de verdade.

### 9.3 Manifold Library (motor geométrico do CookieCad)
- **URL**: https://github.com/elalish/manifold
- **npm**: `manifold-3d`
- **Stars**: 2000+
- **Usado por**: OpenSCAD, Blender, Godot, **CookieCad**
- **Features**: CSG booleans, CrossSection, extrusion, **guaranteed manifold output**
- **WASM/JS bindings**: Sim, roda no browser

### 9.4 SVG-to-STL com Clipper.js
- **URL**: https://github.com/ACTIVmap/svg-to-stl
- **Demo**: https://activmap.github.io/svg-to-stl/
- **Clipper.js stroke rendering** = algoritmo para gerar paredes do cortador

### 9.5 Outros Projetos

| Projeto | URL | Stack | Nota |
|---------|-----|-------|------|
| rcalme/svg-to-stl | https://github.com/rcalme/svg-to-stl | Three.js + ThreeCSG | SVG→3D provado |
| its-arun/svg-to-3d | https://github.com/its-arun/svg-to-3d | Next.js + Three.js + TS | Demo no Vercel |
| Murinus/cookie_cutter_gen | https://github.com/Murinus/cookie_cutter_gen | Python CLI/GUI/Web | Core generator.py |
| jdreinhardt/SimpleCookie | https://github.com/jdreinhardt/SimpleCookie | **Potrace** + OpenSCAD | Pipeline clássico |
| cwalther/cookie-cutter-sweeper | https://github.com/cwalther/cookie-cutter-sweeper | C++ | Sweep de cross-section |
| CZDanol/cookieCutterStlGenerator | https://github.com/CZDanol/cookieCutterStlGenerator | Python + OpenSCAD | Minkowski para perfil cunha |
| openscad-web-gui | https://github.com/seasick/openscad-web-gui | OpenSCAD WASM + Web | Ref. integração WASM |

### 9.6 Concorrentes Comerciais

| Site | URL | Nota |
|------|-----|------|
| CookieCad | https://app.cookiecad.com | Grátis. JSCAD + Manifold. |
| Cookie Design Lab | https://www.cookiedesignlab.com | Pago ($5/sem) |
| Cookie Spark | https://makecookiecutters.com | AI-powered |
| ImageToSTL | https://imagetostl.com/create-cookie-pastry-cutter | Grátis, server-side |

---

## 10. Sessão 2026-04-14 (2ª sessão) — O que foi tentado e o que quebrou

### 10.1 Perfil CookieCad implementado com sucesso no SCAD
O `OpenScadGeometryBuilder.ts` foi criado com o perfil de 3 camadas:
- **Camada 1**: Chanfro (4 degraus discretos, `tipWidth` → `bladeThickness` ao longo de `chamferHeight`)
- **Camada 2**: Parede reta (`bladeThickness` × `bladeHeight`)
- **Camada 3**: Handle/base (`baseWidth` × `baseHeight`)

O modo `cutter-stamp` coloca cutter (esquerda) e stamp (direita, com `translate`) lado a lado.

### 10.2 Tentativa: Chaikin smoothing no tracer → QUEBROU OpenSCAD

**Ideia**: Aplicar Chaikin corner-cutting (2 iterações) no polígono antes do RDP para suavizar o escalonamento pixel-a-pixel do Moore-Neighbor.

**Resultado**: ❌ `ERROR: The given mesh is not closed! Unable to convert to CGAL_Nef_Polyhedron.`

**Por quê**: Chaikin cria auto-interseções em polígonos côncavos complexos (pescoço, patas do coelho). A base do algoritmo é "cortar" cada aresta em dois pontos — mas para concavidades profundas adjacentes, esses novos pontos podem ficar do lado errado do polígono, criando auto-interseções. O OpenSCAD **rejeita** um polígono auto-intersectado em `linear_extrude + difference()`.

**Sintoma revelador**: O modo `cutter-stamp` renderizava o stamp (usa `offset()` + `linear_extrude` direto, sem `difference()`) mas o cutter falhava (usa `difference()`). Isso prova que o problema é na geometria de diferença, não no polígono em si.

### 10.3 Tentativa: Canvas blur preprocessing → também pode causar auto-interseções

**Ideia**: Aplicar `ctx.filter = 'blur(1.5px)'` no canvas antes do threshold para suavizar bordas pixeladas.

**Resultado**: ⚠️ Risco real

O blur **muda a forma** do polígono traçado. Em features estreitas (pescoço do coelho, espaço entre orelhas), o blur pode:
1. Criar pontes de 1px entre regiões separadas → Moore-Neighbor traça figura-8 → auto-intersecção
2. Fechar buracos que existiam na imagem original

**Decisão**: Revertido ao tracer original (sem blur, sem downscale).

### 10.4 Conclusão da sessão

O `OpenScadGeometryBuilder` funciona **quando o polígono de entrada é válido** (sem auto-interseções). O problema está no `CanvasImageTracer` que usa 8-conectividade (Moore-Neighbor diagonal) — as diagonais criam "cruzamentos" que se tornam auto-interseções em polígonos côncavos complexos.

**Estado atual do tracer**: Revertido ao original — Moore-Neighbor + RDP epsilon=1.5. O preview do modo `cutter+stamp` funcionou visualmente (ring + stamp lado a lado). O modo `cutter` sozinho ainda é instável.

### 10.5 Caminho correto para melhorar o tracer (NÃO TENTE Chaikin nem Canvas blur)

1. **Trocar 8-conectividade por 4-conectividade** no Moore-Neighbor: diagonal moves causam os cruzamentos. 4-conectividade garante polígonos simples (não auto-intersectados) por construção, mas o resultado é mais "dente de serra".

2. **Potrace** (já instalado): Produz Bezier curves, não polylines pixeladas. Não tem diagonal moves. **Requer parsear o SVG output do potrace e converter curvas Bezier em polylines** (pois o OpenSCAD só aceita `polygon(points=[[...]])`). Complexidade: média.

3. **Marching Squares**: Algoritmo alternativo ao Moore-Neighbor. Produce coordenadas sub-pixel (interpoladas), portanto contornos mais suaves sem self-intersections. Não existe dependência npm simples — precisa implementar.

4. **`manifold-3d`** como engine geométrico: Substitui OpenSCAD WASM inteiramente. A lib do CookieCad. Aceitaria polygon.offset() interno sem depender da qualidade do tracer.

---

## 11. Próximos Passos (Atualizado Abril 2026)

### Opção A: Estudar `welmoznine/Cookie-Cutter-STL-Generator` (MAIS RÁPIDO)
- Mesmo stack (React + Three.js)
- Usa **OpenCV.js** para contorno (melhor que Moore-neighbor)
- Demo funcional no Vercel — podemos ver exatamente como funciona
- Estudar código de geração 3D e adaptar

### Opção B: Usar `manifold-3d` (MAIS ROBUSTO)
- npm: `manifold-3d`
- É o engine do CookieCad
- CSG + CrossSection + extrusion com manifold garantido
- Mais rápido que OpenSCAD WASM
- API JavaScript direta

### Opção C: Potrace + OpenSCAD (MELHOR CONTORNO)
- `potrace` já instalado no projeto
- Curvas Bezier suaves vs polylines pixeladas
- Pipeline: Image → Potrace → SVG → polygon → OpenSCAD

### Ordem recomendada:
1. **IMEDIATO**: Clonar e estudar `welmoznine/Cookie-Cutter-STL-Generator`
2. **CURTO PRAZO**: Avaliar `manifold-3d` como engine geométrico
3. **MÉDIO PRAZO**: Melhorar contorno com Potrace ou OpenCV.js

---

## 12. Resumo

> Tentamos 6 abordagens diferentes para gerar a geometria 3D. A geometria via OpenSCAD WASM é matematicamente correta mas a qualidade visual no preview ainda não é satisfatória. O projeto `welmoznine/Cookie-Cutter-STL-Generator` é a referência mais promissora (mesma stack, funciona, deployed no Vercel). A stack do CookieCad (JSCAD + Manifold) é a solução mais robusta a longo prazo.
