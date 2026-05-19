# Importação de dados reais — STEP Shutdown Control

Esta versão já vem com a carga inicial consolidada dentro do sistema.

## Arquivos usados como fonte

- `Avanços SD 2026(1).xlsx`
- `Calendario Previsao Shutdown 2026 7(1).xlsx`
- `Controle PO'S - BSP(1).xlsx`
- `Histograma Linha do Tempo $$$$$$(1).xlsx`
- `Histograma Step Sepetiba(1).xlsx`
- `Lista de Ferramentas SD Saquarema Julho-2026 1(1).xlsx`
- `Previa de POB SBM Anchieta Shutdown(1).xlsx`
- `Previa de POB SBM Saquarema Shutdown(1).xlsx`

O arquivo `Calendario Previsao Shutdown 2026 6(1).xlsx` foi analisado como referência, mas a versão `7` foi usada como base principal porque contém mais metadados: unidade, BSP, PO, responsável, projeto e mês.

## Quantidade importada

- 16 shutdowns/projetos
- 37 fases de calendário/Gantt
- 25 registros de PO/BSP/BPP
- 122 registros de POB/equipe
- 401 itens de ferramental
- 30 registros de avanço
- 4 usuários base

## Correções aplicadas

- O sistema não inicia mais zerado quando o `localStorage` antigo estiver vazio.
- A chave local foi trocada para `step_shutdown_control_data_v2_imported_2026`, forçando uma carga nova no navegador.
- Se o Supabase estiver configurado e as tabelas estiverem vazias, o painel carrega a base importada como fallback.
- Ao clicar em `Salvar tudo`, a base também é gravada no Supabase, se as permissões do banco permitirem.
- O botão de configurações agora recarrega os dados importados, não apenas demo.

## Build

Build testado com sucesso:

```bash
npm run build
```

Configuração Netlify:

```txt
Build command: npm run build
Publish directory: dist
```
