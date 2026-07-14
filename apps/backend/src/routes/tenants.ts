import type { FastifyInstance } from "fastify";
import { ApiError, requireSession } from "../lib/http.js";
import { findTenantById, findTenantBySlug, listTenantsForUser, toTenantSummary } from "../domain/store.js";

export async function registerTenantRoutes(app: FastifyInstance) {
  app.get("/api/v1/tenants", async (request) => {
    const session = requireSession(request);
    const currentTenant = findTenantById(session.tenantId);

    if (!currentTenant) {
      throw new ApiError(404, "TENANT_NOT_FOUND", "Tenant atual nao encontrado");
    }

    return {
      currentTenant: toTenantSummary(currentTenant),
      availableTenants: listTenantsForUser(session.sub).map(toTenantSummary),
    };
  });

  app.get("/api/v1/tenants/:slug", async (request) => {
    const session = requireSession(request);
    const slug = (request.params as { slug: string }).slug;
    const tenant = findTenantBySlug(slug);

    if (!tenant) {
      throw new ApiError(404, "TENANT_NOT_FOUND", "Tenant nao encontrado");
    }

    const accessibleTenantIds = listTenantsForUser(session.sub).map((item) => item.id);
    if (!accessibleTenantIds.includes(tenant.id)) {
      throw new ApiError(403, "TENANT_FORBIDDEN", "Tenant nao acessivel para este usuario");
    }

    return toTenantSummary(tenant);
  });
}
