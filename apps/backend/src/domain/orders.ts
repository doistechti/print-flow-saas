import crypto from "node:crypto";
import type {
  ApproveQuoteResponse,
  CreateQuoteItemRequest,
  CreateQuoteRequest,
  CustomerProfile,
  Order,
  OrderDetail,
  OrderItem,
  OrderPaymentStatus,
  OrderStatus,
  OrderSummary,
  OrdersOverview,
  PricePreviewResult,
  BillingRecord,
  BillingWebhookPaymentEvent,
  Quote,
  QuoteDetail,
  QuoteItem,
  QuoteSummary,
} from "@print-flow/contracts";
import { previewCatalogPrice } from "./catalog.js";
import { listBillingEventsForOrder } from "./billing-ledger.js";
import { findCustomerProfileById } from "./store.js";

function now() {
  return new Date().toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveCustomerProfile(tenantId: string, customerProfileId: string, timestamp: string): CustomerProfile {
  const profile = findCustomerProfileById(customerProfileId);

  if (profile && profile.tenantId === tenantId) {
    return profile;
  }

  return {
    id: customerProfileId,
    tenantId,
    name: "Cliente sem cadastro",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildQuoteItem(tenantId: string, preview: PricePreviewResult): QuoteItem {
  return {
    id: createId("quote_item"),
    tenantId,
    productId: preview.productId,
    productName: preview.productName,
    variantId: preview.variantId,
    variantName: preview.variantName,
    quantity: preview.quantity,
    unitPrice: preview.unitPrice,
    total: preview.total,
    currency: preview.currency,
  };
}

function buildOrderItem(tenantId: string, item: QuoteItem): OrderItem {
  return {
    id: createId("order_item"),
    tenantId,
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    currency: item.currency,
  };
}

function buildQuoteRecord(
  tenantId: string,
  payload: CreateQuoteRequest | { customerProfileId: string; items: CreateQuoteItemRequest[]; notes?: string },
  timestamp = now(),
  status: Quote["status"] = "draft",
) {
  const customerProfile = resolveCustomerProfile(tenantId, payload.customerProfileId, timestamp);

  if (!payload.items.length) {
    throw new Error("Quote must contain at least one item");
  }

  const items = payload.items.map((item) => {
    const preview = previewCatalogPrice(tenantId, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    });

    if (!preview) {
      throw new Error(`Nao foi possivel precificar o produto ${item.productId}`);
    }

    return buildQuoteItem(tenantId, preview);
  });

  const total = roundMoney(items.reduce((sum, item) => sum + item.total, 0));

  const quote: Quote = {
    id: createId("quote"),
    tenantId,
    customerProfileId: customerProfile.id,
    customerName: customerProfile.name,
    items,
    total,
    status,
    notes: payload.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return quote;
}

function buildQuoteSummary(quote: Quote): QuoteSummary {
  return {
    id: quote.id,
    tenantId: quote.tenantId,
    customerProfileId: quote.customerProfileId,
    customerName: quote.customerName,
    status: quote.status,
    total: quote.total,
    itemCount: quote.items.length,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}

function buildQuoteDetail(quote: Quote): QuoteDetail {
  const timestamp = quote.updatedAt ?? quote.createdAt;
  return {
    ...buildQuoteSummary(quote),
    orderId: quote.orderId,
    notes: quote.notes,
    customerProfile: resolveCustomerProfile(quote.tenantId, quote.customerProfileId, timestamp),
    items: quote.items,
  };
}

function buildOrderSummary(order: Order): OrderSummary {
  return {
    id: order.id,
    tenantId: order.tenantId,
    customerProfileId: order.customerProfileId,
    customerName: order.customerName,
    quoteId: order.quoteId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentUrl: order.paymentUrl,
    billingProvider: order.billingProvider,
    billingInvoiceId: order.billingInvoiceId,
    billingChargeId: order.billingChargeId,
    total: order.total,
    itemCount: order.items.length,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function buildOrderDetail(order: Order): OrderDetail {
  const timestamp = order.updatedAt ?? order.createdAt;
  return {
    ...buildOrderSummary(order),
    customerProfile: resolveCustomerProfile(order.tenantId, order.customerProfileId, timestamp),
    items: order.items,
    billingEvents: listBillingEventsForOrder(order.tenantId, order.id),
  };
}

function cloneOrderItem(tenantId: string, item: QuoteItem): OrderItem {
  return buildOrderItem(tenantId, item);
}

function sumTotals<T extends { total: number }>(items: T[]) {
  return roundMoney(items.reduce((sum, item) => sum + item.total, 0));
}

const seededDraftQuote = buildQuoteRecord(
  "tenant_alfa_print",
  {
    customerProfileId: "customer_maria",
    items: [
      { productId: "tenant_alfa_print_business-card-premium", variantId: "tenant_alfa_print_business-card-premium_front-back", quantity: 500 },
      { productId: "tenant_alfa_print_folder-triplex", variantId: "tenant_alfa_print_folder-triplex_uv", quantity: 1000 },
    ],
    notes: "Orcamento inicial para material comercial premium.",
  },
  minutesAgo(88),
  "draft",
);

const seededApprovedQuote = buildQuoteRecord(
  "tenant_alfa_print",
  {
    customerProfileId: "customer_joao",
    items: [
      { productId: "tenant_alfa_print_flyer-a5", variantId: "tenant_alfa_print_flyer-a5_double-sided", quantity: 2000 },
    ],
    notes: "Aguardando aprovacão do cliente para iniciar faturamento.",
  },
  minutesAgo(126),
  "approved",
);

const seededOrder: Order = {
  id: "order_seed_joao",
  tenantId: "tenant_alfa_print",
  customerProfileId: seededApprovedQuote.customerProfileId,
  customerName: seededApprovedQuote.customerName,
  items: seededApprovedQuote.items.map((item) => cloneOrderItem("tenant_alfa_print", item)),
  total: seededApprovedQuote.total,
  quoteId: seededApprovedQuote.id,
  status: "quoted",
  paymentStatus: "pending",
  createdAt: minutesAgo(118),
  updatedAt: minutesAgo(56),
};

seededApprovedQuote.orderId = seededOrder.id;
seededApprovedQuote.updatedAt = minutesAgo(118);

const novaDraftQuote = buildQuoteRecord(
  "tenant_nova_graph",
  {
    customerProfileId: "customer_lucia",
    items: [
      { productId: "tenant_nova_graph_vinyl-banner", variantId: "tenant_nova_graph_vinyl-banner_with-stand", quantity: 24 },
    ],
    notes: "Montagem urgente para feira com suporte incluso.",
  },
  minutesAgo(74),
  "sent",
);

export const quotes: Quote[] = [seededDraftQuote, seededApprovedQuote, novaDraftQuote];
export const orders: Order[] = [seededOrder];

function findQuoteById(quoteId: string) {
  return quotes.find((quote) => quote.id === quoteId) ?? null;
}

function findOrderById(orderId: string) {
  return orders.find((order) => order.id === orderId) ?? null;
}

export function listQuotesForTenant(tenantId: string) {
  return quotes
    .filter((quote) => quote.tenantId === tenantId)
    .map((quote) => buildQuoteSummary(quote))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function listOrdersForTenant(tenantId: string) {
  return orders
    .filter((order) => order.tenantId === tenantId)
    .map((order) => buildOrderSummary(order))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getQuoteDetail(tenantId: string, quoteId: string) {
  const quote = findQuoteById(quoteId);

  if (!quote || quote.tenantId !== tenantId) {
    return null;
  }

  return buildQuoteDetail(quote);
}

export function getOrderDetail(tenantId: string, orderId: string) {
  const order = findOrderById(orderId);

  if (!order || order.tenantId !== tenantId) {
    return null;
  }

  return buildOrderDetail(order);
}

export function createQuote(tenantId: string, payload: CreateQuoteRequest) {
  const timestamp = now();
  const quote = buildQuoteRecord(tenantId, payload, timestamp, "draft");
  quotes.unshift(quote);
  return buildQuoteDetail(quote);
}

export function approveQuote(tenantId: string, quoteId: string): ApproveQuoteResponse {
  const quote = findQuoteById(quoteId);

  if (!quote || quote.tenantId !== tenantId) {
    throw new Error("Quote not found");
  }

  if (quote.orderId) {
    const existingOrder = findOrderById(quote.orderId);
    if (existingOrder) {
      quote.status = "approved";
      quote.updatedAt = now();
      return {
        quote: buildQuoteDetail(quote),
        order: buildOrderDetail(existingOrder),
      };
    }
  }

  const timestamp = now();
  quote.status = "approved";
  quote.updatedAt = timestamp;

  const order: Order = {
    id: createId("order"),
    tenantId,
    customerProfileId: quote.customerProfileId,
    customerName: quote.customerName,
    items: quote.items.map((item) => cloneOrderItem(tenantId, item)),
    total: quote.total,
    quoteId: quote.id,
    status: "quoted",
    paymentStatus: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  quote.orderId = order.id;
  orders.unshift(order);

  return {
    quote: buildQuoteDetail(quote),
    order: buildOrderDetail(order),
  };
}

export function updateOrderStatus(
  tenantId: string,
  orderId: string,
  payload: { status: OrderStatus; paymentStatus?: OrderPaymentStatus; paymentUrl?: string },
) {
  const order = findOrderById(orderId);

  if (!order || order.tenantId !== tenantId) {
    return null;
  }

  order.status = payload.status;
  if (payload.paymentStatus) {
    order.paymentStatus = payload.paymentStatus;
  }
  if (payload.paymentUrl !== undefined) {
    order.paymentUrl = payload.paymentUrl || undefined;
  }
  order.updatedAt = now();

  return buildOrderDetail(order);
}

export function applyPaymentLinkToOrder(
  tenantId: string,
  orderId: string,
  billing: BillingRecord,
) {
  const order = findOrderById(orderId);

  if (!order || order.tenantId !== tenantId) {
    return null;
  }

  order.paymentUrl = billing.paymentUrl;
  order.paymentStatus = billing.chargeStatus === "paid" ? "paid" : "pending";
  order.status = billing.chargeStatus === "paid" ? "paid" : "awaiting_payment";
  order.billingProvider = billing.provider;
  order.billingInvoiceId = billing.invoiceId;
  order.billingChargeId = billing.chargeId;
  order.updatedAt = now();

  return buildOrderDetail(order);
}

export function applyPaymentConfirmationToOrder(
  tenantId: string,
  orderId: string,
  payload: { paymentStatus: BillingWebhookPaymentEvent["status"]; chargeStatus: BillingWebhookPaymentEvent["status"]; paymentUrl?: string },
) {
  const order = findOrderById(orderId);

  if (!order || order.tenantId !== tenantId) {
    return null;
  }

  order.paymentStatus = payload.paymentStatus === "paid" ? "paid" : payload.paymentStatus === "failed" ? "failed" : "processing";

  if (payload.paymentStatus === "paid") {
    order.status = "paid";
  } else if (payload.paymentStatus === "failed") {
    order.status = "awaiting_payment";
  } else {
    order.status = order.status === "paid" ? "paid" : "awaiting_payment";
  }

  if (payload.paymentUrl !== undefined) {
    order.paymentUrl = payload.paymentUrl || undefined;
  }

  order.updatedAt = now();

  return buildOrderDetail(order);
}

export function getOrdersOverview(tenantId: string): OrdersOverview {
  const tenantQuotes = quotes.filter((quote) => quote.tenantId === tenantId);
  const tenantOrders = orders.filter((order) => order.tenantId === tenantId);

  const quoteStatuses: QuoteSummary["status"][] = ["draft", "sent", "approved", "rejected"];
  const orderStatuses: OrderStatus[] = ["draft", "quoted", "awaiting_payment", "paid", "in_production", "ready", "delivered", "canceled"];
  const paymentStatuses: OrderPaymentStatus[] = ["pending", "processing", "paid", "failed"];

  return {
    quoteCounts: quoteStatuses.reduce((acc, status) => {
      acc[status] = tenantQuotes.filter((quote) => quote.status === status).length;
      return acc;
    }, {} as Record<QuoteSummary["status"], number>),
    orderCounts: orderStatuses.reduce((acc, status) => {
      acc[status] = tenantOrders.filter((order) => order.status === status).length;
      return acc;
    }, {} as Record<OrderStatus, number>),
    paymentCounts: paymentStatuses.reduce((acc, status) => {
      acc[status] = tenantOrders.filter((order) => order.paymentStatus === status).length;
      return acc;
    }, {} as Record<OrderPaymentStatus, number>),
    recentQuotes: tenantQuotes
      .map((quote) => buildQuoteSummary(quote))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentOrders: tenantOrders
      .map((order) => buildOrderSummary(order))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    totalQuotedValue: sumTotals(tenantQuotes),
    totalOrderValue: sumTotals(tenantOrders),
  };
}
