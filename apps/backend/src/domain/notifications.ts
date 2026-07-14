import crypto from "node:crypto";
import type {
  AutomationRule,
  Notification,
  NotificationKind,
  NotificationOverview,
  NotificationSummary,
  NotificationStatus,
} from "@print-flow/contracts";

function now() {
  return new Date().toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const notifications: Notification[] = [];
const automationRules: AutomationRule[] = [];

type NotificationSeedInput = Omit<Notification, "id" | "updatedAt" | "status" | "channel" | "audience"> & Partial<Pick<Notification, "status" | "channel" | "audience">> & { updatedAt?: string };

function seedNotification(input: NotificationSeedInput) {
  const channel = input.channel ?? "in_app";
  const status = input.status ?? "sent";
  const audience = input.audience ?? "team";

  notifications.unshift({
    ...input,
    channel,
    status,
    audience,
    id: createId("notification"),
    updatedAt: input.updatedAt ?? input.createdAt,
  });
}

function seedRule(
  tenantId: string,
  name: string,
  trigger: string,
  action: string,
  segment: string,
  channel: AutomationRule["channel"],
  delayMinutes: number,
  description: string,
  minutesOffset: number,
) {
  automationRules.unshift({
    id: createId("automation_rule"),
    tenantId,
    name,
    trigger,
    action,
    enabled: true,
    segment,
    channel,
    delayMinutes,
    description,
    lastTriggeredAt: undefined,
    createdAt: minutesAgo(minutesOffset),
    updatedAt: minutesAgo(minutesOffset),
  });
}

function buildNotificationSummary(items: Notification[]): NotificationSummary {
  const byKind: NotificationSummary["byKind"] = {
    order_created: 0,
    payment_link: 0,
    payment_confirmed: 0,
    production_update: 0,
    remarketing: 0,
  };

  let unread = 0;
  let queued = 0;
  let sent = 0;
  let failed = 0;

  for (const notification of items) {
    byKind[notification.kind] += 1;
    if (notification.status !== "read") {
      unread += 1;
    }

    if (notification.status === "queued") {
      queued += 1;
    } else if (notification.status === "sent" || notification.status === "read") {
      sent += 1;
    } else if (notification.status === "failed") {
      failed += 1;
    }
  }

  return {
    total: items.length,
    unread,
    queued,
    sent,
    failed,
    byKind,
  };
}

function buildNotification(input: {
  tenantId: string;
  kind: NotificationKind;
  channel?: Notification["channel"];
  status?: NotificationStatus;
  audience?: Notification["audience"];
  title: string;
  body: string;
  relatedOrderId?: string;
  relatedQuoteId?: string;
  relatedConversationId?: string;
  actionLabel?: string;
  actionPath?: string;
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  metadata?: Record<string, string>;
  createdAt?: string;
}) {
  const timestamp = input.createdAt ?? now();
  return {
    id: createId("notification"),
    tenantId: input.tenantId,
    kind: input.kind,
    channel: input.channel ?? "in_app",
    status: input.status ?? "sent",
    audience: input.audience ?? "team",
    title: input.title,
    body: input.body,
    relatedOrderId: input.relatedOrderId,
    relatedQuoteId: input.relatedQuoteId,
    relatedConversationId: input.relatedConversationId,
    actionLabel: input.actionLabel,
    actionPath: input.actionPath,
    scheduledAt: input.scheduledAt,
    sentAt: input.sentAt ?? timestamp,
    readAt: input.readAt,
    metadata: input.metadata ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Notification;
}

seedRule(
  "tenant_alfa_print",
  "Lembrete de pagamento",
  "order.awaiting_payment",
  "Enviar o link de pagamento e reforcar o fechamento.",
  "Pedidos aguardando pagamento",
  "whatsapp",
  30,
  "Dispara um lembrete curto para pedidos sem confirmacao financeira.",
  118,
);
seedRule(
  "tenant_alfa_print",
  "Recuperar orcamento parado",
  "quote.sent",
  "Cobrar a aprovacao do orcamento por WhatsApp.",
  "Orcamentos enviados",
  "whatsapp",
  90,
  "Mantem o follow-up ativo quando o cliente nao responde.",
  104,
);
seedRule(
  "tenant_alfa_print",
  "Aviso de producao",
  "production.stage_changed",
  "Avisar a equipe interna sobre a movimentacao da ordem.",
  "Equipe de producao",
  "in_app",
  0,
  "Sinaliza eventos de producao que precisam de visibilidade interna.",
  90,
);
seedRule(
  "tenant_nova_graph",
  "Lembrete de pagamento",
  "order.awaiting_payment",
  "Enviar o link de pagamento e reforcar o fechamento.",
  "Pedidos aguardando pagamento",
  "whatsapp",
  30,
  "Dispara um lembrete curto para pedidos sem confirmacao financeira.",
  116,
);
seedRule(
  "tenant_nova_graph",
  "Recuperar orcamento parado",
  "quote.sent",
  "Cobrar a aprovacao do orcamento por WhatsApp.",
  "Orcamentos enviados",
  "whatsapp",
  90,
  "Mantem o follow-up ativo quando o cliente nao responde.",
  102,
);
seedRule(
  "tenant_nova_graph",
  "Aviso de producao",
  "production.stage_changed",
  "Avisar a equipe interna sobre a movimentacao da ordem.",
  "Equipe de producao",
  "in_app",
  0,
  "Sinaliza eventos de producao que precisam de visibilidade interna.",
  88,
);

seedNotification({
  tenantId: "tenant_alfa_print",
  kind: "order_created",
  title: "Pedido criado para Maria Costa",
  body: "O pedido order_seed_joao foi criado e aguarda o fluxo comercial seguir para faturamento.",
  relatedOrderId: "order_seed_joao",
  relatedQuoteId: "quote_0",
  actionLabel: "Abrir pedido",
  actionPath: "/orders/order_seed_joao",
  metadata: { source: "seed" },
  createdAt: minutesAgo(52),
});
seedNotification({
  tenantId: "tenant_alfa_print",
  kind: "payment_link",
  channel: "whatsapp",
  audience: "customer",
  title: "Link de pagamento enviado",
  body: "O cliente recebeu o link de pagamento do pedido order_seed_joao.",
  relatedOrderId: "order_seed_joao",
  actionLabel: "Revisar link",
  actionPath: "/billing/order_seed_joao",
  metadata: { source: "seed" },
  createdAt: minutesAgo(34),
});
seedNotification({
  tenantId: "tenant_nova_graph",
  kind: "payment_confirmed",
  title: "Pagamento aprovado",
  body: "O pedido order_seed_lucia_production teve o pagamento confirmado e seguiu para producao.",
  relatedOrderId: "order_seed_lucia_production",
  actionLabel: "Ver producao",
  actionPath: "/production/order_seed_lucia_production",
  metadata: { source: "seed" },
  createdAt: minutesAgo(28),
});
seedNotification({
  tenantId: "tenant_nova_graph",
  kind: "production_update",
  title: "Produção em andamento",
  body: "A ordem order_seed_lucia_production entrou na etapa de acabamento.",
  relatedOrderId: "order_seed_lucia_production",
  actionLabel: "Abrir produção",
  actionPath: "/production/order_seed_lucia_production",
  metadata: { source: "seed" },
  createdAt: minutesAgo(18),
});
seedNotification({
  tenantId: "tenant_alfa_print",
  kind: "remarketing",
  channel: "email",
  audience: "customer",
  title: "Retomar orçamento com Maria Costa",
  body: "O orçamento ficou parado e pode receber um lembrete comercial curto.",
  relatedQuoteId: "quote_0",
  actionLabel: "Enviar follow-up",
  actionPath: "/crm/conversations/conv_maria",
  metadata: { source: "seed" },
  createdAt: minutesAgo(16),
});

export function recordNotification(input: Parameters<typeof buildNotification>[0]) {
  const notification = buildNotification(input);
  notifications.unshift(notification);
  return notification;
}

export function recordOrderCreatedNotification(input: {
  tenantId: string;
  orderId: string;
  quoteId?: string;
  customerName: string;
}) {
  return recordNotification({
    tenantId: input.tenantId,
    kind: "order_created",
    title: `Pedido criado para ${input.customerName}`,
    body: `O pedido ${input.orderId} entrou na fila comercial e esta pronto para faturamento.`,
    relatedOrderId: input.orderId,
    relatedQuoteId: input.quoteId,
    actionLabel: "Abrir pedido",
    actionPath: `/orders/${input.orderId}`,
    metadata: { event: "order_created" },
  });
}

export function recordPaymentLinkNotification(input: {
  tenantId: string;
  orderId: string;
  paymentUrl: string;
  customerName: string;
}) {
  return recordNotification({
    tenantId: input.tenantId,
    kind: "payment_link",
    channel: "whatsapp",
    audience: "customer",
    title: `Link de pagamento enviado para ${input.customerName}`,
    body: `O link do pedido ${input.orderId} foi gerado e esta disponivel para envio ao cliente.`,
    relatedOrderId: input.orderId,
    actionLabel: "Abrir pagamento",
    actionPath: input.paymentUrl,
    metadata: { event: "payment_link", paymentUrl: input.paymentUrl },
  });
}

export function recordPaymentConfirmedNotification(input: {
  tenantId: string;
  orderId: string;
  customerName: string;
}) {
  return recordNotification({
    tenantId: input.tenantId,
    kind: "payment_confirmed",
    title: `Pagamento aprovado para ${input.customerName}`,
    body: `O pedido ${input.orderId} teve o pagamento confirmado e pode seguir para producao.`,
    relatedOrderId: input.orderId,
    actionLabel: "Ver producao",
    actionPath: `/production/${input.orderId}`,
    metadata: { event: "payment_confirmed" },
  });
}

export function recordProductionNotification(input: {
  tenantId: string;
  orderId: string;
  customerName: string;
  stageName: string;
  status: string;
  note?: string;
}) {
  return recordNotification({
    tenantId: input.tenantId,
    kind: "production_update",
    title: `Producao atualizada para ${input.customerName}`,
    body: input.note ?? `O pedido ${input.orderId} avancou para ${input.stageName} com status ${input.status}.`,
    relatedOrderId: input.orderId,
    actionLabel: "Abrir producao",
    actionPath: `/production/${input.orderId}`,
    metadata: { event: "production_update", stageName: input.stageName, status: input.status },
  });
}

export function recordRemarketingNotification(input: {
  tenantId: string;
  title: string;
  body: string;
  relatedQuoteId?: string;
  relatedOrderId?: string;
  customerName: string;
}) {
  return recordNotification({
    tenantId: input.tenantId,
    kind: "remarketing",
    channel: "email",
    audience: "customer",
    title: input.title,
    body: input.body,
    relatedQuoteId: input.relatedQuoteId,
    relatedOrderId: input.relatedOrderId,
    actionLabel: "Abrir oportunidade",
    actionPath: input.relatedOrderId ? `/orders/${input.relatedOrderId}` : input.relatedQuoteId ? `/orders/${input.relatedQuoteId}` : undefined,
    metadata: { event: "remarketing", customerName: input.customerName },
  });
}

export function listNotificationsForTenant(tenantId: string) {
  return notifications
    .filter((notification) => notification.tenantId === tenantId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function listAutomationRulesForTenant(tenantId: string) {
  return automationRules
    .filter((rule) => rule.tenantId === tenantId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNotificationOverview(tenantId: string) {
  const recent = listNotificationsForTenant(tenantId).slice(0, 8);
  return {
    summary: buildNotificationSummary(listNotificationsForTenant(tenantId)),
    recent,
    automationRules: listAutomationRulesForTenant(tenantId),
  };
}

export function markNotificationAsRead(tenantId: string, notificationId: string) {
  const notification = notifications.find((item) => item.id === notificationId && item.tenantId === tenantId);

  if (!notification) {
    return null;
  }

  notification.status = "read";
  notification.readAt = now();
  notification.updatedAt = notification.readAt;
  return notification;
}
