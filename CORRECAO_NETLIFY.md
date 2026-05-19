# Correção aplicada para o deploy no Netlify

## Problema identificado
O `package-lock.json` estava apontando os pacotes para um registry interno:

`packages.applied-caas-gateway1.internal.api.openai.org`

Esse endereço não é acessível pelo Netlify. Por isso o deploy ficava preso em **Installing npm packages**.

## O que foi ajustado
- `package-lock.json` corrigido para usar `https://registry.npmjs.org`.
- `.npmrc` criado para forçar o registry público do npm e desativar audit/fund/progress durante install.
- `.nvmrc` criado para fixar Node.js 20.19.5.
- `netlify.toml` ajustado com variáveis de ambiente de build.
- `vite.config.ts` criado com divisão de chunks para deixar o build mais leve.

## Configuração Netlify
Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

## Se ainda travar no Netlify
No painel do Netlify, use:

1. **Clear cache and deploy site**
2. Confirme que o repositório recebeu este pacote corrigido.
3. Se necessário, configure manualmente:
   - `NODE_VERSION=20.19.5`
   - `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/`
