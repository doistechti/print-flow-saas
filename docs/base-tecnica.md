# Base tecnica do Print Flow SaaS

Data: 2026-07-13

## Decisao de stack

- monorepo com `apps/frontend`, `apps/backend` e `packages/contracts`;
- frontend em React + Vite + TypeScript;
- backend em Node.js + Fastify + TypeScript;
- contrato compartilhado em pacote local para tipos e integracoes;
- foco em modularizacao por dominio, seguindo o SDD.

## Modulos iniciais

- autenticacao e tenant;
- conversas e CRM leve;
- catalogo e precificacao;
- orcamento e pedido;
- integracao de pagamento;
- producao;
- estoque;
- notificacoes;
- automacoes;
- observabilidade.

## Objetivo da base

- permitir evolucao incremental sem retrabalho estrutural;
- manter contratos claros entre frontend, backend e integracoes;
- facilitar o MVP ate pagamento confirmado;
- deixar a plataforma pronta para multi-tenant desde o inicio.

