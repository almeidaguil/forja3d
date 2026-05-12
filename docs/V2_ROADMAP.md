# Roadmap V2 — Forja3D

Este documento registra impactos futuros ao evoluir a V1 estática para um produto com backend, autenticação, pagamentos e histórico de geração.

Atualize este arquivo sempre que uma decisão da V1 criar implicação para V2. Procure também por comentários `// V2:` no código.

## Resumo V1 → V2

| Área | V1 atual | V2 alvo |
|---|---|---|
| Hospedagem | GitHub Pages | Frontend + API |
| Renderização | Cliente: OpenSCAD WASM, Three.js, Potrace WASM | Servidor para jobs pesados, cliente para preview |
| Auth | Nenhuma | Google OAuth e/ou email |
| Créditos | Campo `creditsRequired` nos modelos, sem cobrança | Saldo real por usuário |
| Pagamentos | Nenhum | Stripe Checkout |
| Arquivos | Download direto no navegador | Storage com histórico |
| Catálogo | JSON estático em `src/data/models/` | Banco de dados ou CMS |
| Formatos | STL, SVG e PNG conforme modelo | STL + 3MF, mantendo SVG/PNG para QR |
| Idiomas | PT-BR | PT-BR, EN-US, ES |
| Analytics | Nenhum | PostHog ou Plausible |

## Decisões da V1 Que Já Ajudam a V2

| Decisão | Impacto |
|---|---|
| `Model.creditsRequired` existe | UI e catálogo já aceitam custo por modelo |
| Catálogo em JSON estruturado | JSONs podem virar seeds do banco |
| `GenerationResult` suporta múltiplas saídas | Base para jobs multi-arquivo |
| QR Code gera SVG/PNG além de STL | Modelo de saídas múltiplas já existe |
| Renderização encapsulada em builders | Adaptadores podem migrar para API |

## API Backend

Endpoints prováveis:

```text
GET  /api/models
GET  /api/models/:slug
POST /api/generations
GET  /api/generations/:id
GET  /api/user/me
GET  /api/user/history
POST /api/credits/checkout
POST /api/webhooks/stripe
```

Impacto na V1:

- Introduzir `IModelRepository` antes de migrar catálogo para API.
- Manter `generateModel` recebendo dependências por contrato.
- Evitar lógica de rede dentro de componentes React.

## Autenticação

Opções:

- Auth.js se a V2 migrar para Next.js.
- Supabase Auth se a V2 mantiver SPA + backend separado.
- Clerk se a prioridade for entrega gerenciada.

Impacto na V1:

- Não implementar auth na V1.
- Roteamento real já existe na V1; futuras rotas protegidas podem partir da estrutura atual.

## Créditos e Stripe

Modelo de dados esperado:

```text
User {
  id
  email
  credits
  stripeCustomerId
}

GenerationJob {
  id
  userId
  modelSlug
  parameters
  status
  outputFiles
  creditsCharged
  createdAt
}

CreditPack {
  id
  credits
  price
  stripeProductId
}
```

Impacto na V1:

- `creditsRequired` já está presente.
- Não adicionar cobrança, login ou saldo na V1.
- Modelos multi-saída devem declarar o custo no catálogo quando isso se tornar visível.

## Renderização Server-Side

A V2 deve considerar renderização no servidor para:

- OpenSCAD nativo mais rápido.
- Logs melhores de erro.
- Jobs assíncronos.
- Cache de resultados.
- Histórico de arquivos.

Caminho:

1. Criar adaptador API que implemente o mesmo contrato usado pela aplicação.
2. Enviar parâmetros e modelo para `/api/generations`.
3. Retornar status do job e URLs de download.
4. Manter preview leve no cliente quando fizer sentido.

## Storage

A V1 baixa arquivos diretamente com `Blob` e `URL.createObjectURL`.

A V2 precisa:

- Salvar STL/3MF/SVG/PNG em S3 ou Supabase Storage.
- Associar arquivos a `GenerationJob`.
- Permitir re-download pelo usuário.
- Expirar arquivos temporários quando aplicável.

## Exportação 3MF

3MF entra na V2 para preservar metadados e preparar fluxo multi-material.

Impacto na V1:

- Não implementar 3MF agora.
- Evitar nomes de contratos restritos a STL quando novos exporters forem criados.

## Catálogo de Modelos

A V1 usa:

```text
src/data/models/*.json
src/data/index.ts
```

A V2 deve migrar para banco/API.

Ação antes da V2:

- Criar `IModelRepository`.
- Implementar repositório estático na V1.
- Manter JSONs como seeds.

## Internacionalização

Idiomas alvo:

- PT-BR
- EN-US
- ES

Impacto na V1:

- Não adicionar biblioteca i18n agora.
- Quando alterar UI, preferir strings centralizadas ou vindas do catálogo em vez de texto espalhado.

## Analytics

Eventos prováveis:

- Modelo aberto.
- Preview gerado.
- Download iniciado.
- Erro de geração.
- Conversão compra/créditos.

Impacto na V1:

- Não adicionar analytics na V1.

## Dívidas Técnicas a Resolver Antes da V2

| Dívida | Por que importa |
|---|---|
| `presentation` instancia infraestrutura | Troca para API fica mais difícil |
| Catálogo importado direto | API de modelos precisa de contrato |
| `IOpenScadRenderer` legado | Contrato deve refletir o caminho real de geração |
| Sem worker para WASM | Gerações longas travam a UI |

## Checklist V2

- [ ] Definir stack backend.
- [ ] Definir auth.
- [ ] Criar banco de dados.
- [ ] Migrar catálogo para seeds.
- [ ] Implementar API de modelos.
- [ ] Implementar API de geração.
- [ ] Implementar storage de arquivos.
- [ ] Implementar créditos.
- [ ] Integrar Stripe Checkout.
- [ ] Criar webhook Stripe.
- [ ] Adicionar histórico do usuário.
- [ ] Adicionar exportação 3MF.
- [ ] Adicionar i18n.
- [ ] Adicionar analytics.
- [ ] Adicionar termos, privacidade e LGPD.

## Notas do Desenvolvimento V1

| Data | Arquivo | Nota |
|---|---|---|
| 2026-04-14 | `src/shared/types/index.ts` | `creditsRequired` prepara o catálogo para sistema de créditos |
| 2026-04-17 | `src/data/index.ts` | Comentário `// V2:` registra futura troca por `IModelRepository` |
| 2026-04-17 | `src/application/useCases/generateModel/` | `GenerationResult` suporta `secondaryGeometry`, `svgString`, `pngDataUrl` e `pixCopiaCola` |
| 2026-05-12 | `src/presentation/hooks/useModelGenerator.ts` | Hook ainda instancia adaptadores de infraestrutura diretamente; resolver antes da V2 |
| 2026-05-12 | `src/App.tsx` | Roteamento por URL foi implementado com React Router e prepara futuras rotas protegidas |
