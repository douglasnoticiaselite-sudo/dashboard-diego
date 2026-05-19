# Correção — painel zerado com TypeError: Failed to fetch

## Problema identificado
Quando as variáveis do Supabase estão configuradas, o painel tenta buscar todas as tabelas no banco.
Se o Supabase não responder, se a URL/chave estiver incorreta, se o schema não existir ou se houver bloqueio de rede/CORS, o erro `TypeError: Failed to fetch` era lançado antes de carregar a base local.

Resultado: o React mantinha `emptyData`, deixando o dashboard todo zerado.

## Correção aplicada
- A carga importada agora é sempre carregada primeiro no `localStorage`.
- Se o Supabase falhar, o sistema usa automaticamente a base importada local.
- A chave do `localStorage` foi atualizada para `v3`, forçando o navegador a abandonar caches antigos vazios.
- O salvamento remoto ficou não bloqueante: se o Supabase falhar, os dados continuam preservados localmente.
- Quando o Supabase estiver vazio, o sistema mostra a base importada e tenta semear o banco em segundo plano.

## Como publicar
1. Suba esta versão no GitHub.
2. No Netlify, use `Clear cache and deploy site`.
3. Build command: `npm run build`.
4. Publish directory: `dist`.

## Observação
Se quiser gravar tudo no Supabase depois, é necessário executar `supabase/schema.sql` no SQL Editor do Supabase e conferir as variáveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
