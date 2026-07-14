import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, requireSession } from "../lib/http.js";
import {
  createStockItem,
  getStockOverview,
  listStockItemsForTenant,
  listStockMovementsForTenant,
  recordStockMovement,
  updateStockItem,
} from "../domain/stock.js";

const createStockItemSchema = z.object({
  name: z.string().min(1),
  productId: z.string().min(1).optional(),
  productName: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  unitLabel: z.string().min(1).optional(),
  quantityOnHand: z.number().int().nonnegative(),
  quantityReserved: z.number().int().nonnegative().optional(),
  minimumQuantity: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  note: z.string().min(1).optional(),
});

const updateStockItemSchema = z.object({
  name: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  productName: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  unitLabel: z.string().min(1).optional(),
  quantityOnHand: z.number().int().nonnegative().optional(),
  quantityReserved: z.number().int().nonnegative().optional(),
  minimumQuantity: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

const movementSchema = z.object({
  stockItemId: z.string().min(1),
  type: z.enum(["reserve", "release", "consumption", "adjustment"]),
  quantity: z.number().int().positive(),
  note: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
});

export async function registerStockRoutes(app: FastifyInstance) {
  app.get("/api/v1/stock/overview", async (request) => {
    const session = requireSession(request);
    return getStockOverview(session.tenantId);
  });

  app.get("/api/v1/stock/items", async (request) => {
    const session = requireSession(request);
    return {
      items: listStockItemsForTenant(session.tenantId),
    };
  });

  app.post("/api/v1/stock/items", async (request) => {
    const session = requireSession(request);
    const payload = createStockItemSchema.parse(request.body);

    try {
      return createStockItem(session.tenantId, payload);
    } catch (error) {
      throw new ApiError(
        400,
        "STOCK_ITEM_INVALID",
        error instanceof Error ? error.message : "Nao foi possivel criar o item de estoque",
      );
    }
  });

  app.patch("/api/v1/stock/items/:stockItemId", async (request) => {
    const session = requireSession(request);
    const { stockItemId } = request.params as { stockItemId: string };
    const payload = updateStockItemSchema.parse(request.body);

    try {
      const item = updateStockItem(session.tenantId, stockItemId, payload);
      if (!item) {
        throw new ApiError(404, "STOCK_ITEM_NOT_FOUND", "Item de estoque nao encontrado");
      }
      return item;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        400,
        "STOCK_ITEM_INVALID",
        error instanceof Error ? error.message : "Nao foi possivel atualizar o item de estoque",
      );
    }
  });

  app.get("/api/v1/stock/movements", async (request) => {
    const session = requireSession(request);
    return {
      items: listStockMovementsForTenant(session.tenantId),
    };
  });

  app.post("/api/v1/stock/movements", async (request) => {
    const session = requireSession(request);
    const payload = movementSchema.parse(request.body);

    try {
      const result = recordStockMovement(session.tenantId, payload);
      if (!result) {
        throw new ApiError(404, "STOCK_ITEM_NOT_FOUND", "Item de estoque nao encontrado");
      }

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        400,
        "STOCK_MOVEMENT_INVALID",
        error instanceof Error ? error.message : "Nao foi possivel registrar a movimentacao",
      );
    }
  });
}
