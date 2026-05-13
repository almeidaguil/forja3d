# ADR 0005 - Injecao de dependencias na raiz

## Status

Aceita em 2026-05-12.

## Contexto

O Forja3D V1 ja possui modelos em producao para cortadores, carimbos, chaveiros e QR Codes.

Mesmo assim, a arquitetura atual ainda tem uma divida importante: hooks de apresentacao instanciam adaptadores concretos de infraestrutura, como builders OpenSCAD, Three.js, Potrace, QR e Canvas. Isso dificulta testes, troca futura por workers ou API e aumenta o custo de adicionar novos modelos.

## Decisao

Antes de adicionar novos modelos, o projeto prioriza mover a composicao de dependencias para a raiz da aplicacao.

A raiz cria os adaptadores concretos e entrega apenas as portas necessarias para a apresentacao. Hooks e paginas continuam chamando casos de uso, mas deixam de importar diretamente `src/infrastructure`.

## Consequencias

- `presentation` fica menos acoplada a adapters concretos.
- A V1 continua 100% estatica e client-side.
- Novos modelos passam a entrar sobre uma base mais facil de testar e evoluir.
