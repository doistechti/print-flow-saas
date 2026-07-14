import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, requireSession } from "../lib/http.js";
import { confirmPaymentWebhook, createPaymentLinkForOrder } from "../domain/billing.js";

const paymentWebhookSchema = z.object({
  eventId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  externalReference: z.string().min(1).optional(),
  billingRecordId: z.string().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
  chargeId: z.string().min(1).optional(),
  paymentId: z.string().min(1).optional(),
  provider: z.enum(["mock", "external"]).optional(),
  status: z.enum(["pending", "processing", "paid", "failed", "expired"]),
  occurredAt: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function toHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export async function registerBillingRoutes(app: FastifyInstance) {
  app.post("/api/v1/billing/orders/:orderId/payment-link", async (request) => {
    const session = requireSession(request);
    const { orderId } = request.params as { orderId: string };

    try {
      return await createPaymentLinkForOrder(session.tenantId, orderId);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(502, "BILLING_PAYMENT_LINK_FAILED", error instanceof Error ? error.message : "Nao foi possivel gerar o link de pagamento");
    }
  });

  app.post("/api/v1/billing/webhooks/payment", async (request) => {
    const payload = paymentWebhookSchema.parse(request.body);
    const eventId = payload.eventId ?? toHeaderValue(request.headers["x-webhook-event-id"]) ?? toHeaderValue(request.headers["x-payment-event-id"]);

    if (!eventId) {
      throw new ApiError(400, "BILLING_WEBHOOK_INVALID", "Webhook sem identificador de evento");
    }

    try {
      return confirmPaymentWebhook({
        ...payload,
        eventId,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(502, "BILLING_WEBHOOK_FAILED", error instanceof Error ? error.message : "Nao foi possivel processar a confirmacao de pagamento");
    }
  });
}
