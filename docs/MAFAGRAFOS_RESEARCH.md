# Pesquisa de Produto — Mafagrafos

> Documento de retomada para a decisão tomada em 2026-05-12.

## Fontes Consultadas

- Loja Nuvemshop: https://mafagrafos.lojavirtualnuvem.com.br/
- Linktree: https://linktr.ee/mafagrafos
- Perfil 3Drop/MakerWorld: https://three-drop.com/author/makerworld/4092910464
- Site próprio: https://www.mafagrafos.com/
- Discussão pública sobre conversão de conteúdo em SaaS: https://www.reddit.com/r/MicroSaaSBR/comments/1rgbel9/convertendo_conte%C3%BAdo_no_instagram_em_um_saas/

## Oportunidades Identificadas

| Oportunidade | Por que importa | Complexidade estimada |
|---|---|---|
| Porta tag NFC / chaveiro NFC | Conversa com chaveiros, brindes e utilidade real para links digitais | Média |
| Ornamento com nome | Bom para sazonalidade e personalização simples | Baixa |
| Letreiro / placa personalizada | Alinha com decoração e presentes personalizados | Média |
| Chaveiro com texto temático | Expande o modelo atual sem nova tecnologia | Baixa |
| Cortadores temáticos | Aproveita pipeline existente de imagem para STL | Média |

## Decisão

Não começar um modelo novo antes de concluir a P1 de arquitetura.

A próxima tarefa técnica é a injeção de dependências na raiz, removendo a criação de adaptadores concretos de dentro da camada `presentation`. Essa base reduz acoplamento antes de adicionar novos modelos.

## Próxima Feature de Produto

Depois da P1, a feature recomendada é:

**Porta tag NFC / chaveiro NFC parametrizado**

Escopo inicial sugerido:

- formatos redondo, retangular e escudo;
- texto curto em relevo;
- furo para argola;
- cavidade para tag NFC padrão, com folga configurável;
- export STL;
- sem backend, sem leitura/gravação NFC e sem fluxo de pagamento na V1.

## Implicações para V2

- NFC pode evoluir para landing pages hospedadas, analytics de acesso e créditos por geração.
- Na V1, manter tudo estático e local: o modelo gera apenas a peça física.
- Se houver links dinâmicos ou histórico de tags, registrar no roadmap da V2 antes de implementar.
