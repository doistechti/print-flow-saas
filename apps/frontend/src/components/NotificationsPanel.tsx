import type { NotificationOverview, NotificationStatus, RemarketingOpportunity } from "@print-flow/contracts";

type NotificationsPanelProps = {
  tenantName: string;
  overview: NotificationOverview | null;
  busy: boolean;
  onMarkRead: (notificationId: string) => Promise<void>;
};

function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function formatRelative(dateTime?: string) {
  if (!dateTime) {
    return "Sem data";
  }

  const minutes = Math.max(1, Math.round((Date.now() - new Date(dateTime).getTime()) / 60000));
  if (minutes < 60) {
    return `ha ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  return `ha ${hours} h`;
}

function statusLabel(status: NotificationStatus) {
  return {
    queued: "Na fila",
    sent: "Enviada",
    failed: "Falhou",
    read: "Lida",
  }[status];
}

function priorityClass(priority: RemarketingOpportunity["priority"]) {
  return {
    high: "remarketing-priority--high",
    medium: "remarketing-priority--medium",
    low: "remarketing-priority--low",
  }[priority];
}

export function NotificationsPanel({ tenantName, overview, busy, onMarkRead }: NotificationsPanelProps) {
  const summary = overview?.summary;
  const recent = overview?.recent ?? [];
  const automationRules = overview?.automationRules ?? [];
  const opportunities = overview?.remarketingOpportunities ?? [];

  return (
    <section className="panel panel--stacked notifications-panel">
      <div className="section-head section-head--compact">
        <div>
          <p className="card-label">Notificacoes e remarketing</p>
          <h2>Automatizar comunicacao com o cliente</h2>
          <p>
            O tenant {tenantName} acompanha avisos internos, lembretes de pagamento e oportunidades de reengajamento
            sem depender de operacao manual o tempo todo.
          </p>
        </div>
        <div className="panel-chip">
          <strong>{summary?.unread ?? 0}</strong>
          <span>nao lidas</span>
        </div>
      </div>

      <div className="stats-grid stats-grid--compact notifications-stats">
        <article className="stat-card">
          <span>Total</span>
          <strong>{summary?.total ?? 0}</strong>
          <p>Eventos rastreados no tenant</p>
        </article>
        <article className="stat-card">
          <span>Enviadas</span>
          <strong>{summary?.sent ?? 0}</strong>
          <p>Comunicacoes disparadas com sucesso</p>
        </article>
        <article className="stat-card">
          <span>Remarketing</span>
          <strong>{summary?.byKind.remarketing ?? 0}</strong>
          <p>Lembretes e reengajamentos registrados</p>
        </article>
        <article className="stat-card">
          <span>Fila</span>
          <strong>{summary?.queued ?? 0}</strong>
          <p>Aguardando disparo ou agenda</p>
        </article>
      </div>

      <div className="notifications-layout">
        <div className="notifications-column">
          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Caixa de entrada</span>
                <h3>Eventos recentes</h3>
              </div>
            </div>

            <div className="timeline-list">
              {recent.length ? (
                recent.map((notification) => (
                  <article key={notification.id} className={`timeline-item notification-item notification-item--${notification.status}`}>
                    <div>
                      <span>{notification.kind}</span>
                      <p>{notification.title}</p>
                    </div>
                    <strong>{statusLabel(notification.status)}</strong>
                    <small>{formatDateTime(notification.createdAt)}</small>
                    <p>{notification.body}</p>
                    <div className="notification-meta">
                      <small>{notification.channel}</small>
                      {notification.actionLabel ? <small>{notification.actionLabel}</small> : null}
                    </div>
                    {notification.status !== "read" ? (
                      <button className="button button--ghost notification-read-button" type="button" onClick={() => void onMarkRead(notification.id)} disabled={busy}>
                        Marcar como lida
                      </button>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty-state empty-state--compact">
                  <h3>Sem notificacoes</h3>
                  <p>Os eventos de pedido, pagamento e producao aparecem aqui assim que o fluxo avanca.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="notifications-column">
          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Automações</span>
                <h3>Regras ativas</h3>
              </div>
            </div>

            <div className="timeline-list">
              {automationRules.length ? (
                automationRules.map((rule) => (
                  <article key={rule.id} className="timeline-item automation-rule-item">
                    <div>
                      <span>{rule.segment}</span>
                      <p>{rule.name}</p>
                    </div>
                    <strong>{rule.channel}</strong>
                    <small>
                      {rule.trigger} · {rule.delayMinutes} min
                    </small>
                    <p>{rule.description}</p>
                  </article>
                ))
              ) : (
                <div className="empty-state empty-state--compact">
                  <h3>Sem regras</h3>
                  <p>As regras iniciais de remarketing e notificacao aparecem aqui por tenant.</p>
                </div>
              )}
            </div>
          </div>

          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Remarketing inicial</span>
                <h3>Oportunidades priorizadas</h3>
              </div>
            </div>

            <div className="timeline-list">
              {opportunities.length ? (
                opportunities.map((opportunity) => (
                  <article key={opportunity.id} className={`timeline-item remarketing-item ${priorityClass(opportunity.priority)}`}>
                    <div>
                      <span>{opportunity.channel}</span>
                      <p>{opportunity.title}</p>
                    </div>
                    <strong>{opportunity.customerName}</strong>
                    <small>
                      {opportunity.reason} · {formatRelative(opportunity.dueAt)}
                    </small>
                    <p>{opportunity.suggestedAction}</p>
                  </article>
                ))
              ) : (
                <div className="empty-state empty-state--compact">
                  <h3>Sem oportunidades</h3>
                  <p>Quando o cliente ficar parado em orçamento, pagamento ou conversa, o sistema sugere o próximo passo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
