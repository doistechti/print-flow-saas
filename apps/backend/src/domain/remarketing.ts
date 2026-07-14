import type { RemarketingOverview, RemarketingOpportunity } from "@print-flow/contracts";
import { listConversationsForTenant, listLeadsForTenant } from "./store.js";
import { listOrdersForTenant, listQuotesForTenant } from "./orders.js";

function now() {
  return new Date().toISOString();
}

function addMinutes(timestamp: string, minutes: number) {
  return new Date(new Date(timestamp).getTime() + minutes * 60 * 1000).toISOString();
}

function minutesSince(timestamp: string) {
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
}

function createOpportunityId(tenantId: string, kind: string, sourceId: string) {
  return `remarketing_${tenantId}_${kind}_${sourceId}`;
}

function getPriorityFromAge(ageMinutes: number) {
  if (ageMinutes >= 180) {
    return "high" as const;
  }

  if (ageMinutes >= 60) {
    return "medium" as const;
  }

  return "low" as const;
}

function buildDueAt(timestamp: string, minutes: number) {
  return addMinutes(timestamp, minutes);
}

function addOpportunity(list: RemarketingOpportunity[], opportunity: RemarketingOpportunity | null) {
  if (!opportunity) {
    return;
  }

  list.push(opportunity);
}

export function listRemarketingOpportunitiesForTenant(tenantId: string) {
  const opportunities: RemarketingOpportunity[] = [];
  const quotes = listQuotesForTenant(tenantId);
  const orders = listOrdersForTenant(tenantId);
  const leads = listLeadsForTenant(tenantId);
  const conversations = listConversationsForTenant(tenantId);
  const quoteOrders = new Map(orders.map((order) => [order.quoteId ?? order.id, order]));
  const customerHasQuote = new Set(quotes.map((quote) => quote.customerProfileId));
  const customerHasOrder = new Set(orders.map((order) => order.customerProfileId));

  for (const quote of quotes) {
    if (quote.status !== "sent") {
      continue;
    }

    const ageMinutes = minutesSince(quote.updatedAt);
    if (ageMinutes < 45) {
      continue;
    }

    const priority = getPriorityFromAge(ageMinutes);
    addOpportunity(opportunities, {
      id: createOpportunityId(tenantId, "quote", quote.id),
      tenantId,
      title: `Retomar orcamento com ${quote.customerName}`,
      reason: `Orcamento enviado ha ${ageMinutes} min sem aprovacao do cliente.`,
      priority,
      channel: "whatsapp",
      customerName: quote.customerName,
      customerProfileId: quote.customerProfileId,
      relatedQuoteId: quote.id,
      relatedOrderId: quoteOrders.get(quote.id)?.id,
      dueAt: buildDueAt(quote.updatedAt, 120),
      suggestedAction: "Enviar lembrete com prazo, valor e CTA de aprovacao.",
      createdAt: quote.updatedAt,
      updatedAt: now(),
    });
  }

  for (const order of orders) {
    if (order.status !== "awaiting_payment") {
      continue;
    }

    const ageMinutes = minutesSince(order.updatedAt);
    if (ageMinutes < 20) {
      continue;
    }

    addOpportunity(opportunities, {
      id: createOpportunityId(tenantId, "payment", order.id),
      tenantId,
      title: `Cobrar pagamento de ${order.customerName}`,
      reason: `Pedido aguardando pagamento ha ${ageMinutes} min.`,
      priority: ageMinutes >= 120 ? "high" : "medium",
      channel: "whatsapp",
      customerName: order.customerName,
      customerProfileId: order.customerProfileId,
      relatedQuoteId: order.quoteId,
      relatedOrderId: order.id,
      dueAt: buildDueAt(order.updatedAt, 90),
      suggestedAction: "Reenviar o link de pagamento e reforcar o fechamento do pedido.",
      createdAt: order.updatedAt,
      updatedAt: now(),
    });
  }

  for (const conversation of conversations) {
    if (conversation.status !== "waiting_customer") {
      continue;
    }

    const lastActivity = conversation.lastMessageAt ?? conversation.updatedAt;
    const ageMinutes = minutesSince(lastActivity);
    if (ageMinutes < 30) {
      continue;
    }

    addOpportunity(opportunities, {
      id: createOpportunityId(tenantId, "conversation", conversation.id),
      tenantId,
      title: `Retomar conversa com ${conversation.customerName}`,
      reason: `Ultima interacao ha ${ageMinutes} min e a conversa segue aguardando o cliente.`,
      priority: ageMinutes >= 180 ? "high" : "medium",
      channel: "whatsapp",
      customerName: conversation.customerName,
      customerProfileId: conversation.customerProfileId,
      dueAt: buildDueAt(lastActivity, 120),
      suggestedAction: "Mandar follow-up curto com proposta objetiva.",
      createdAt: lastActivity,
      updatedAt: now(),
    });
  }

  for (const lead of leads) {
    if (lead.stage !== "qualified" && lead.stage !== "contacted") {
      continue;
    }

    const leadCustomerProfileId = lead.customerProfileId ?? lead.id;
    if (customerHasQuote.has(leadCustomerProfileId) || customerHasOrder.has(leadCustomerProfileId)) {
      continue;
    }

    const ageMinutes = minutesSince(lead.updatedAt);
    if (ageMinutes < 60) {
      continue;
    }

    addOpportunity(opportunities, {
      id: createOpportunityId(tenantId, "lead", lead.id),
      tenantId,
      title: `Reengajar lead ${lead.customerName}`,
      reason: `Lead ${lead.stage} sem orcamento gerado ha ${ageMinutes} min.`,
      priority: lead.stage === "qualified" ? "medium" : "low",
      channel: "email",
      customerName: lead.customerName,
      customerProfileId: lead.customerProfileId,
      dueAt: buildDueAt(lead.updatedAt, 240),
      suggestedAction: "Oferecer catalogo inicial ou convite para montar o orcamento.",
      createdAt: lead.updatedAt,
      updatedAt: now(),
    });
  }

  return opportunities.sort((left, right) => {
    const priorityRank = { high: 0, medium: 1, low: 2 } as const;
    if (priorityRank[left.priority] !== priorityRank[right.priority]) {
      return priorityRank[left.priority] - priorityRank[right.priority];
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function getRemarketingOverview(tenantId: string): RemarketingOverview {
  const opportunities = listRemarketingOpportunitiesForTenant(tenantId);
  const dueSoon = opportunities.filter((opportunity) => {
    if (!opportunity.dueAt) {
      return false;
    }

    return new Date(opportunity.dueAt).getTime() - Date.now() <= 24 * 60 * 60 * 1000;
  }).length;

  return {
    summary: {
      total: opportunities.length,
      highPriority: opportunities.filter((opportunity) => opportunity.priority === "high").length,
      mediumPriority: opportunities.filter((opportunity) => opportunity.priority === "medium").length,
      lowPriority: opportunities.filter((opportunity) => opportunity.priority === "low").length,
      dueSoon,
    },
    opportunities,
    rules: [],
  };
}
