# ADR 0002 — OpenSCAD WASM para modelos paramétricos

**Data:** 2026-04-14
**Status:** Aceito

## Contexto

Modelos paramétricos (chaveiros com texto, placas de palavras, letras grandes) requerem um motor CSG (Geometria Sólida Construtiva) capaz de lidar com operações booleanas, extrusão de texto e formas complexas definidas por fórmulas.

## Decisão

Usar **OpenSCAD compilado para WebAssembly** (`openscad-wasm-prebuilt`) para modelos paramétricos de texto/geometria.

## Justificativa

- O OpenSCAD é o padrão da indústria para modelos 3D paramétricos
- Arquivos `.scad` são legíveis por humanos e versionados
- A build WASM roda completamente no navegador sem servidor
- Permite o reuso de modelos e bibliotecas existentes da comunidade OpenSCAD
- O suporte a texto é maduro no OpenSCAD (renderização de fontes, espaçamento, etc.)

## Alternativas consideradas

- **Three.js TextGeometry**: suporta texto básico, mas não possui operações booleanas CSG; insuficiente para modelos paramétricos complexos
- **jscad/OpenJSCAD**: motor CSG nativo em JS; menos maduro, comunidade menor, suporte limitado a fontes

## Consequências

- **Positivo**: Capacidade completa do OpenSCAD no navegador
- **Positivo**: Templates `.scad` são portáveis para um servidor na V2
- **Negativo**: Binário WASM é grande (~20MB); deve ser carregado de forma lazy
- **Negativo**: A compilação leva de 2 a 10 segundos dependendo da complexidade do modelo; feedback de carregamento é obrigatório
- **Negativo**: O WASM roda na thread principal por padrão; deve usar um Web Worker para evitar travamento da UI

## Nota de implementação

Carregar o OpenSCAD WASM em um **Web Worker** para manter a UI responsiva durante a compilação. Expô-lo através da porta `IOpenScadRenderer`.
