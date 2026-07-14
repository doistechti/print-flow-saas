import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, requireSession } from "../lib/http.js";
import {
  approveQuote,
  createQuote,
  getOrderDetail,
  getOrdersOverview,
  getQuoteDetail,
  listOrdersForTenant,
  listQuotesForTenant,
  updateOrderStatus,
} from "../domain/orders.js";

const createQuoteSchema = z.object({
  customerProfileId: z.string().min(1),
  notes: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["draft", "quoted", "awaiting_payment", "paid", "in_production", "ready", "delivered", "canceled"]),
  paymentStatus: z.enum(["pending", "processing", "paid", "failed"]).optional(),
  paymentUrl: z.string().url().optional().or(z.literal("")),
});

export async function registerOrderRoutes(app: FastifyInstance) {
  app.get("/api/v1/orders/overview", async (request) => {
    const session = requireSession(request);
    return getOrdersOverview(session.tenantId);
  });

  app.get("/api/v1/orders/quotes", async (request) => {
    const session = requireSession(request);
    return {
      items: listQuotesForTenant(session.tenantId),
    };
  });

  app.post("/api/v1/orders/quotes", async (request) => {
    const session = requireSession(request);
    const payload = createQuoteSchema.parse(request.body);

    try {
      return createQuote(session.tenantId, payload);
    } catch (error) {
      throw new ApiError(
        400,
        "ORDER_QUOTE_INVALID",
        error instanceof Error ? error.message : "Nao foi possivel montar o orcamento",
      );
    }
  });

  app.get("/api/v1/orders/quotes/:quoteId", async (request) => {
    const session = requireSession(request);
    const { quoteId } = request.params as { quoteId: string };
    const quote = getQuoteDetail(session.tenantId, quoteId);

    if (!quote) {
      throw new ApiError(404, "ORDER_QUOTE_NOT_FOUND", "Orcamento nao encontrado");
    }

    return quote;
  });

  app.post("/api/v1/orders/quotes/:quoteId/approve", async (request) => {
    const session = requireSession(request);
    const { quoteId } = request.params as { quoteId: string };

    try {
      return approveQuote(session.tenantId, quoteId);
    } catch (error) {
      throw new ApiError(
        404,
        "ORDER_QUOTE_NOT_FOUND",
        error instanceof Error ? error.message : "Nao foi possivel aprovar o orcamento",
      );
    }
  });

  app.get("/api/v1/orders/orders", async (request) => {
    const session = requireSession(request);
    return {
      items: listOrdersForTenant(session.tenantId),
    };
  });

  app.get("/api/v1/orders/orders/:orderId", async (request) => {
    const session = requireSession(request);
    const { orderId } = request.params as { orderId: string };
    const order = getOrderDetail(session.tenantId, orderId);

    if (!order) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
    }

    return order;
  });

  app.patch("/api/v1/orders/:orderId/status", async (request) => {
    const session = requireSession(request);
    const { orderId } = request.params as { orderId: string };
    const payload = updateOrderStatusSchema.parse(request.body);
    const order = updateOrderStatus(session.tenantId, orderId, payload);

    if (!order) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
    }

    return order;
  });
}
