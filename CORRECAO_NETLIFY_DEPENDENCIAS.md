# Correção aplicada para deploy no Netlify

Este ZIP já foi ajustado para evitar o erro:

`npm error Exit handler never called!`

## Ajustes aplicados

- Node fixado em `20.19.5`
- npm fixado em `10.8.2`
- `.npmrc` criado com `legacy-peer-deps=true`
- `netlify.toml` atualizado
- `package.json` atualizado com `engines`
- `.gitignore` conferido para não subir `.env`

## Configuração no Netlify

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

Variáveis recomendadas no Netlify:

```env
NODE_VERSION=20.19.5
NPM_VERSION=10.8.2
NPM_FLAGS=--legacy-peer-deps --no-audit --no-fund
```

Além das variáveis do Supabase:

```env
VITE_SUPABASE_URL=https://fqsegsnskmstcfjpahhi.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

Depois de subir o ZIP ou GitHub, rode no Netlify:

`Deploys > Trigger deploy > Clear cache and deploy site`
