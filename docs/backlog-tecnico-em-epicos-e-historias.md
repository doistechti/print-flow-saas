# Backlog técnico em épicos e histórias - Print Flow SaaS

Data: 2026-07-13

## Objetivo

Transformar o SDD da plataforma `print-flow-saas` em um backlog técnico executável, com épicos, histórias e dependências claras.

Este backlog foi pensado para viabilizar o MVP e manter a API de pagamento como serviço financeiro externo.

## Princípios de priorização

- começar pelo que destrava o fluxo ponta a ponta;
- validar primeiro o contrato com a API de pagamento;
- manter multi-tenant desde o início;
- reduzir acoplamento entre atendimento, pedido e billing;
- entregar valor visível a cada sprint.

## Épico 1 - Fundacão do projeto e identidade da plataforma

### Objetivo

Criar a base técnica e organizacional do SaaS.

### Histórias

- Como desenvolvedor, quero criar a estrutura inicial do repositório para frontend e backend para iniciar a implementação organizada.
- Como operador, quero acessar o ambiente com uma identidade visual mínima para validar o produto com o cliente.
- Como time, queremos configurar variáveis de ambiente, lint, build e padrão de commit para manter a base estável.

### Entregáveis

- workspace criada;
- estrutura de pastas;
- padrão de documentação;
- pipeline básico de execução local.

### Dependências

- nenhuma.

## Épico 2 - Multi-tenant e autenticação

### Objetivo

Garantir isolamento por empresa desde o início.

### Histórias

- Como administrador, quero cadastrar uma empresa para separar os dados de cada gráfica.
- Como usuário, quero fazer login para acessar apenas os recursos do meu tenant.
- Como sistema, quero identificar o tenant em todas as requisições relevantes.
- Como gestor, quero controlar permissões por perfil para limitar acesso a telas e ações.

### Entregáveis

- `tenant`;
- `user`;
- `role`;
- autenticação;
- autorização;
- contexto de tenant na API.

### Dependências

- épico 1.

## Épico 3 - Base de atendimento e CRM leve

### Objetivo

Registrar o contato do cliente e o contexto inicial da conversa.

### Histórias

- Como atendente, quero registrar um lead para não perder o histórico do contato.
- Como atendente, quero abrir uma conversa vinculada ao cliente e ao tenant.
- Como atendente, quero registrar mensagens e eventos da conversa.
- Como sistema, quero recuperar o contexto do atendimento para continuar a conversa sem perda de informação.

### Entregáveis

- `lead`;
- `conversation`;
- `conversation_message`;
- fluxo básico de histórico.

### Dependências

- épico 2.

## Épico 4 - Catálogo de produtos e precificação

### Objetivo

Permitir consulta de produtos, regras comerciais e composição de orçamento.

### Histórias

- Como operador, quero cadastrar produtos e categorias para vender itens da gráfica.
- Como operador, quero definir variações e atributos do produto para atender pedidos personalizados.
- Como operador, quero configurar regras de preço para calcular orçamentos.
- Como sistema, quero montar itens de orçamento com base no catálogo.

### Entregáveis

- `product`;
- `product_category`;
- `product_variant`;
- `price_rule`;
- consulta de catálogo.

### Dependências

- épico 2.

## Épico 5 - Orçamento e pedido comercial

### Objetivo

Converter a intenção do cliente em um pedido estruturado.

### Histórias

- Como atendente, quero montar um orçamento com itens e valores para apresentar ao cliente.
- Como atendente, quero aprovar um orçamento para transformá-lo em pedido.
- Como sistema, quero registrar os itens do pedido com vínculo ao cliente e ao tenant.
- Como operador, quero consultar o status do pedido em cada etapa.

### Entregáveis

- `quote`;
- `quote_item`;
- `order`;
- `order_item`;
- status do pedido.

### Dependências

- épico 3;
- épico 4.

## Épico 6 - Integração com a API de pagamento

### Objetivo

Gerar cobrança, receber `paymentUrl` e acompanhar o pagamento.

### Histórias

- Como backend, quero transformar um pedido aprovado em invoice na API de pagamento.
- Como backend, quero solicitar a criação de charge e receber o link de pagamento.
- Como atendente, quero enviar o link ao cliente sem sair do SaaS.
- Como sistema, quero consultar o status financeiro do pedido.

### Entregáveis

- integração com billing;
- contrato de criação de cobrança;
- persistência de referência da cobrança;
- exibição de status financeiro.

### Dependências

