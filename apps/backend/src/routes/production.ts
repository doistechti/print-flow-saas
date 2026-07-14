import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, requireSession } from "../lib/http.js";
import {
  addProductionNote,
  getProductionOrderDetail,
  getProductionOverview,
  listProductionStagesForTenant,
  moveProductionOrderStage,
} from "../domain/production.js";

const moveProductionOrderSchema = z.object({
  stageId: z.string().min(1),
  status: z.enum(["queued", "in_progress", "blocked", "ready"]).optional(),
  note: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
});

const addProductionNoteSchema = z.object({
  body: z.string().min(1),
  author: z.string().min(1).optional(),
});

export async function registerProductionRoutes(app: FastifyInstance) {
  app.get("/api/v1/production/overview", async (request) => {
    const session = requireSession(request);
    return getProductionOverview(session.tenantId);
  });

  app.get("/api/v1/production/stages", async (request) => {
    const session = requireSession(request);
    return {
      items: listProductionStagesForTenant(session.tenantId),
    };
  });

  app.get("/api/v1/production/orders", async (request) => {
    const session = requireSession(request);
    return {
      items: getProductionOverview(session.tenantId).orders,
    };
  });

  app.get("/api/v1/production/orders/:orderId", async (request) => {
    const session = requireSession(request);
    const { orderId } = request.params as { orderId: string };
    const detail = getProductionOrderDetail(session.tenantId, orderId);

    if (!detail) {
      throw new ApiError(404, "PRODUCTION_ORDER_NOT_FOUND", "Pedido de producao nao encontrado");
    }

    return detail;
  });

  app.patch("/api/v1/production/orders/:orderId/stage", async (request) => {
    const session = requireSession(request);
    const { orderId } = request.params as { orderId: string };
    const payload = moveProductionOrderSchema.parse(request.body);
    const detail = moveProductionOrderStage(session.tenantId, orderId, payload);

    if (!detail) {
      throw new ApiError(404, "PRODUCTION_ORDER_NOT_FOUND", "Pedido de producao nao encontrado");
    }

    return detail;
  });

  app.post("/api/v1/production/orders/:orderId/notes", async (request) => {
    const session = requireSession(request);
    const { orderId } = request.params as { orderId: string };
    const payload = addProductionNoteSchema.parse(request.body);
    const detail = addProductionNote(session.tenantId, orderId, payload);

    if (!detail) {
      throw new ApiError(404, "PRODUCTION_ORDER_NOT_FOUND", "Pedido de producao nao encontrado");
    }

    return detail;
  });
}