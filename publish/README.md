# Publicação — SALDO DEEPSEEK HARNESS

Guia completo para publicar no npm e submeter ao catálogo comunitário que alimenta o marketplace do DSH / DSH Tauri. Verificado em 2026-11-09 contra as fontes oficiais.

> **Primeira vez, sem conta ainda?** Siga [`PRIMEIRA-PUBLICACAO.md`](./PRIMEIRA-PUBLICACAO.md): cadastro npm + GitHub, 2FA, publicação e PR do catálogo passo a passo.

> O dono dos links já está configurado para `wgrbiss-spec`. Se um dia mudar de usuário, rode `node scripts/set-owner.mjs <novo-usuario>`.

---

## 0. Pré-requisitos

- Conta npm com 2FA configurado (publicação pede OTP).
- Repositório GitHub público com o código, tópico `dsh-plugin` e pelo menos 1 dia de vida (o catálogo recusa repositórios novos demais).
- Nome npm livre: `npm view dsh-saldo-deepseek-harness` deve retornar 404.
- Node.js >= 22 e pnpm >= 11 no ambiente de build (não são necessários para instalar o plugin, que é JS puro).

## 1. Validar localmente

```sh
npm test                 # testes da matemática do saldo
npm run validate         # manifesto, bundle patch, client lazy-CJS, files[], engines, secrets
npm pack --dry-run       # lista exatamente o que será publicado
```

O `npm pack` deve incluir: `src/`, `client/`, `assets/`, `cordis.patch.yml`, `README.md`, `README.pt-BR.md`, `LICENSE`. Testes e `publish/` ficam fora do tarball por não estarem em `files[]` (o README do repo continua linkável).

## 2. Publicar no npm

```sh
npm publish --access public
```

Confira:

```sh
npm view dsh-saldo-deepseek-harness version dist.tarball repository.url engines.dsh
```

Regras que o catálogo/gerador usam:

- `repository.url` do pacote **precisa** apontar para o mesmo repo do catálogo (mapeamento npm ↔ repo).
- `engines.dsh` de topo é a única faixa de compatibilidade lida pelo DSH (`dsh.engines` não existe).
- `dsh.bundle.patch` é obrigatório — é a causa nº 1 de rejeição.
- Um pacote escopado precisaria de `publishConfig.access: public` (já declarado, caso mude o nome).

## 3. GitHub (repo, tópico e release)

1. Crie `github.com/<owner>/dsh-saldo-deepseek-harness` e envie o código.
2. Adicione o tópico `dsh-plugin` no repositório.
3. Opcional: tag/release `v0.1.0` com o `.tgz` anexado. O catálogo aceita `tarball:` como alternativa ao npm, mas a entrada só aparece no `index.json`/Discover com pacote npm — então publique no npm.

## 4. Submeter ao catálogo comunitário

O catálogo é o repositório **awesome-dsh-plugin/awesome-dsh-plugin** (o `dshmarket` só consome; PR de plugin no repo do market é recusado).

1. Fork de `https://github.com/awesome-dsh-plugin/awesome-dsh-plugin`.
2. Adicione **um** arquivo `data/plugins/wgrbiss-spec__dsh-saldo-deepseek-harness.yml` com o conteúdo de [`catalog-entry.yml`](./catalog-entry.yml).
3. Valide no fork:

   ```sh
   npm ci
   node scripts/generate-readme.mjs
   node scripts/build-index.mjs --check
   ```

4. Abra o PR (no máximo 3 entradas por PR, sem editar READMEs gerados nem entradas de terceiros). O CI verde é pré-condição; a revisão humana lê o repo e confere cada afirmação da descrição.
5. Após o merge, o build noturno (cron `23 2 * * *` UTC) roda `probe-npm → build-index` e publica o pacote `dsh-plugin-catalog` se o hash mudou. O app passa a listar o plugin no Discover.

Tempo observado: mediana de ~9 h entre abertura e merge (amostra de 27 PRs recentes); o marketplace documenta "normalmente em um dia".

## 5. Verificar no app

- **DSH Desktop (Tauri):** Configurações → Plugins → Discover → procure `SALDO DEEPSEEK HARNESS` → instalar. Não há registro separado para o desktop: o app embarca o `dshmarket`, que lê este mesmo catálogo.
- **`dsh web`:** `dsh plugin --profile web add dsh-saldo-deepseek-harness` e reinicie.
- Abra Configurações → **SALDO DEEPSEEK HARNESS** e confira o total em CNY, recarga/bônus e a cotação.

## 6. Atualizações

- Bump de versão **não** exige novo PR no catálogo: o próximo probe noturno atualiza o `index.json`.
- Para publicar: `npm version patch && npm publish --access public && git push --follow-tags`.
- Mudanças grandes (novo nome, nova categoria) pedem `edit` no YAML do catálogo via novo PR.

## 7. Problemas comuns

| Problema | Causa |
|---|---|
| Instalação recusada por incompatibilidade | `engines.dsh` não cobre o runtime; aqui está `>=0.2.2-rc.1 <0.3.0-0`. |
| Plugin não aparece no Discover | Ainda não publicou no npm ou o build noturno não rodou; confira `npm view` e `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`. |
| CI do catálogo reclama do bundle | `dsh.bundle.patch` ausente/ inválido ou repo sem código real. |
| Ícone quebrado | O ícone do catálogo precisa ser bitmap (png/jpg/webp) hospedado no GitHub, ~96–180 px; `assets/icon-180.png` já está gerado. |
| PR fechado por escopo | Mais de 3 entradas, README gerado editado ou entrada de terceiro tocada. |

## Referências

- Catálogo: <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>
- Guia de contribuição: <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>
- Formato do índice: <https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md>
- Validador oficial: `@deepseek-ai/dsh-plugin-market-index`
- DSH Desktop: <https://github.com/dsh-tauri/deepseek-harness-desktop>
