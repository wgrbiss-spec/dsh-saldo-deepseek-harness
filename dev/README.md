# QA visual (dev only)

Scripts de verificação end-to-end usados durante o desenvolvimento. Não fazem
parte do pacote publicado (`files[]` não os inclui) e não são necessários para
instalar o plugin.

Pré-requisitos:

- Um perfil DSH de teste rodando com o plugin instalado (`DSH_HOME` separado,
  porta própria) e a URL com `?token=...` impressa pelo `dsh web`.
- `puppeteer-core` + um Chromium/Chrome local. Aponte `PUPPETEER_CORE_DIR` para
  um `node_modules` que tenha o pacote (por exemplo o perfil web do DSH) ou
  instale-o à parte.

```sh
# página em Configurações + botão Atualizar (gera screenshot)
DSH_TEST_URL='http://127.0.0.1:3099/?token=...' \
PUPPETEER_CORE_DIR="$HOME/.dsh/profiles/web/node_modules" \
  node dev/verify-section.mjs

# estados de erro (conta desconectada, 401, cotação indisponível, stale, rede)
DSH_TEST_URL='http://127.0.0.1:3099/?token=...' \
PUPPETEER_CORE_DIR="$HOME/.dsh/profiles/web/node_modules" \
  node dev/verify-states.mjs
```

As imagens saem em `dev/shots/` (ignorado pelo git).

# validação no app desktop já em execução (usa o token impresso nos logs do app)
DSH_TEST_URL='http://127.0.0.1:3080/?token=...' \
PUPPETEER_CORE_DIR="$HOME/.dsh/profiles/web/node_modules" \
  node dev/verify-live.mjs
