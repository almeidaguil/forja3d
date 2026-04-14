# ADR 0003 — Three.js ExtrudeGeometry para modelos baseados em imagem

**Data:** 2026-04-14
**Status:** Aceito

## Contexto

Modelos baseados em imagem (cortadores de biscoito, carimbos) precisam converter o contorno de uma imagem 2D em uma forma 3D. Isso pode ser feito via OpenSCAD (`linear_extrude` + SVG importado) ou diretamente no Three.js.

## Decisão

Usar **`ExtrudeGeometry` do Three.js** para todos os modelos baseados em imagem (cortadores de biscoito, carimbos).

## Justificativa

- Sem etapa de compilação WASM — a geometria é construída em milissegundos
- Atualizações de preview em tempo real conforme os parâmetros mudam (altura, espessura, offset)
- O `SVGLoader` do Three.js analisa caminhos SVG diretamente em objetos `ShapePath`
- O `ExtrudeGeometry` lida com furos, polígonos côncavos e contornos complexos
- A exportação STL funciona diretamente a partir da `BufferGeometry` do Three.js via `STLExporter`

## Alternativas consideradas

- **OpenSCAD WASM + importação SVG**: funciona, mas adiciona um atraso de compilação de 2 a 10 segundos a cada mudança de parâmetro; experiência ruim para edição interativa
- **Three.js + CSG**: permitiria operações booleanas, mas não são necessárias para cortadores de biscoito

## Consequências

- **Positivo**: Feedback instantâneo nas mudanças de parâmetros
- **Positivo**: Sem dependência de WASM para os tipos de modelo mais populares
- **Positivo**: Preview colorido (cor do material) funciona nativamente
- **Negativo**: Limitado a formas baseadas em extrusão; operações booleanas 3D complexas requerem OpenSCAD
- **Negativo**: O `SVGLoader` do Three.js tem casos extremos com caminhos SVG malformados

## Nota de implementação

O adaptador de infraestrutura `ThreeGeometryBuilder` lida tanto com o caminho SVG-a-partir-de-imagem quanto com o caminho SVG-a-partir-de-formas-embutidas. As formas embutidas (círculo, quadrado, estrela, hexágono) são geradas como objetos `Shape` do Three.js sem passar por SVG.
