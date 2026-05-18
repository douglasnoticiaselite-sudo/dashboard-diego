# STEP Shutdown Control

Sistema web para substituir as planilhas de gestão de Shutdown Offshore.

## O que já vem pronto

- Dashboard executivo;
- Cadastro/edição/exclusão/duplicação de Shutdowns;
- Calendário/Gantt;
- PO/BSP;
- POB/Equipe;
- Histograma automático por data;
- Ferramental;
- Avanços;
- Custos por day rate;
- Pendências automáticas;
- Relatórios e exportação Excel;
- Importação Excel por módulo;
- Estrutura Supabase pronta;
- Modo demonstração local via localStorage caso o Supabase ainda não esteja configurado.

## Instalação local

```bash
npm install
npm run dev
```

## Deploy Netlify

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

## Supabase

1. Crie um projeto Supabase.
2. Abra SQL Editor.
3. Execute o arquivo:

```bash
supabase/schema.sql
```

4. No Netlify, cadastre as variáveis:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

## Observação importante

Enquanto as variáveis do Supabase não forem configuradas, o sistema funciona em modo demonstração usando `localStorage`. Isso permite abrir, testar, editar, baixar Excel e importar Excel sem banco.

Quando o Supabase estiver configurado, o sistema passa a tentar ler e gravar no banco.
