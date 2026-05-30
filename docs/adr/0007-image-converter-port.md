# ADR 0007 - Port para conversao de imagens

## Status
Aceita em 2026-05-30.

## Contexto
O modelo `image-converter` precisa transformar uma imagem enviada pelo usuario em outros formatos de arquivo sem acoplar o caso de uso `generateModel` a APIs concretas de Canvas.

A V1 continua totalmente estatica e roda no navegador. Por isso, a conversao deve acontecer client-side e a composicao do adapter concreto deve permanecer em `src/app/dependencies.ts`.

## Decisao
Criar o port `IImageConverter` em `src/application/ports/` para converter `ImageData` em `ArrayBuffer` nos formatos suportados pela V1: PNG, JPG/JPEG, WebP, BMP e SVG.

O adapter concreto `ImageConverterAdapter` fica em `src/infrastructure/tracer/` e usa Canvas para PNG/JPG/WebP, encoder local para BMP e encapsulamento raster em SVG.

`generateModel` recebe o port por injecao de dependencias e retorna os metadados necessarios para preview e download do arquivo convertido.

## Consequencias
**Positivas:**
- `presentation` continua chamando apenas o hook e o caso de uso.
- O fluxo fica testavel com fakes de `IImageConverter`.
- Novos encoders podem substituir o adapter sem mudar a pagina.

**Negativas / Trade-offs:**
- O port ainda usa `ImageData`, seguindo o precedente de `IImageTracer`; isso acopla a application a um tipo de navegador.
- PDF, TIFF e GIF animado ficam fora da V1 ate existir encoder real.
- O SVG da V1 encapsula raster; vetorizacao real fica para evolucao futura.

**Implica para V2:**
- Um backend ou worker pode implementar o mesmo port para formatos pesados como PDF/TIFF/GIF.
- Se houver historico de arquivos convertidos, os metadados de download podem alimentar auditoria e creditos sem alterar o contrato da pagina.
