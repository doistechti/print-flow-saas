import type { FastifyInstance } from "fastify";
import { ApiError, requireSession } from "../lib/http.js";
import { getNotificationOverview, listNotificationsForTenant, markNotificationAsRead } from "../domain/notifications.js";
import { listRemarketingOpportunitiesForTenant } from "../domain/remarketing.js";

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/api/v1/notifications/overview", async (request) => {
    const session = requireSession(request);
    const overview = getNotificationOverview(session.tenantId);
    return {
      ...overview,
      remarketingOpportunities: listRemarketingOpportunitiesForTenant(session.tenantId),
    };
  });

  app.get("/api/v1/notifications", async (request) => {
    const session = requireSession(request);
    return {
      items: listNotificationsForTenant(session.tenantId),
    };
  });

  app.patch("/api/v1/notifications/:notificationId/read", async (request) => {
    const session = requireSession(request);
    const { notificationId } = request.params as { notificationId: string };
    const notification = markNotificationAsRead(session.tenantId, notificationId);

    if (!notification) {
      throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notificacao nao encontrada");
    }

    return notification;
  });
}
