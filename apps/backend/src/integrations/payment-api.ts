import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../lib/http.js";
import type {
  BillingCreateChargeRequest,
  BillingCreateChargeResponse,
} from "@print-flow/contracts";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function createMockCharge(request: BillingCreateChargeRequest): BillingCreateChargeResponse {
  const invoiceId = createId("invoice");
  const chargeId = createId("charge");
  const baseUrl = (env.PAYMENT_API_BASE_URL ?? "https://payments.print-flow.local").replace(/\/$/, "");

  return {
    invoiceId,
    chargeId,
    paymentUrl: `${baseUrl}/checkout/${chargeId}?reference=${encodeURIComponent(request.externalReference)}`,
    invoiceStatus: "pending",
    chargeStatus: "pending",
    provider: env.PAYMENT_API_MODE === "http" ? "external" : "mock",
  };
}

function normalizeStatus(value: unknown, fallback: BillingCreateChargeResponse["invoiceStatus"] | BillingCreateChargeResponse["chargeStatus"]) {
  if (
    value === "draft" ||
    value === "pending" ||
    value === "paid" ||
    value === "canceled" ||
    value === "failed" ||
    value === "expired"
  ) {
    return value;
  }

  return fallback;
}

export async function createPaymentCharge(
  request: BillingCreateChargeRequest,
): Promise<BillingCreateChargeResponse> {
  if (env.PAYMENT_API_MODE === "mock" || !env.PAYMENT_API_BASE_URL) {
    return createMockCharge(request);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.PAYMENT_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.PAYMENT_API_BASE_URL.replace(/\/$/, "")}/api/v1/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.PAYMENT_API_TOKEN ? { Authorization: `Bearer ${env.PAYMENT_API_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        tenantId: request.tenantId,
        orderId: request.orderId,
        externalReference: request.externalReference,
        customer: request.customer,
        items: request.items,
        total: request.total,
        currency: request.currency,
        metadata: request.metadata ?? {},
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok || !payload) {
      throw new ApiError(502, "PAYMENT_API_ERROR", "A API de pagamento recusou a criacao da cobranca");
    }

    const invoice = payload.invoice as { id?: unknown; status?: unknown } | undefined;
    const charge = payload.charge as { id?: unknown; paymentUrl?: unknown; status?: unknown } | undefined;

    const invoiceId = String(payload.invoiceId ?? invoice?.id ?? payload.id ?? createId("invoice"));
    const chargeId = String(payload.chargeId ?? charge?.id ?? payload.id ?? createId("charge"));
    const paymentUrl = String(payload.paymentUrl ?? charge?.paymentUrl ?? payload.checkoutUrl ?? payload.url ?? "");

    if (!paymentUrl) {
      throw new ApiError(502, "PAYMENT_API_ERROR", "A API de pagamento nao retornou paymentUrl");
    }

    return {
      invoiceId,
      chargeId,
      paymentUrl,
      invoiceStatus: normalizeStatus(payload.invoiceStatus ?? invoice?.status, "pending") as BillingCreateChargeResponse["invoiceStatus"],
      chargeStatus: normalizeStatus(payload.chargeStatus ?? charge?.status, "pending") as BillingCreateChargeResponse["chargeStatus"],
      provider: "external",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "PAYMENT_API_TIMEOUT", "Tempo limite atingido ao consultar a API de pagamento");
    }

    throw new ApiError(502, "PAYMENT_API_ERROR", error instanceof Error ? error.message : "Falha ao integrar com a API de pagamento");
  } finally {
    clearTimeout(timeout);
  }
}

