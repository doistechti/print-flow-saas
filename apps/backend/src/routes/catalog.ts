import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, requireSession } from "../lib/http.js";
import { listCatalogOverviewForTenant, previewCatalogPrice } from "../domain/catalog.js";

const previewSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  variantId: z.string().min(1).optional(),
});

export async function registerCatalogRoutes(app: FastifyInstance) {
  app.get("/api/v1/catalog/overview", async (request) => {
    const session = requireSession(request);
    return listCatalogOverviewForTenant(session.tenantId);
  });

  app.post("/api/v1/catalog/preview", async (request) => {
    const session = requireSession(request);
    const payload = previewSchema.parse(request.body);
    const preview = previewCatalogPrice(session.tenantId, payload);

    if (!preview) {
      throw new ApiError(404, "CATALOG_PREVIEW_NOT_FOUND", "Nao foi possivel calcular a precificacao");
    }

    return preview;
  });
}
