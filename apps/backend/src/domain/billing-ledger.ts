import crypto from "node:crypto";
import type { BillingEvent, BillingEventType } from "@print-flow/contracts";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const billingEvents: BillingEvent[] = [];
const processedWebhookEventIds = new Map<string, BillingEvent>();
const processedWebhookChargeIds = new Map<string, BillingEvent>();
const processedWebhookInvoiceIds = new Map<string, BillingEvent>();

export function recordBillingEvent(input: {
  tenantId: string;
  orderId: string;
  billingRecordId?: string;
  providerEventId?: string;
  type: BillingEventType;
  paymentStatus: BillingEvent["paymentStatus"];
  chargeStatus: BillingEvent["chargeStatus"];
  message: string;
  payload?: Record<string, unknown>;
  duplicate?: boolean;
  createdAt?: string;
}) {
  const event: BillingEvent = {
    id: createId("billing_event"),
    tenantId: input.tenantId,
    orderId: input.orderId,
    billingRecordId: input.billingRecordId,
    providerEventId: input.providerEventId,
    type: input.type,
    paymentStatus: input.paymentStatus,
    chargeStatus: input.chargeStatus,
    message: input.message,
    payload: input.payload ?? {},
    duplicate: input.duplicate ?? false,
    createdAt: input.createdAt ?? now(),
  };

  billingEvents.unshift(event);
  return event;
}

export function registerWebhookEventIndex(event: BillingEvent, chargeId?: string, invoiceId?: string) {
  if (event.providerEventId) {
    processedWebhookEventIds.set(event.providerEventId, event);
  }

  if (chargeId) {
    processedWebhookChargeIds.set(chargeId, event);
  }

  if (invoiceId) {
    processedWebhookInvoiceIds.set(invoiceId, event);
  }
}

export function findProcessedWebhookEvent(eventId: string) {
  return processedWebhookEventIds.get(eventId) ?? null;
}

export function findProcessedWebhookCharge(chargeId: string) {
  return processedWebhookChargeIds.get(chargeId) ?? null;
}

export function findProcessedWebhookInvoice(invoiceId: string) {
  return processedWebhookInvoiceIds.get(invoiceId) ?? null;
}

export function listBillingEventsForOrder(tenantId: string, orderId: string) {
  return billingEvents
    .filter((event) => event.tenantId === tenantId && event.orderId === orderId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
