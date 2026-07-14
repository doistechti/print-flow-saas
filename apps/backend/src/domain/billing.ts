import crypto from "node:crypto";
import type {
  BillingEvent,
  BillingRecord,
  BillingWebhookPaymentEvent,
  BillingWebhookPaymentResponse,
  CreatePaymentLinkResponse,
} from "@print-flow/contracts";
import { ApiError } from "../lib/http.js";
import { createPaymentCharge } from "../integrations/payment-api.js";
import { recordBillingEvent } from "./billing-ledger.js";
import { applyPaymentConfirmationToOrder, applyPaymentLinkToOrder, getOrderDetail } from "./orders.js";

const billingRecords = new Map<string, BillingRecord>();
const processedWebhookEvents = new Map<string, BillingEvent>();

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function buildBillingRecord(tenantId: string, orderId: string, result: Awaited<ReturnType<typeof createPaymentCharge>>): BillingRecord {
  const timestamp = now();
  return {
    id: createId("billing"),
    tenantId,
    orderId,
    externalReference: orderId,
    invoiceId: result.invoiceId,
    chargeId: result.chargeId,
    paymentUrl: result.paymentUrl,
    invoiceStatus: result.invoiceStatus,
    chargeStatus: result.chargeStatus,
    provider: result.provider,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function resolveBillingRecordByWebhook(payload: BillingWebhookPaymentEvent) {
  if (payload.orderId) {
    const direct = billingRecords.get(payload.orderId);
    if (direct) {
      return direct;
    }
  }

  for (const record of billingRecords.values()) {
    if (payload.invoiceId && record.invoiceId === payload.invoiceId) {
      return record;
    }

    if (payload.chargeId && record.chargeId === payload.chargeId) {
      return record;
    }

    if (payload.externalReference && record.externalReference === payload.externalReference) {
      return record;
    }
  }

  return null;
}

function resolveWebhookStatus(status: BillingWebhookPaymentEvent["status"]) {
  if (status === "paid") {
    return {
      type: "payment_confirmed" as const,
      paymentStatus: "paid" as const,
      eventChargeStatus: "paid" as const,
      recordChargeStatus: "paid" as const,
      invoiceStatus: "paid" as const,
      message: "Pagamento confirmado pelo webhook",
    };
  }

  if (status === "failed" || status === "expired") {
    return {
      type: "payment_failed" as const,
      paymentStatus: "failed" as const,
      eventChargeStatus: status,
      recordChargeStatus: status,
      invoiceStatus: "canceled" as const,
      message: "Pagamento marcado como indisponivel pelo webhook",
    };
  }

  return {
    type: "payment_webhook_received" as const,
    paymentStatus: "processing" as const,
    eventChargeStatus: "processing" as const,
    recordChargeStatus: "pending" as const,
    invoiceStatus: "pending" as const,
    message: "Webhook de pagamento recebido e aguardando confirmacao",
  };
}

function markBillingRecordStatus(record: BillingRecord, status: ReturnType<typeof resolveWebhookStatus>) {
  record.chargeStatus = status.recordChargeStatus;
  record.invoiceStatus = status.invoiceStatus;
  record.updatedAt = now();
}

function registerProcessedWebhook(event: BillingEvent) {
  if (event.providerEventId) {
    processedWebhookEvents.set(event.providerEventId, event);
  }
}

export function getBillingRecordByOrderId(tenantId: string, orderId: string) {
  const record = billingRecords.get(orderId);

  if (!record || record.tenantId !== tenantId) {
    return null;
  }

  return record;
}

export async function createPaymentLinkForOrder(tenantId: string, orderId: string): Promise<CreatePaymentLinkResponse> {
  const order = getOrderDetail(tenantId, orderId);

  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
  }

  const existing = getBillingRecordByOrderId(tenantId, orderId);
  if (existing) {
    const currentOrder = applyPaymentLinkToOrder(tenantId, orderId, existing);
    if (!currentOrder) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
    }

    return {
      billing: existing,
      order: currentOrder,
    };
  }

  const paymentCharge = await createPaymentCharge({
    tenantId,
    orderId,
    externalReference: orderId,
    customer: {
      name: order.customerProfile.name,
      email: order.customerProfile.email,
      phone: order.customerProfile.phone,
      document: order.customerProfile.document,
    },
    items: order.items.map((item) => ({
      description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    total: order.total,
    currency: "BRL",
    metadata: {
      tenantId,
      orderId,
      quoteId: order.quoteId ?? "",
      source: "print-flow-saas",
    },
  });

  const billing = buildBillingRecord(tenantId, orderId, paymentCharge);
  billingRecords.set(orderId, billing);
  recordBillingEvent({
    tenantId,
    orderId,
    billingRecordId: billing.id,
    providerEventId: billing.chargeId,
    type: "payment_link_created",
    paymentStatus: billing.chargeStatus === "paid" ? "paid" : "pending",
    chargeStatus: billing.chargeStatus,
    message: "Link de pagamento criado",
    payload: {
      invoiceId: billing.invoiceId,
      chargeId: billing.chargeId,
      paymentUrl: billing.paymentUrl,
      provider: billing.provider,
    },
  });

  const updatedOrder = applyPaymentLinkToOrder(tenantId, orderId, billing);
  if (!updatedOrder) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
  }

  return {
    billing,
    order: updatedOrder,
  };
}

export function confirmPaymentWebhook(payload: BillingWebhookPaymentEvent): BillingWebhookPaymentResponse {
  const billingRecord = resolveBillingRecordByWebhook(payload);
  const tenantId = payload.tenantId ?? billingRecord?.tenantId;
  const orderId = payload.orderId ?? payload.externalReference ?? billingRecord?.orderId ?? billingRecord?.externalReference;

  if (!tenantId || !orderId) {
    throw new ApiError(400, "BILLING_WEBHOOK_INVALID", "Nao foi possivel identificar o pedido da confirmacao");
  }

  const duplicateEvent = payload.eventId ? processedWebhookEvents.get(payload.eventId) : null;
  const duplicateSource = duplicateEvent;

  if (duplicateSource) {
    const event = recordBillingEvent({
      tenantId,
      orderId,
      billingRecordId: billingRecord?.id,
      providerEventId: payload.eventId,
      type: "payment_duplicate",
      paymentStatus: duplicateSource.paymentStatus,
      chargeStatus: duplicateSource.chargeStatus,
      message: `Evento repetido ignorado: ${payload.eventId}`,
      payload: {
        ...payload.payload,
        status: payload.status,
        duplicateOf: duplicateSource.id,
      },
      duplicate: true,
      createdAt: payload.receivedAt ?? payload.occurredAt,
    });

    const currentOrder = getOrderDetail(tenantId, orderId);
    if (!currentOrder) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
    }

    return {
      event,
      order: currentOrder,
      duplicate: true,
    };
  }

  const resolved = resolveWebhookStatus(payload.status);
  const event = recordBillingEvent({
    tenantId,
    orderId,
    billingRecordId: billingRecord?.id,
    providerEventId: payload.eventId,
    type: resolved.type,
    paymentStatus: resolved.paymentStatus,
    chargeStatus: resolved.eventChargeStatus,
    message: resolved.message,
    payload: {
      ...payload.payload,
      provider: payload.provider,
      status: payload.status,
      chargeId: payload.chargeId,
      invoiceId: payload.invoiceId,
      paymentId: payload.paymentId,
      metadata: payload.metadata,
    },
    createdAt: payload.receivedAt ?? payload.occurredAt,
  });

  registerProcessedWebhook(event);

  if (billingRecord) {
    markBillingRecordStatus(billingRecord, resolved);
  }

  const order = applyPaymentConfirmationToOrder(tenantId, orderId, {
    paymentStatus: resolved.paymentStatus,
    chargeStatus: resolved.eventChargeStatus,
    paymentUrl: billingRecord?.paymentUrl,
  });

  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
  }

  return {
    event,
    order,
    duplicate: false,
  };
}



