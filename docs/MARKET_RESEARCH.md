# Pesquisa de Produto - Mercado de Modelos Personalizados

> Documento de retomada para a decisao tomada em 2026-05-12.

## Critério de Pesquisa

A pesquisa considera sinais agregados de demanda por modelos 3D parametrizaveis e produtos personalizados. Este documento registra apenas conclusoes de produto e criterios internos; referencias detalhadas de pesquisa ficam fora da documentacao publica do projeto.

As decisoes priorizam:

- demanda recorrente por itens funcionais ou personalizados;
- viabilidade no pipeline atual da V1;
- baixo risco de depender de geometria fixa ou arquivos externos;
- diferenca clara entre inspiracao de mercado e implementacao original do Forja3D.

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
