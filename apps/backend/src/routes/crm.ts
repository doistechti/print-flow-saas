import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, requireSession } from "../lib/http.js";
import {
  appendConversationMessage,
  createConversation,
  createLead,
  getConversationDetail,
  getCrmOverview,
  listConversationsForTenant,
  listLeadsForTenant,
} from "../domain/store.js";

const leadSchema = z.object({
  customerName: z.string().min(1),
  source: z.enum(["whatsapp", "manual", "web"]).optional(),
  stage: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  document: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

const conversationSchema = z.object({
  customerProfileId: z.string().min(1).optional(),
  leadId: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  initialMessage: z.string().min(1).optional(),
});

const messageSchema = z.object({
  body: z.string().min(1),
  authorType: z.enum(["customer", "operator", "system", "bot"]).optional(),
});

export async function registerCrmRoutes(app: FastifyInstance) {
  app.get("/api/v1/crm/overview", async (request) => {
    const session = requireSession(request);
    return getCrmOverview(session.tenantId);
  });

  app.get("/api/v1/crm/leads", async (request) => {
    const session = requireSession(request);
    return {
      items: listLeadsForTenant(session.tenantId),
    };
  });

  app.post("/api/v1/crm/leads", async (request) => {
    const session = requireSession(request);
    const payload = leadSchema.parse(request.body);
    return createLead(session.tenantId, payload);
  });

  app.get("/api/v1/crm/conversations", async (request) => {
    const session = requireSession(request);
    return {
      items: listConversationsForTenant(session.tenantId),
    };
  });

  app.post("/api/v1/crm/conversations", async (request) => {
    const session = requireSession(request);
    const payload = conversationSchema.parse(request.body);

    try {
      return createConversation(session.tenantId, payload);
    } catch (error) {
      throw new ApiError(
        400,
        "CRM_CONVERSATION_INVALID",
        error instanceof Error ? error.message : "Nao foi possivel criar a conversa",
      );
    }
  });

  app.get("/api/v1/crm/conversations/:conversationId", async (request) => {
    const session = requireSession(request);
    const { conversationId } = request.params as { conversationId: string };
    const conversation = getConversationDetail(session.tenantId, conversationId);

    if (!conversation) {
      throw new ApiError(404, "CRM_CONVERSATION_NOT_FOUND", "Conversa nao encontrada");
    }

    return conversation;
  });

  app.post("/api/v1/crm/conversations/:conversationId/messages", async (request) => {
    const session = requireSession(request);
    const { conversationId } = request.params as { conversationId: string };
    const payload = messageSchema.parse(request.body);
    const conversation = appendConversationMessage(session.tenantId, conversationId, payload);

    if (!conversation) {
      throw new ApiError(404, "CRM_CONVERSATION_NOT_FOUND", "Conversa nao encontrada");
    }

    return conversation;
  });
}
