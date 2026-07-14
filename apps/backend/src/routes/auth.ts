import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { ApiError, requireSession } from "../lib/http.js";
import { createSessionToken } from "../lib/session.js";
import {
  buildAuthSession,
  findMembership,
  findTenantById,
  findTenantBySlug,
  findUserByEmail,
  findUserById,
  getDefaultMembership,
  verifyPassword,
} from "../domain/store.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1).optional(),
});

const switchTenantSchema = z.object({
  tenantSlug: z.string().min(1),
});

function buildSessionResponse(userId: string, tenantId: string) {
  const user = findUserById(userId);
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Usuario nao encontrado");
  }

  const tenant = findTenantById(tenantId);
  if (!tenant) {
    throw new ApiError(404, "TENANT_NOT_FOUND", "Tenant nao encontrado");
  }

  const membership = findMembership(user.id, tenant.id);
  if (!membership) {
    throw new ApiError(403, "TENANT_FORBIDDEN", "Usuario nao tem acesso a este tenant");
  }

  const session = buildAuthSession(user, tenant, membership);
  const tokenPayload = {
    sub: user.id,
    tenantId: tenant.id,
    membershipId: membership.id,
    roleId: membership.roleId,
    email: user.email,
    issuedAt: new Date().toISOString(),
    expiresAt: session.expiresAt,
  };

  return {
    ...session,
    accessToken: createSessionToken(tokenPayload),
  };
}

function resolveActiveTenantId(userId: string, tenantSlug?: string) {
  if (tenantSlug) {
    const tenant = findTenantBySlug(tenantSlug);
    if (!tenant) {
      throw new ApiError(404, "TENANT_NOT_FOUND", "Tenant nao encontrado");
    }

    return tenant.id;
  }

  const defaultMembership = getDefaultMembership(userId);
  if (!defaultMembership) {
    throw new ApiError(404, "TENANT_NOT_FOUND", "Usuario nao possui tenant ativo");
  }

  return defaultMembership.tenantId;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/login", async (request) => {
    const { email, password, tenantSlug } = loginSchema.parse(request.body);
    const user = findUserByEmail(email);

    if (!user || !verifyPassword(user.email, password)) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Credenciais invalidas");
    }

    const tenantId = resolveActiveTenantId(user.id, tenantSlug);
    return buildSessionResponse(user.id, tenantId);
  });

  app.get("/api/v1/auth/me", async (request) => {
    const session = requireSession(request);
    return buildSessionResponse(session.sub, session.tenantId);
  });

  app.post("/api/v1/auth/switch-tenant", async (request) => {
    const session = requireSession(request);
    const { tenantSlug } = switchTenantSchema.parse(request.body);
    const tenant = findTenantBySlug(tenantSlug);

    if (!tenant) {
      throw new ApiError(404, "TENANT_NOT_FOUND", "Tenant nao encontrado");
    }

    return buildSessionResponse(session.sub, tenant.id);
  });
}

