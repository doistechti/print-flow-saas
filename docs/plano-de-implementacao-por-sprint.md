# Plano de implementação por sprint - Print Flow SaaS

Data: 2026-07-13

## Premissas

- sprints de 2 semanas;
- foco em entregar o caminho mais curto até o valor real;
- a API de pagamento já existe e será consumida como serviço externo;
- o MVP precisa chegar até a geração do link de pagamento e confirmação do pagamento;
- multi-tenant entra no começo para evitar migração cara depois.

## Sprint 0 - Preparação técnica

### Objetivo

Deixar a base pronta para o desenvolvimento do SaaS.

### Entregas

- workspace criada;
- documentação centralizada;
- definição dos módulos frontend e backend;
- configuração inicial do repositório;
- padrão de nomenclatura e pastas.

### Resultado esperado

Time pronto para começar sem retrabalho estrutural.

## Sprint 1 - Fundação do backend e autenticação

### Objetivo

Criar a base do SaaS com tenant e autenticação.

### Entregas

- entidade `tenant`;
- entidade `user`;
- entidade `role`;
- autenticação básica;
- autorização por perfil;
- contexto de tenant nas requisições.

### Resultado esperado

Usuário consegue entrar no sistema e o backend já respeita o isolamento por empresa.

## Sprint 2 - Fundação do frontend

### Objetivo

Criar a base visual do produto.

### Entregas

- layout inicial;
- login;
- navegação principal;
- estrutura de dashboard;
- consumo do backend autenticado.

### Resultado esperado

Interface navegável com identidade mínima e acesso ao tenant.

## Sprint 3 - Atendimento e CRM leve

### Objetivo

Registrar clientes, leads e conversas.

### Entregas

- `lead`;
- `conversation`;
- `conversation_message`;
- tela de lista de conversas;
- detalhe da conversa;
- histórico do atendimento.

### Resultado esperado

O operador já consegue acompanhar o atendimento do cliente dentro do sistema.

## Sprint 4 - Catálogo e orçamento

### Objetivo

Permitir montar propostas com base no catálogo.

### Entregas

- `product`;
- `product_category`;
- `product_variant`;
- `price_rule`;
- tela de catálogo;
- montagem de orçamento;
- cálculo de valores.

### Resultado esperado

O sistema consegue construir uma proposta comercial real.

## Sprint 5 - Pedido comercial

### Objetivo

Converter orçamento em pedido estruturado.

### Entregas

- `quote`;
- `quote_item`;
- `order`;
- `order_item`;
- status do pedido;
- tela de detalhe do pedido;
- fluxo de aprovação.

### Resultado esperado

O orçamento aprovado vira pedido dentro do SaaS.

## Sprint 6 - Integração com a API de pagamento

### Objetivo

Gerar cobrança e retornar o link de pagamento.

### Entregas

- integração backend com a API de pagamento;
- criação de invoice;
- criação de charge;
- persistência de `paymentUrl`;
- exibição do link no frontend;
- vínculo pedido ↔ cobrança.

### Resultado esperado

O cliente recebe o link de pagamento sem sair do fluxo do SaaS.

## Sprint 7 - Webhook e confirmação de pagamento

### Objetivo

Sincronizar pagamento aprovado com o pedido.

### Entregas

- consumidor de confirmação;
- atualização automática de pedido;
- visualização do status financeiro;
- trilha de auditoria;
- tratamento de eventos repetidos.

### Resultado esperado

O pedido avança automaticamente quando o pagamento é confirmado.

## Sprint 8 - Produção

### Objetivo

Operar o ciclo de confecção.

### Entregas

- etapas de produção;
- status operacional;
- observações internas;
- tela de produção;
- movimentação entre etapas.

### Resultado esperado

O time já consegue trabalhar o pedido até a entrega.

## Sprint 9 - Estoque

### Objetivo

Conectar pedido e disponibilidade de insumos.

### Entregas

- `stock_item`;
- `stock_movement`;
- reserva;
- baixa;
- consulta de saldo.

### Resultado esperado

O sistema evita vender sem estoque ou sem previsibilidade operacional.

## Sprint 10 - Notificações e remarketing inicial

### Objetivo

Automatizar a comunicação com cliente e equipe.

### Entregas

- notificações de pedido;
- link de pagamento;
- aviso de pagamento aprovado;
- atualização de produção;
- lembretes automáticos básicos.

### Resultado esperado

Menos trabalho manual e mais conversão.

## Sprint 11 - Observabilidade e endurecimento

### Objetivo

Tornar a solução auditável e pronta para crescimento.

### Entregas

- logs estruturados;
- correlação por tenant e pedido;
- auditoria de integrações;
- revisão de segurança;
- revisão de contratos.

### Resultado esperado

Sistema mais confiável para operar com múltiplas gráficas.

## Estratégia de entrega do MVP

O MVP mínimo que já gera valor real deve sair até a Sprint 7:

- login;
- tenant;
- conversas;
- catálogo;
- orçamento;
- pedido;
- cobrança;
- link de pagamento;
- confirmação automática.

Depois disso, o produto evolui para produção, estoque, notificações e remarketing.

## Dependências críticas

- API de pagamento estável;
- contrato claro entre backend SaaS e billing;
- modelagem de tenant desde o início;
- frontend com navegação por módulos;
- persistência de auditoria para eventos financeiros.

## Critério de sucesso do plano

O plano está bem sucedido se, ao final do ciclo inicial:

- o operador monta um pedido no sistema;
- o sistema gera a cobrança;
- o cliente recebe e paga o link;
- o pedido avança sozinho após a confirmação;
- o time enxerga claramente o status operacional.

