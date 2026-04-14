# ADR 0004 — Rastreamento de contorno via Canvas API em vez de Potrace na V1

**Data:** 2026-04-14
**Status:** Aceito

## Contexto

Modelos de imagem-para-3D precisam rastrear a silhueta de uma imagem enviada pelo usuário em um caminho SVG. Duas opções foram avaliadas: uma implementação Canvas API + marching-squares e a biblioteca de vetorização Potrace.

## Decisão

A V1 usa um **rastreador de contorno baseado em Canvas API** (algoritmo de threshold + marching-squares). O Potrace está instalado como dependência, mas é utilizado como caminho de fallback/atualização.

## Justificativa

- A Canvas API é nativa do navegador — zero aumento de tamanho do bundle
- O marching-squares é suficiente para o caso de uso alvo (cortadores de biscoito, carimbos), onde contornos suaves importam menos do que a topologia correta
- O Potrace (`npm: potrace`) é um pacote Node.js; usá-lo no navegador requer bundling ou um port WASM, adicionando complexidade
- A abordagem com Canvas permite ajuste de threshold em tempo real com feedback visual imediato

## Alternativas consideradas

- **Potrace em um Web Worker**: vetorização de alta qualidade, mas requer configuração de worker e adiciona ~300KB ao bundle; adiado para V2
- **ImageTracer.js**: rastreador bitmap puro em JS; avaliado, mas produz saída de menor qualidade do que a abordagem Canvas para imagens binárias
- **OpenCV.js**: qualidade muito alta, mas binário WASM de ~30MB; não justificado para a V1

## Consequências

- **Positivo**: Sem aumento de tamanho de bundle; sem necessidade de configuração de Worker
- **Positivo**: O parâmetro de threshold ajustável dá ao usuário controle direto sobre a sensibilidade do rastreamento
- **Negativo**: Menor qualidade para imagens complexas com detalhes finos
- **Negativo**: Pode produzir contornos irregulares em bordas diagonais

## Caminho de atualização para V2

Substituir `CanvasImageTracer` (implementa `IImageTracer`) por `PotraceWorkerTracer` que executa o Potrace dentro de um Web Worker. Nenhuma alteração em código de aplicação ou domínio é necessária. Adicionar uma nota em [V2_ROADMAP.md](../V2_ROADMAP.md) quando isso se tornar uma preocupação de qualidade.
