# Roadmap V2 — Forja3D

Este documento registra tudo que precisa ser projetado, construído ou migrado ao evoluir o Forja3D de uma ferramenta estática client-side (V1) para um produto completo com autenticação, pagamentos e backend.

Atualize este documento sempre que uma decisão da V1 tiver implicação na V2. Procure também por comentários `// V2:` no código-fonte.

---

## Resumo da transição V1 → V2

| Área | V1 (atual) | V2 (alvo) |
|---|---|---|
| Hospedagem | GitHub Pages (estático) | Vercel / Railway + API backend |
| Renderização | Client-side (OpenSCAD WASM + Three.js) | Server-side (Node.js + binário OpenSCAD) |
| Autenticação | Nenhuma | Google OAuth / email (Auth.js ou Supabase) |
| Dados do usuário | Nenhum | Perfil de usuário, modelos salvos, histórico |
| Pagamentos | Nenhum | Stripe Checkout + sistema de créditos |
| Armazenamento de arquivos | Nenhum (download direto) | S3 (ou Supabase Storage) para arquivos gerados |
| Catálogo de modelos | Arquivos JSON estáticos no repositório | Banco de dados (Postgres) via API |
| Formato de preview | Apenas STL | STL + 3MF |
| Idiomas | Apenas PT-BR | PT-BR, EN-US, ES |
| Analytics | Nenhum | PostHog ou Plausible |

---

## API Backend

A V2 requer uma API REST (ou tRPC). Endpoints propostos:

```
GET  /api/models              → listar todos os modelos com metadados
GET  /api/models/:slug        → obter configuração e parâmetros de um modelo
POST /api/generate            → compilar modelo no servidor, retornar URL do arquivo
GET  /api/user/me             → perfil do usuário autenticado
GET  /api/user/history        → histórico de gerações do usuário
POST /api/credits/checkout    → criar sessão do Stripe Checkout
POST /api/webhooks/stripe     → tratar eventos de pagamento do Stripe
```

### Impacto na V1

O caso de uso `generateModel` em `src/application/useCases/generateModel/` deve ser projetado de forma que a etapa de renderização seja substituível. Na V1, ele chama `IOpenScadRenderer` (WASM). Na V2, deve chamar `IOpenScadRenderer` respaldado por uma chamada HTTP para `/api/generate`. Nenhum código de aplicação ou domínio deve mudar — apenas o adaptador de infraestrutura.

**Ação necessária na V1**: Garantir que a interface `IOpenScadRenderer` seja estável e não esteja fortemente acoplada aos internos do WASM.

---

## Autenticação

Os usuários da V2 devem se registrar e fazer login antes de gerar modelos além de uma camada gratuita.

### Stack recomendado

- **Auth.js** (anteriormente NextAuth) se migrar para Next.js
- **Supabase Auth** se permanecer com arquitetura Vite + backend separado
- **Clerk** como alternativa gerenciada (entrega mais rápida)

### Impacto na V1

Nenhum código de autenticação deve existir na V1. No entanto, a estrutura de rotas em `src/presentation/pages/` deve ser projetada para acomodar rotas protegidas na V2.

**Ação necessária na V1**: Usar uma abstração de `router` (React Router ou TanStack Router) para que guardas de autenticação possam ser adicionados sem reescrever a estrutura de páginas.

---

## Sistema de créditos

Cada geração de modelo custa créditos. Os usuários compram pacotes de créditos via Stripe.

### Modelo de dados

```
User {
  id
  email
  credits: number
  stripeCustomerId: string
}

GenerationJob {
  id
  userId
  modelSlug
  parameters: JSON
  status: 'pending' | 'done' | 'error'
  outputUrl: string
  creditsCharged: number
  createdAt: datetime
}

CreditPack {
  id
  credits: number
  priceUsd: number
  stripeProductId: string
}
```

### Custo em créditos por modelo (proposto)

| Tipo de modelo | Créditos |
|---|---|
| Paramétrico simples (chaveiro, placa) | 1 |
| Baseado em imagem (cortador de biscoito, carimbo) | 1 |
| Multi-parte complexo | 2 |

### Impacto na V1

O tipo de domínio `GenerationResult` deve incluir um campo `creditsRequired` para que a UI possa exibi-lo sem uma chamada ao backend. Na V1, isso será fixo no código; na V2, virá da API.

**Ação necessária na V1**: Adicionar `creditsRequired: number` à entidade `Model` mesmo que não seja usado na V1.

---

## Renderização server-side

A V1 usa OpenSCAD WASM no navegador. A V2 compilará OpenSCAD no servidor para:
- Geração mais rápida (binário nativo vs. WASM)
- Melhor relatório de erros
- Capacidade de servir resultados em cache

### Caminho de migração

