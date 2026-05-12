# ADR 0006 — Ports para conteúdo e assets de QR Code

## Status
Aceita em 2026-05-12.

## Contexto
O caso de uso `generateModel` gerava SVG, PNG e Pix copia-e-cola importando diretamente `qrcode` e `src/infrastructure/qr/PixPayloadBuilder`.

Isso violava o limite de camada da V1: `application` não deve depender de adapters concretos nem de bibliotecas externas específicas. Também criava duplicação entre o conteúdo usado para downloads digitais e o conteúdo usado pela geometria 3D do QR Code.

## Decisão
Criar dois ports em `src/application/ports/`:

- `IQrContentBuilder`: monta o conteúdo final para QR Code, incluindo URL, texto, Wi-Fi, WhatsApp e Pix.
- `IQrAssetExporter`: exporta o conteúdo final para SVG e PNG.

Os adapters concretos ficam em `src/infrastructure/qr/`:

- `QrContentBuilder`
- `QrAssetExporter`

`generateModel` passa a receber esses ports por injeção de dependências e deixa de importar `src/infrastructure` ou `qrcode`.

## Consequências
**Positivas:**
- `application` fica livre de imports concretos de QR/Pix.
- O fluxo QR fica testável com fakes puros.
- SVG/PNG/Pix podem migrar para API ou worker na V2 sem mudar o caso de uso.

**Negativas / Trade-offs:**
- A composição de dependências ganha mais dois adapters.
- `QrCodeGeometryBuilder` ainda usa `qrcode` para gerar a geometria, mas isso é esperado por ser um adapter de infraestrutura.

**Implica para V2:**
- Um adapter remoto pode implementar os mesmos ports para gerar assets de QR no backend.
- Payloads Pix podem ser auditados ou registrados em histórico de geração sem alterar `generateModel`.
