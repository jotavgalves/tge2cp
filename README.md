# Preparatório para a 2ª CP de TGE — versão corrigida

## O que subir no GitHub

Suba estes arquivos/pastas na raiz:

```txt
index.html
styles.css
app.js
README.md
wrangler.toml
functions/
  log.js
  api/
    [[path]].js
supabase/
  schema.sql
  seed_tge.sql
docs/
  questions_model.md
```

A pasta deve se chamar `functions`, no plural.

## Cloudflare Pages

Configuração:

```txt
Framework preset: None
Build command: vazio
Build output directory: .
Root directory: vazio
```

Não use `npx wrangler deploy`.

## Variáveis no Cloudflare

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET
ADMIN_LOG_PASSWORD
LLM_PROVIDERS_JSON
```

O app já funciona com correção provisória mesmo sem IA real, para você testar login, visitante e ranking primeiro.

## Supabase

Rode no SQL Editor:

1. `supabase/schema.sql`
2. `supabase/seed_tge.sql`