- épico 5;
- API de pagamento disponível.

## Épico 7 - Webhook e sincronização de pagamento

### Objetivo

Confirmar o pagamento e sincronizar o SaaS com o billing.

### Histórias

- Como sistema, quero receber a confirmação do pagamento para avançar o pedido.
- Como sistema, quero tratar eventos repetidos sem duplicar atualização.
- Como operador, quero visualizar quando a cobrança foi paga.
- Como sistema, quero manter rastreabilidade entre webhook, invoice, charge e payment.

### Entregáveis

- consumidor de evento;
- sincronização com billing;
- atualização automática do pedido;
- trilha de auditoria.

### Dependências

- épico 6.

## Épico 8 - Produção e etapas de confecção

### Objetivo

Controlar o fluxo operacional do pedido após pagamento.

### Histórias

- Como operador, quero mover o pedido entre etapas de produção.
- Como gestor, quero definir etapas padrão por tipo de produto.
- Como sistema, quero registrar atraso e SLA da produção.
- Como operador, quero adicionar observações internas ao pedido.

### Entregáveis

- `production_stage`;
- `order_stage`;
- status operacional;
- histórico de movimentação.

### Dependências

- épico 5;
- épico 7.

## Épico 9 - Estoque

### Objetivo

Controlar itens disponíveis, reservas e baixas.

### Histórias

- Como operador, quero cadastrar itens de estoque.
- Como sistema, quero reservar itens quando o pedido for aprovado.
- Como operador, quero registrar baixa de estoque ao iniciar a produção.
- Como gestor, quero consultar movimentações de estoque.

### Entregáveis

- `stock_item`;
- `stock_movement`;
- reserva e baixa;
- consulta de saldo.

### Dependências

- épico 5;
- épico 8.

## Épico 10 - Notificações

### Objetivo

Manter cliente e equipe informados sobre eventos relevantes.

### Histórias

- Como sistema, quero notificar a criação do pedido.
- Como sistema, quero enviar o link de pagamento.
- Como sistema, quero avisar sobre pagamento aprovado.
- Como sistema, quero notificar mudança de status da produção.

### Entregáveis

- `notification`;
- templates;
- disparos por evento.

### Dependências

- épico 6;
- épico 7;
- épico 8.

## Épico 11 - Remarketing e automações

### Objetivo

Recuperar oportunidades e aumentar conversão.

### Histórias

- Como gestor, quero criar regras para recuperar orçamento abandonado.
- Como sistema, quero disparar lembretes automáticos de pagamento.
- Como sistema, quero reengajar clientes com campanhas segmentadas.
- Como gestor, quero configurar automações por evento.

### Entregáveis

- `automation_rule`;
- `campaign`;
- regras por evento;
- ações automáticas.

### Dependências

- épico 3;
- épico 6;
- épico 10.

## Épico 12 - Frontend operacional

### Objetivo

Entregar uma interface para operar atendimento, pedido e produção.

### Histórias

- Como usuário, quero entrar no sistema e acessar meu tenant.
- Como operador, quero visualizar conversas, pedidos e pagamentos em um dashboard.
- Como operador, quero criar e editar pedidos pelo frontend.
- Como operador, quero acompanhar produção e estoque.

### Entregáveis

- login;
- dashboard;
- lista de conversas;
- tela de pedido;
- tela de produção;
- tela de estoque.

### Dependências

- épico 2;
- épico 3;
- épico 5;
- épico 6.

## Épico 13 - Observabilidade e auditoria

### Objetivo

Garantir rastreabilidade operacional e suporte a diagnóstico.

### Histórias

- Como time técnico, quero logs correlacionados por tenant e pedido.
- Como suporte, quero visualizar a trilha de eventos do pedido.
- Como sistema, quero registrar falhas de integração sem perder contexto.

### Entregáveis

- logs estruturados;
- correlação por ID;
- auditoria de eventos;
- telas ou endpoints de consulta.

### Dependências

- épico 6;
- épico 7;
- épico 8.

## Priorização sugerida

1. fundação;
2. multi-tenant e autenticação;
3. atendimento/CRM leve;
4. catálogo e precificação;
5. pedido comercial;
6. integração com billing;
7. webhook e sincronização;
8. frontend operacional;
9. produção;
10. estoque;
11. notificações;
12. automações;
13. observabilidade.

## Definição de pronto para cada história

- código implementado;
- testes mínimos atualizados;
- contrato documentado;
- comportamento validado localmente;
- integração com billing sem regressão.