1. Na V1, `OpenScadWasmRenderer` implementa `IOpenScadRenderer` usando WASM
2. Na V2, criar `OpenScadApiRenderer` que envia o código SCAD via POST para `/api/generate` e retorna o blob STL
3. Injetar o adaptador correto via injeção de dependência na raiz da aplicação
4. Nenhuma alteração em casos de uso ou código de domínio

### Impacto na V1

Manter os templates `.scad` como strings puras — sem APIs específicas do WASM embutidas neles.

---

## Armazenamento de arquivos

A V1 gera STL na memória e aciona um download no navegador imediatamente. A V2 deve:
- Armazenar arquivos gerados no S3 / Supabase Storage
- Associar arquivos às contas de usuário
- Permitir novo download a partir do histórico do usuário

### Impacto na V1

O caso de uso `exportStl` deve retornar um `ArrayBuffer`. Na V1, a camada de apresentação aciona `URL.createObjectURL()` para baixá-lo. Na V2, o caso de uso chamará `IFileStorage.upload()` em vez disso. Manter a lógica de download na camada de apresentação, não no caso de uso.

---

## Exportação 3MF

A V1 exporta apenas STL. A V2 também deve suportar 3MF (melhor informação de cor, suporta slicers multi-material como Bambu Studio).

### Impacto na V1

A porta `IStlExporter` deve ser renomeada para `IModelExporter` com um parâmetro `format`, ou uma porta adicional `IThreeMfExporter` deve ser adicionada junto a ela.

---

## Internacionalização (i18n)

A V2 tem como alvo PT-BR, EN-US e ES.

### Biblioteca recomendada: `react-i18next`

### Impacto na V1

Todas as strings voltadas ao usuário na V1 devem residir em props de componentes ou constantes, nunca codificadas diretamente no JSX. Isso facilita a extração para chaves de tradução na V2.

**Ação necessária na V1**: Nunca codificar strings de exibição diretamente. Usar uma prop `label` ou um arquivo de constantes compartilhado.

---

## Analytics

A V2 rastreará:
- Quais modelos são mais gerados
- Taxa de conversão (preview → download → compra)
- Taxas de erro por modelo

### Recomendado: PostHog (open source, auto-hospedável) ou Plausible (foco em privacidade)

### Impacto na V1

Nenhum. Não adicionar rastreamento de analytics na V1.

---

## Catálogo de modelos — migração para banco de dados

Os modelos da V1 são definidos como arquivos JSON estáticos em `src/data/models/`. A V2 os servirá a partir de um banco de dados.

### Caminho de migração

1. Os arquivos JSON da V1 se tornam os dados de seed do banco de dados
2. A porta `IModelRepository` (a ser definida na camada de aplicação da V1) terá:
   - Implementação V1: lê de `src/data/models/*.json`
   - Implementação V2: busca de `/api/models`
3. Nenhuma alteração em código de domínio ou casos de uso na migração

**Ação necessária na V1**: Definir e usar uma interface `IModelRepository` na camada de aplicação. Não importar arquivos JSON diretamente em componentes.

---

## Infraestrutura / hospedagem

### Arquitetura alvo da V2

```
Browser → Vercel (frontend, Next.js or SPA)
       → Railway / Render (API server, Node.js)
              → Postgres (user data, model catalog, jobs)
              → S3 / Supabase Storage (generated STL/3MF files)
              → Stripe (payments)
              → Google OAuth (auth)
```

### Domínio / URL personalizada

Registrar um domínio personalizado (ex: `forja3d.com`) e apontá-lo para a Vercel. Configurar o DNS antes do lançamento da V2.

---

## Checklist de lançamento V2 (referência futura)

- [ ] API backend implementada e implantada
- [ ] Autenticação funcionando (Google OAuth + email)
- [ ] Sistema de créditos implementado
- [ ] Stripe Checkout testado de ponta a ponta
- [ ] Armazenamento S3 para arquivos gerados
- [ ] Exportação STL + 3MF
- [ ] Traduções PT-BR, EN-US, ES completas
- [ ] Domínio personalizado configurado
- [ ] Analytics configurado
- [ ] Monitoramento de erros (Sentry ou similar) configurado
- [ ] Rate limiting nos endpoints da API
- [ ] Páginas de termos de serviço e política de privacidade
- [ ] Banner de cookies (LGPD / GDPR)

---

## Notas do desenvolvimento V1

> Esta seção é atualizada conforme a V1 é construída. Cada entrada referencia o arquivo-fonte relevante e descreve a implicação para a V2.

| Data | Arquivo | Nota |
|---|---|---|
| 2026-04-14 | `src/application/useCases/generateModel/` | A interface `IOpenScadRenderer` deve permanecer estável para a troca de adaptador HTTP na V2 |
| 2026-04-14 | `src/domain/model/` | Adicionar `creditsRequired: number` à entidade `Model` — não utilizado na V1, obrigatório na V2 |
| 2026-04-14 | `src/infrastructure/three/ThreeStlExporter` | Renomear porta para `IModelExporter` antes da V2 para acomodar 3MF |
