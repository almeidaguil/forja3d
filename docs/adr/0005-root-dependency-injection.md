# ADR 0005 — Injeção de dependências na raiz

## Status

Aceita em 2026-05-12.

## Contexto

O Forja3D V1 já possui modelos em produção para cortadores, carimbos, chaveiros e QR Codes. A pesquisa de produto sobre a Mafagrafos mostrou boas oportunidades para próximos modelos, especialmente chaveiro/porta tag NFC, ornamento com nome e letreiros personalizados.

Mesmo assim, a arquitetura atual ainda tem uma dívida importante: hooks de apresentação instanciam adaptadores concretos de infraestrutura, como builders OpenSCAD, Three.js, Potrace, QR e Canvas. Isso dificulta testes, troca futura por workers ou API e aumenta o custo de adicionar novos modelos.

## Decisão

Antes de adicionar um novo modelo inspirado na Mafagrafos, o projeto prioriza a P1: mover a composição de dependências para a raiz da aplicação.

A raiz cria os adaptadores concretos e entrega apenas as portas necessárias para a apresentação. Hooks e páginas continuam chamando casos de uso, mas deixam de importar diretamente `src/infrastructure`.

## Consequências

- `presentation` fica menos acoplada a adapters concretos.
- A V1 continua 100% estática e client-side.
- Novos modelos passam a entrar sobre uma base mais fácil de testar e evoluir.
- A próxima feature de produto recomendada após esta decisão é o porta tag NFC/chaveiro NFC parametrizado.

