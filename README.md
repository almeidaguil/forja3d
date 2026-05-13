# Forja3D

**Forja3D** é um gerador de modelos 3D paramétricos que roda diretamente no navegador. A V1 é estática, não exige cadastro e gera arquivos localmente no cliente.

Site ao vivo: https://almeidaguil.github.io/forja3d/

## O que faz

O Forja3D permite criar modelos 3D personalizados para impressão, ajustando parâmetros ou enviando imagens. A aplicação renderiza um preview 3D e libera downloads em STL, SVG ou PNG conforme o modelo.

### Modelos disponíveis

| Modelo | Descrição | Saídas |
|---|---|---|
| Cortador de Biscoito | Gera um cortador a partir do contorno de uma imagem. O modo Cortador + Carimbo entrega duas peças com tolerância para encaixe. | STL |
| Carimbo | Converte imagem em carimbo 3D com detalhes internos preservados por Potrace. | STL |
| Chaveiro com Texto | Cria chaveiro com 1 ou 2 linhas, formato retangular, retangular arredondado ou oval, fonte local e slot NFC opcional. | STL |
| Chaveiro NFC | Gera chaveiro/porta tag NFC com bolso interno para pausa de impressão ou recesso para adesivo e resina. | STL |
| QR Code Pix | Gera QR Code Pix 3D com payload EMV BR Code client-side e texto copia-e-cola para validação. | STL, SVG, PNG |
| QR Code | Gera QR Code 3D genérico para link, texto ou rede Wi-Fi. | STL, SVG, PNG |

### Funcionalidades

- Upload de imagens PNG, JPG ou WEBP até 5 MB para cortadores e carimbos.
- Preview 3D com Three.js e controles de órbita.
- Download de STL para impressão 3D.
- Download de SVG e PNG para modelos de QR Code.
- Pix copia-e-cola para testar o QR Code Pix no app do banco antes de imprimir.
- 19 fontes TTF locais para chaveiros com texto, sem dependência de CDN no OpenSCAD.
- Porta tag NFC parametrizado com múltiplos formatos, folga configurável e dois modos de encaixe.
- Build e deploy estáticos no GitHub Pages.
- Links diretos para cada editor de modelo.

## Stack técnica

- React 19 + TypeScript 6
- React Router
- Vite 8
- Tailwind CSS v4
- Three.js
- OpenSCAD WASM
- Potrace WASM
- qrcode
- GitHub Actions + GitHub Pages

## Arquitetura

O projeto segue uma arquitetura em camadas. Na V1 atual, os tipos de domínio ficam em `src/shared/types/` e os casos de uso ficam em `src/application/`.

```text
src/
├── application/      # Casos de uso, portas e serviços
├── infrastructure/   # Adaptadores: OpenSCAD WASM, Three.js, Potrace, QR, Canvas
├── presentation/     # Componentes React, páginas e hooks
├── shared/           # Tipos e constantes compartilhadas
└── data/             # Catálogo estático de modelos JSON
```

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalhes, incluindo dívidas técnicas conhecidas da V1.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173/forja3d/

Links diretos também funcionam localmente:

```text
http://localhost:5173/forja3d/editor/qr-pix
http://localhost:5173/forja3d/editor/keychain
http://localhost:5173/forja3d/editor/nfc-tag-keychain
```

Para validar produção localmente:

```bash
npm run build
npm run preview
```

## Qualidade

Antes de qualquer commit:

```bash
npm run build
npm run lint
```

O projeto usa Husky, lint-staged e commitlint. Commits devem seguir Conventional Commits em português, por exemplo:

```text
docs(readme): atualizar documentação dos modelos
```

## Deploy

O deploy de produção acontece automaticamente no GitHub Pages a cada push na `main`, via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Fluxo esperado:

```text
branch de trabalho → PR para develop → PR de develop para main → deploy automático
```

`main` e `develop` não recebem commit ou merge local direto.

## Documentação

| Arquivo | Uso |
|---|---|
| [docs/PLANO.md](docs/PLANO.md) | Estado atual, histórico e próximos passos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Camadas, ports, adaptadores e ADRs |
| [docs/SETUP.md](docs/SETUP.md) | Instalação, comandos e fluxo de PR |
| [docs/V2_ROADMAP.md](docs/V2_ROADMAP.md) | Plano de evolução para backend, auth, créditos e pagamentos |
| [AGENTS.md](AGENTS.md) | Regras para agentes de IA trabalhando no projeto |

## Licença

MIT
