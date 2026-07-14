export const moduleManifest = [
  { key: "auth", label: "Autenticacao e tenant", priority: "MVP 1" },
  { key: "crm", label: "Conversas e CRM leve", priority: "MVP 1" },
  { key: "catalog", label: "Catalogo e precificacao", priority: "MVP 1" },
  { key: "orders", label: "Orcamento e pedido", priority: "MVP 1" },
  { key: "billing", label: "Integracao de pagamento", priority: "MVP 1" },
  { key: "production", label: "Producao", priority: "Proxima fase" },
  { key: "stock", label: "Estoque", priority: "Proxima fase" },
  { key: "notifications", label: "Notificacoes", priority: "Proxima fase" },
  { key: "automation", label: "Automacoes", priority: "Proxima fase" },
  { key: "observability", label: "Observabilidade", priority: "Transversal" },
] as const;

