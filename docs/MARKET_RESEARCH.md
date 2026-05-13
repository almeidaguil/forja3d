# Pesquisa de Produto - Mercado de Modelos Personalizados

> Documento de retomada para a decisao tomada em 2026-05-12.

## Fontes Consultadas

A pesquisa considera sinais publicos de demanda em marketplaces de modelos 3D, lojas de produtos personalizados, plataformas artesanais e buscadores de tendencias. Nao ha dependencia de uma marca, loja ou produto especifico.

Fontes e consultas usadas como base de retomada:

| Fonte | Consulta / exemplo | Sinal observado |
|---|---|---|
| MakerWorld | `personalized keychain`, `nfc keychain`, `customizable tag`, `phone stand` | Modelos personalizaveis e funcionais aparecem com recorrencia em buscas por downloads e relevancia. |
| Printables | `phoneholder`, `drawer organizer`, `personalized ornament` | Suportes, organizadores e ornamentos aparecem como categorias de uso cotidiano com muitos modelos derivados. |
| Thingiverse | `nfc keychain`, `customizable keychain`, `phone stand` | Sinal historico de demanda para modelos simples e parametrizaveis. |
| Elo7 | `impressao 3d personalizado`, `chaveiro personalizado`, `enfeite personalizado` | Demanda brasileira por presentes, brindes e itens com nome/logo. |
| Shopee BR | `suporte de celular personalizado impressao 3d`, `chaveiro nfc personalizado` | Sinal de produtos fisicos personalizados sendo vendidos no mercado local. |

Links uteis para revalidacao:

- MakerWorld: https://makerworld.com/en/search/models?keyword=personalized%20keychain
- MakerWorld: https://makerworld.com/en/search/models?keyword=nfc%20keychain
- MakerWorld: https://makerworld.com/en/search/models?keyword=phone%20stand
- Printables: https://www.printables.com/search/models?q=phoneholder&o=most_downloaded
- Printables: https://www.printables.com/search/models?q=drawer%20organizer&o=most_downloaded
- Elo7: https://www.elo7.com.br/busca?q=chaveiro+personalizado+impressao+3d
- Shopee BR: https://shopee.com.br/search?keyword=suporte%20celular%20personalizado%20impressao%203d

## Oportunidades Identificadas

| Oportunidade | Por que importa | Complexidade estimada |
|---|---|---|
| Chaveiro NFC | Conversa com brindes, acesso rapido a links digitais e personalizacao fisica | Media |
| Suporte para celular/tablet | Produto funcional, facil de parametrizar por largura, angulo e espessura do aparelho | Baixa |
| Organizador de gaveta | Demanda funcional ampla e geometria bem encaixada em OpenSCAD | Media |
| Ornamento com nome | Bom para sazonalidade e personalizacao simples | Baixa |
| Letreiro / placa personalizada | Alinha com decoracao e presentes personalizados | Media |
| Chaveiro com texto tematico | Expande o modelo atual sem nova tecnologia | Baixa |
| Cortadores tematicos | Aproveita pipeline existente de imagem para STL | Media |

## Decisao

Nao comecar um modelo novo antes de concluir a P1 de arquitetura.

A tarefa tecnica concluida foi a injecao de dependencias na raiz, removendo a criacao de adaptadores concretos de dentro da camada `presentation`. Essa base reduz acoplamento antes de adicionar novos modelos.

## Proxima Feature de Produto

Depois da P1, a feature recomendada e implementada nesta branch e:

**Chaveiro NFC parametrizado**

Escopo inicial:

- multiplos formatos de base;
- texto curto em relevo;
- furo para argola;
- bolso interno para tag NFC com pausa de impressao;
- modo alternativo com recesso superior para adesivo NFC e acabamento com resina;
- export STL;
- sem backend, sem leitura/gravacao NFC e sem fluxo de pagamento na V1.

## Proximos Candidatos

1. **Suporte para celular/tablet parametrizavel**: melhor proximo P1 apos NFC. Usa OpenSCAD, tem baixo risco tecnico e responde a uma demanda funcional ampla.
2. **Organizador de gaveta parametrizavel**: P1 seguinte. Tambem usa OpenSCAD, mas exige UX mais cuidadosa para grade, divisorias e medidas internas.
3. **Ornamento com nome**: P2 sazonal, forte para datas comemorativas e lembrancinhas.

## Implicacoes para V2

- NFC pode evoluir para landing pages hospedadas, analytics de acesso e creditos por geracao.
- Na V1, manter tudo estatico e local: o modelo gera apenas a peca fisica.
- Se houver links dinamicos ou historico de tags, registrar no roadmap da V2 antes de implementar.
