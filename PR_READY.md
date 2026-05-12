# Checklist de PR

Use este arquivo para conferir se a branch está pronta antes de abrir PR.

## Validação Local

```bash
npm run build
npm run lint
git status --short --branch
```

## Conteúdo da PR

- [ ] O escopo da mudança está claro.
- [ ] A documentação foi atualizada quando necessário.
- [ ] Não há commits diretamente em `main` ou `develop`.
- [ ] Não há arquivos temporários ou logs versionados.
- [ ] A descrição do PR explica o que mudou e como validar.

## Destino

Toda branch de trabalho abre PR para `develop`.

Produção usa PR separado de `develop` para `main`, seguido de deploy automático no GitHub Pages.
