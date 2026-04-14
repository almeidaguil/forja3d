# ADR 0001 — Renderização exclusivamente client-side na V1

**Data:** 2026-04-14
**Status:** Aceito

## Contexto

O Forja3D precisa gerar modelos 3D a partir de parâmetros e imagens fornecidos pelo usuário. Isso requer um motor de renderização (OpenSCAD ou Three.js). Precisamos decidir se a renderização acontece em um servidor ou no navegador.

## Decisão

Toda a renderização na V1 é **exclusivamente client-side**. Nenhum servidor backend é necessário.

## Justificativa

- A V1 é um projeto pessoal hospedado no GitHub Pages, que é apenas estático (sem execução de servidor)
- Elimina custos e complexidade de infraestrutura
- O OpenSCAD pode ser compilado para WebAssembly e executado no navegador
- O Three.js roda nativamente no navegador e pode extrudar caminhos SVG em geometria 3D
- O download pelo navegador é suficiente para exportação STL — sem necessidade de armazenamento em nuvem

## Consequências

- **Positivo**: Custo zero de hospedagem, sem backend para manter, implantação simples
- **Positivo**: Sem latência de viagens de ida e volta pela rede
- **Negativo**: A compilação WASM é mais lenta do que o binário nativo do OpenSCAD
- **Negativo**: O binário WASM grande aumenta o carregamento inicial da página (~20–30MB)
- **Negativo**: Sem dados persistentes do usuário, sem histórico de gerações

## Caminho de migração para V2

Substituir a implementação WASM do `IOpenScadRenderer` por um adaptador HTTP que chama `/api/generate`. Nenhuma alteração em código de domínio ou casos de uso é necessária. Veja [V2_ROADMAP.md](../V2_ROADMAP.md#renderização-server-side).
