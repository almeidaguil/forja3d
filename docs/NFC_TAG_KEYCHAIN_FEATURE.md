# Feature - Chaveiro NFC

> Documento de retomada da feature iniciada em 2026-05-12.

## Objetivo

Adicionar um modelo V1 estatico para gerar um chaveiro NFC parametrizado, baseado em requisitos de produto e na validacao visual do usuario.

O modelo gera apenas a peca fisica em STL. Ele nao le, grava, valida nem gerencia tags NFC.

## Escopo V1

- Novo modelo no catalogo: `nfc-tag-keychain`.
- Categoria: `keychains`.
- Geracao via OpenSCAD WASM.
- Formatos:
  - quadrado arredondado;
  - redondo;
  - coracao;
  - hexagono;
  - estrela;
  - 12 lados;
  - escudo.
- Texto curto em relevo.
- Furo para argola.
- Dois modos de encaixe NFC:
  - `Bolso interno (pausa)`: modo padrao. A peca imprime a base e as paredes do bolso, o usuario pausa a impressao, insere a tag NFC e continua para fechar a tampa superior.
  - `Recesso para adesivo/resina`: recesso superior para adesivo NFC, com 25 mm como padrão configurável.
- Borda elevada opcional para resina epoxi.
- Parametros configuraveis:
  - texto;
  - formato;
  - tipo de encaixe NFC;
  - largura;
  - altura;
  - espessura;
  - altura do relevo;
  - diametro do furo;
  - diametro da tag NFC;
  - folga da tag;
  - espessura da tag;
  - espessura da base abaixo da tag;
  - espessura da tampa superior;
  - borda para resina;
  - altura da borda;
  - fonte;
  - cor do preview.

## Fora de Escopo

- Backend.
- Login.
- Creditos reais.
- Pagamentos.
- Escrita/leitura NFC.
- Importacao de SVG personalizado na superficie.
- Multicor real por arquivo/partes separadas.
- Landing pages dinamicas para tags NFC.
- Historico de tags.

## Implementacao

- `src/data/models/nfc-tag-keychain.json`: entrada de catalogo.
- `src/data/index.ts`: inclui o novo modelo.
- `src/infrastructure/openscad/OpenScadGeometryBuilder.ts`: novo template `nfc-tag-keychain`.
- `src/application/useCases/generateModel/index.ts`: repassa parametros do template para o builder.
- `src/application/useCases/generateModel/index.test.ts`: caracteriza o repasse de parametros do novo template usando builder fake.

## Validacao Esperada

- `npm test`
- `npm run build`
- `npm run lint`
- Teste local em `/forja3d/editor/nfc-tag-keychain`.
- Geracao de preview STL sem erro nos dois modos de encaixe NFC.

## Validacao Executada

- `npm test`: passou na versão final da branch.
- `npm run build`: passou na versão final da branch.
- `npm run lint`: passou na versão final da branch.
- OpenSCAD WASM renderizou SCAD equivalente do template NFC sem erro.
- Edge headless abriu `/forja3d/editor/nfc-tag-keychain`, clicou em **Gerar Preview** e exibiu **Baixar STL (3D)** sem erro.
- A cavidade deixou de ser um rebaixo exposto e passou a ser um bolso interno para pausa de impressao, com parametros **Base abaixo da tag** e **Tampa superior**.
- O modo opcional de recesso superior para adesivo/resina foi incorporado, mantendo o bolso interno como padrao.
- A versão final normaliza valores numericos antes de gerar SCAD e reduz a cavidade NFC quando largura, altura, furo e folga não comportam o diametro solicitado.
