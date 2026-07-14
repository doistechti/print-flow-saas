import fastify from "fastify";
import cors from "@fastify/cors";
import { ApiError } from "./lib/http.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerCatalogRoutes } from "./routes/catalog.js";
import { registerCrmRoutes } from "./routes/crm.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMetaRoutes } from "./routes/meta.js";
import { registerOrderRoutes } from "./routes/orders.js";
import { registerTenantRoutes } from "./routes/tenants.js";

export async function buildApp() {
  const app = fastify({
    logger: true,
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send(error.toResponse());
    }

    request.log.error(error);
    return reply.status(500).send({
      message: "Erro interno inesperado",
      code: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
    });
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(registerHealthRoutes);
  await app.register(registerMetaRoutes);
  await app.register(registerAuthRoutes);
  await app.register(registerTenantRoutes);
  await app.register(registerBillingRoutes);
  await app.register(registerCrmRoutes);
  await app.register(registerCatalogRoutes);
  await app.register(registerOrderRoutes);

  app.get("/api/v1", async () => ({
    name: "print-flow-saas-backend",
    modules: ["health", "meta", "auth", "tenants", "billing", "crm", "catalog", "orders"],
  }));

  return app;
}


