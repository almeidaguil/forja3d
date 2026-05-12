# Roteamento por URL

## Objetivo

Substituir a navegação por estado local em `App.tsx` por rotas reais, permitindo abrir, recarregar e compartilhar links diretos para cada modelo do Forja3D.

## Contexto

Hoje a V1 usa `useState` para alternar entre Home e Editor. Isso funciona para navegação interna, mas não cria URLs compartilháveis. Todo acesso direto abre a Home, então um usuário não consegue enviar um link direto para `QR Code Pix`, `Chaveiro com Texto` ou `Cortador de Biscoito`.

Esta feature resolve o item **P1 — Roteamento por URL** do `docs/PLANO.md` e reduz uma dívida listada em `docs/ARCHITECTURE.md` e `docs/V2_ROADMAP.md`.

Status: implementado em `feature/url-routing`.

## Rotas Alvo

| URL | Tela |
|---|---|
| `/forja3d/` | Home |
| `/forja3d/editor/:slug` | Editor do modelo |
| `/forja3d/*` | Redireciona ou mostra estado seguro |

Exemplos:

- `https://almeidaguil.github.io/forja3d/editor/qr-pix`
- `https://almeidaguil.github.io/forja3d/editor/keychain`
- `https://almeidaguil.github.io/forja3d/editor/cookie-cutter`

## Decisão Técnica

Usar React Router com `BrowserRouter` e `basename={import.meta.env.BASE_URL}`.

Motivo:

- Mantém URLs limpas, sem `#`.
- Usa a base `/forja3d/` já configurada no Vite.
- Prepara rotas futuras da V2, como auth e histórico.

Como o GitHub Pages não faz fallback automático para SPAs em rotas profundas, a feature deve incluir um `public/404.html` com redirecionamento para `index.html`. O app deve ler esse redirecionamento ao iniciar e restaurar a rota original.

## Escopo

- Adicionar dependência `react-router`.
- Trocar o roteamento local de `App.tsx` por rotas declarativas.
- Atualizar `Home` para navegar por URL.
- Atualizar `ModelCard` para funcionar como link.
- Atualizar `ModelEditor` para ler `slug` da rota ou receber via wrapper.
- Tratar slug inválido sem quebrar a aplicação.
- Adicionar fallback para refresh direto no GitHub Pages.
- Atualizar docs ao final.

## Fora de Escopo

- Auth, backend, créditos ou qualquer infraestrutura da V2.
- Refatorar builders, geração STL ou fluxo de preview.
- Resolver composition root/injeção de dependências.
- Adicionar modelos novos.

## Arquivos Alterados

| Arquivo | Mudança esperada |
|---|---|
| `package.json` | Adiciona `react-router` |
| `package-lock.json` | Atualizar lockfile |
| `src/App.tsx` | Define rotas e navegação |
| `src/main.tsx` | Restaura a rota preservada pelo fallback do GitHub Pages |
| `src/presentation/pages/Home/index.tsx` | Usa cards navegáveis |
| `src/presentation/components/ModelCard/index.tsx` | Renderiza link clicável |
| `src/presentation/pages/ModelEditor/index.tsx` | Mantém tratamento de slug inválido via prop |
| `public/404.html` | Fallback GitHub Pages para deep links |
| `docs/PLANO.md` | Marcar P1 concluído |
| `docs/ARCHITECTURE.md` | Remover dívida do roteamento por `useState` |
| `docs/V2_ROADMAP.md` | Atualizar dívida de roteamento |
| `README.md` | Mencionar links diretos |

## Critérios de Pronto

- Home abre em `/forja3d/`.
- Clicar em um card muda a URL para `/forja3d/editor/<slug>`.
- Recarregar diretamente em `/forja3d/editor/qr-pix` mantém o modelo correto.
- Botão “Voltar” retorna para a Home.
- Logo retorna para a Home.
- Botões voltar/avançar do navegador funcionam.
- Slug inválido mostra “Modelo não encontrado” e permite voltar.
- `npm run build` passa.
- `npm run lint` passa.
- Deploy GitHub Pages responde `200 OK`.

## Retomada Se o Chat Cair

1. Verifique a branch:

```bash
git status --short --branch
```

2. Leia este arquivo.
3. Confira `src/App.tsx`, `src/presentation/pages/Home/index.tsx`, `src/presentation/components/ModelCard/index.tsx` e `src/presentation/pages/ModelEditor/index.tsx`.
4. Rode:

```bash
npm run build
npm run lint
```

5. Teste localmente:

```bash
npm run dev
```

6. Acesse:

```text
http://localhost:5173/forja3d/
http://localhost:5173/forja3d/editor/qr-pix
```
