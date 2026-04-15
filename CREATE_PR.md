# 🔄 Criar Pull Request - ParameterForm ImageField

## Status Atual
- ✅ Branch: `feature/parameter-form-image-field` — criada e pushed
- ✅ Commit: `875186c` — feat(parameter-form): add image field type for model image uploads
- ✅ Build: OK | Lint: OK | TypeScript: OK
- ⏳ **PR: PRONTA PARA CRIAR**

---

## Opção 1: Clique Automático (Navegador)
Clique no link abaixo para abrir o formulário de PR pré-preenchido:

🔗 **[Criar PR no GitHub](https://github.com/almeidaguil/forja3d/compare/develop...feature/parameter-form-image-field)**

Depois:
1. Clique em **"Create pull request"**
2. Pronto! A PR será criada automaticamente

---

## Opção 2: Linha de Comando (se --web não funcionar)
```bash
cd /Users/ThaysTeles/Desktop/workspace/forja3d
gh pr create --base develop \
  --title "feat(parameter-form): add image field type for model image uploads" \
  --body "## O que mudou?

- ✅ Adicionado tipo de campo 'image' em ParameterForm
- ✅ Componente ImageField com validação de tipo (PNG, JPG, WEBP) e tamanho (max 5 MB)
- ✅ Integrado com ModelEditor existente
- ✅ Build passa sem erros

## Status

- ✅ Build: OK (5.06s)
- ✅ Lint: OK (ESLint)
- ✅ TypeScript: OK (strict mode)
- ✅ Deploy local: OK

## Próximos passos

- ThreePreview com geometria estática
- ThreeGeometryBuilder + ThreeStlExporter
- Canvas image tracer" \
  --head feature/parameter-form-image-field \
  --web
```

---

## Opção 3: Criar Manualmente no GitHub Web
1. Acesse: https://github.com/almeidaguil/forja3d/compare/develop...feature/parameter-form-image-field
2. Clique em **"Create pull request"**
3. Pronto!

---

## Depois de Criar a PR
```bash
# Quando a PR for merged, delete a branch local e remota:
git branch -d feature/parameter-form-image-field
git push origin --delete feature/parameter-form-image-field
```

---

**Status:** ✅ Tudo pronto. Apenas crie a PR e continue com ThreePreview (próxima feature).
