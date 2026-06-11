# Preparatório para a 2ª CP de TGE

Projeto Cloudflare Pages + Functions + Supabase.

## Instalação rápida
1. Rode `supabase/schema.sql` no SQL Editor.
2. Rode `supabase/seed_tge.sql` para questões exemplo.
3. Suba todos os arquivos no GitHub ligado ao Cloudflare Pages.
4. Configure variáveis em Cloudflare Pages > Settings > Environment variables:

```txt
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SESSION_SECRET=texto-grande-aleatorio
ADMIN_LOG_PASSWORD=senha-do-painel-log
LLM_PROVIDERS_JSON=[...]
```

## LLM_PROVIDERS_JSON exemplo

```json
[
  {"name":"Gemini","type":"gemini","priority":1,"apiKey":"SUA_KEY","model":"gemini-2.0-flash"},
  {"name":"Groq","type":"openai_compatible","priority":2,"apiKey":"SUA_KEY","baseUrl":"https://api.groq.com/openai/v1/chat/completions","model":"llama-3.1-8b-instant"},
  {"name":"NVIDIA NIM","type":"openai_compatible","priority":3,"apiKey":"SUA_KEY","baseUrl":"https://integrate.api.nvidia.com/v1/chat/completions","model":"meta/llama-3.1-70b-instruct"},
  {"name":"OpenRouter","type":"openai_compatible","priority":4,"apiKey":"SUA_KEY","baseUrl":"https://openrouter.ai/api/v1/chat/completions","model":"google/gemini-2.0-flash-001"},
  {"name":"Hugging Face","type":"openai_compatible","priority":5,"apiKey":"SUA_KEY","baseUrl":"https://router.huggingface.co/v1/chat/completions","model":"meta-llama/Llama-3.1-8B-Instruct"}
]
```

## /log
Acesse `https://seu-site.pages.dev/log` e use `ADMIN_LOG_PASSWORD`.


## Segurança
Não coloque service role nem chaves de IA no HTML. Elas ficam somente nas variáveis do Cloudflare.
