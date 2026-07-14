import { useEffect, useState } from "react";
import type {
  OrderDetail,
  OrderStatus,
  OrdersOverview,
  OrderSummary,
  PricePreviewResult,
  QuoteDetail,
  QuoteSummary,
  UpdateOrderStatusRequest,
} from "@print-flow/contracts";

type OrdersPanelProps = {
  tenantName: string;
  customerName?: string;
  customerProfileId?: string;
  overview: OrdersOverview | null;
  quotes: QuoteSummary[];
  orders: OrderSummary[];
  quoteDetail: QuoteDetail | null;
  orderDetail: OrderDetail | null;
  draftItems: PricePreviewResult[];
  busy: boolean;
  onRemoveDraftItem: (index: number) => void;
  onClearDraft: () => void;
  onCreateQuote: (notes: string) => Promise<void>;
  onApproveQuote: (quoteId: string) => Promise<void>;
  onSelectQuote: (quoteId: string) => Promise<void>;
  onSelectOrder: (orderId: string) => Promise<void>;
  onGeneratePaymentLink: (orderId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, payload: UpdateOrderStatusRequest) => Promise<void>;
};

const orderStatuses: OrderStatus[] = ["draft", "quoted", "awaiting_payment", "paid", "in_production", "ready", "delivered", "canceled"];
const paymentStatuses: NonNullable<UpdateOrderStatusRequest["paymentStatus"]>[] = ["pending", "processing", "paid", "failed"];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function sumPreviewTotal(items: PricePreviewResult[]) {
  return items.reduce((sum, item) => sum + item.total, 0);
}

export function OrdersPanel({
  tenantName,
  customerName,
  customerProfileId,
  overview,
  quotes,
  orders,
  quoteDetail,
  orderDetail,
  draftItems,
  busy,
  onRemoveDraftItem,
  onClearDraft,
  onCreateQuote,
  onApproveQuote,
  onSelectQuote,
  onSelectOrder,
  onGeneratePaymentLink,
  onUpdateOrderStatus,
}: OrdersPanelProps) {
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(orderDetail?.status ?? "quoted");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<NonNullable<UpdateOrderStatusRequest["paymentStatus"]>>(orderDetail?.paymentStatus ?? "pending");
  const [paymentUrl, setPaymentUrl] = useState(orderDetail?.paymentUrl ?? "");

  useEffect(() => {
    setSelectedStatus(orderDetail?.status ?? "quoted");
    setSelectedPaymentStatus(orderDetail?.paymentStatus ?? "pending");
    setPaymentUrl(orderDetail?.paymentUrl ?? "");
  }, [orderDetail]);

  const handleCreateQuote = async () => {
    if (!customerProfileId || !draftItems.length) {
      return;
    }

    setUpdating(true);
    try {
      await onCreateQuote(notes);
      setNotes("");
      onClearDraft();
    } catch {
      // O erro ja foi reportado no estado global da tela.
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!orderDetail) {
      return;
    }

    setUpdating(true);
    try {
      await onUpdateOrderStatus(orderDetail.id, {
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
        paymentUrl: paymentUrl.trim() || undefined,
      });
    } catch {
      // O erro ja foi reportado no estado global da tela.
    } finally {
      setUpdating(false);
    }
  };

  const totalDraftValue = sumPreviewTotal(draftItems);

  return (
    <section className="panel panel--stacked orders-panel">
      <div className="section-head section-head--compact">
        <div>
          <p className="card-label">Orçamento e pedido</p>
          <h2>Converter orçamento aprovado em pedido</h2>
          <p>
            O tenant {tenantName} pode consolidar itens, aprovar o orçamento e acompanhar o pedido em uma visão única.
          </p>
        </div>
      </div>

      <div className="stats-grid stats-grid--compact orders-stats">
        <article className="stat-card">
          <span>Orçamentos rascunho</span>
          <strong>{overview?.quoteCounts.draft ?? 0}</strong>
          <p>{overview?.quoteCounts.sent ?? 0} enviados para aprovação</p>
        </article>
        <article className="stat-card">
          <span>Orçamentos aprovados</span>
          <strong>{overview?.quoteCounts.approved ?? 0}</strong>
          <p>Prontos para virar pedido</p>
        </article>
        <article className="stat-card">
          <span>Pedidos em andamento</span>
          <strong>{(overview?.orderCounts.quoted ?? 0) + (overview?.orderCounts.awaiting_payment ?? 0) + (overview?.orderCounts.in_production ?? 0)}</strong>
          <p>Fluxo operacional ativo</p>
        </article>
        <article className="stat-card">
          <span>Total comercial</span>
          <strong>{formatMoney((overview?.totalQuotedValue ?? 0) + (overview?.totalOrderValue ?? 0))}</strong>
          <p>Orçamentos + pedidos do tenant</p>
        </article>
      </div>

      {!customerProfileId ? (
        <div className="empty-state empty-state--compact">
          <h3>Selecione uma conversa</h3>
          <p>O orçamento fica vinculado ao cliente da conversa ativa para manter o contexto comercial.</p>
        </div>
      ) : (
        <div className="orders-layout">
          <div className="orders-column">
            <div className="orders-card">
              <div className="orders-card__head">
                <div>
                  <span>Cliente do orçamento</span>
                  <h3>{customerName ?? "Cliente selecionado"}</h3>
                </div>
                <small>{customerProfileId}</small>
              </div>

              <div className="draft-summary">
                <div>
                  <span>Itens no rascunho</span>
                  <strong>{draftItems.length}</strong>
                </div>
                <div>
                  <span>Total estimado</span>
                  <strong>{formatMoney(totalDraftValue)}</strong>
                </div>
              </div>

              <div className="draft-list">
                {draftItems.length ? (
                  draftItems.map((item, index) => (
                    <article key={`${item.productId}-${item.variantId ?? index}-${index}`} className="draft-item">
                      <div>
                        <span>{item.productName}</span>
                        <p>
                          {item.quantity} un · {item.variantName ?? "Sem variante"}
                        </p>
                      </div>
                      <div className="draft-item__meta">
                        <strong>{formatMoney(item.total)}</strong>
                        <button type="button" className="link-button" onClick={() => onRemoveDraftItem(index)}>
                          Remover
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state empty-state--compact">
                    <h3>Adicione itens</h3>
                    <p>Use o catálogo para enviar produtos para este orçamento.</p>
                  </div>
                )}
              </div>

              <label className="field">
                <span>Observações do orçamento</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Condições comerciais, prazo, detalhes de acabamento"
                  rows={4}
                />
              </label>

              <div className="row-actions">
                <button className="button button--ghost" type="button" onClick={onClearDraft} disabled={!draftItems.length || busy || updating}>
                  Limpar rascunho
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => void handleCreateQuote()}
                  disabled={!draftItems.length || busy || updating}
                >
                  {updating ? "Salvando..." : "Salvar orçamento"}
                </button>
              </div>
            </div>

            <div className="orders-card">
              <div className="orders-card__head">
                <div>
                  <span>Orçamentos recentes</span>
                  <h3>Fila comercial</h3>
                </div>
              </div>

              <div className="record-list">
                {quotes.map((quote) => {
                  const active = quoteDetail?.id === quote.id;
                  return (
                    <button
                      key={quote.id}
                      type="button"
                      className={`record-card ${active ? "record-card--active" : ""}`}
                      onClick={() => void onSelectQuote(quote.id)}
                    >
                      <div>
                        <span>{quote.status}</span>
                        <h4>{quote.customerName}</h4>
                      </div>
                      <p>
                        {quote.itemCount} itens · {formatMoney(quote.total)}
                      </p>
                      <small>{formatDateTime(quote.updatedAt)}</small>
                    </button>
                  );
                })}
              </div>

              {quoteDetail ? (
                <div className="detail-card">
                  <div className="orders-card__head">
                    <div>
                      <span>Detalhe do orçamento</span>
                      <h3>{quoteDetail.customerName}</h3>
                    </div>
                    <small>{quoteDetail.status}</small>
                  </div>

                  <div className="detail-list">
                    {quoteDetail.items.map((item) => (
                      <article key={item.id} className="detail-line">
                        <div>
                          <span>{item.productName}</span>
                          <p>{item.quantity} un · {item.variantName ?? "Sem variante"}</p>
                        </div>
                        <strong>{formatMoney(item.total)}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="row-actions">
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => void onApproveQuote(quoteDetail.id)}
                      disabled={quoteDetail.status === "approved" || busy || updating}
                    >
                      {quoteDetail.status === "approved" ? "Orçamento aprovado" : "Aprovar e gerar pedido"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="orders-column">
            <div className="orders-card">
              <div className="orders-card__head">
                <div>
                  <span>Pedidos recentes</span>
                  <h3>Execução comercial</h3>
                </div>
              </div>

              <div className="record-list">
                {orders.map((order) => {
                  const active = orderDetail?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      className={`record-card ${active ? "record-card--active" : ""}`}
                      onClick={() => void onSelectOrder(order.id)}
                    >
                      <div>
                        <span>{order.status}</span>
                        <h4>{order.customerName}</h4>
                      </div>
                      <p>
                        {order.paymentStatus} · {formatMoney(order.total)}
                      </p>
                      <small>{formatDateTime(order.updatedAt)}</small>
                    </button>
                  );
                })}
              </div>

              {orderDetail ? (
                <div className="detail-card">
                  <div className="orders-card__head">
                    <div>
                      <span>Detalhe do pedido</span>
                      <h3>{orderDetail.customerName}</h3>
                    </div>
                    <small>{orderDetail.status}</small>
                  </div>

                  <div className="detail-list">
                    {orderDetail.paymentUrl ? (
                      <article className="detail-line">
                        <div>
                          <span>Link de pagamento</span>
                          <p>{orderDetail.paymentUrl}</p>
                        </div>
                        <strong>{orderDetail.paymentStatus}</strong>
                      </article>
                    ) : null}
                    {orderDetail.billingInvoiceId ? (
                      <article className="detail-line">
                        <div>
                          <span>Referencia billing</span>
                          <p>{orderDetail.billingInvoiceId} · {orderDetail.billingChargeId ?? "sem charge"}</p>
                        </div>
                        <strong>{orderDetail.billingProvider ?? "mock"}</strong>
                      </article>
                    ) : null}
                    <article className="detail-line">
                      <div>
                        <span>Status financeiro</span>
                        <p>Pedido {orderDetail.status} com financeiro {orderDetail.paymentStatus}</p>
                      </div>
                      <strong>{orderDetail.paymentStatus}</strong>
                    </article>
                    {orderDetail.items.map((item) => (
                      <article key={item.id} className="detail-line">
                        <div>
                          <span>{item.productName}</span>
                          <p>{item.quantity} un · {item.variantName ?? "Sem variante"}</p>
                        </div>
                        <strong>{formatMoney(item.total)}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="billing-timeline">
                    <div className="orders-card__head">
                      <div>
                        <span>Trilha financeira</span>
                        <h3>Eventos do webhook</h3>
                      </div>
                    </div>

                    <div className="timeline-list">
                      {orderDetail.billingEvents.length ? (
                        orderDetail.billingEvents.map((event) => (
                          <article key={event.id} className={`timeline-item ${event.duplicate ? "timeline-item--duplicate" : ""}`}>
                            <div>
                              <span>{event.type}</span>
                              <p>{event.message}</p>
                            </div>
                            <strong>{event.paymentStatus}</strong>
                            <small>{formatDateTime(event.createdAt)}</small>
                          </article>
                        ))
                      ) : (
                        <div className="empty-state empty-state--compact">
                          <h3>Sem eventos financeiros</h3>
                          <p>O webhook ainda nao registrou eventos para este pedido.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="two-column-grid">
                    <label className="field">
                      <span>Status do pedido</span>
                      <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}>
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Status financeiro</span>
                      <select
                        value={selectedPaymentStatus}
                        onChange={(event) =>
                          setSelectedPaymentStatus(event.target.value as NonNullable<UpdateOrderStatusRequest["paymentStatus"]>)
                        }
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Link de pagamento</span>
                    <input value={paymentUrl} onChange={(event) => setPaymentUrl(event.target.value)} placeholder="https://..." />
                  </label>

                  <div className="row-actions">
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => void onGeneratePaymentLink(orderDetail.id)}
                      disabled={busy || updating}
                    >
                      {orderDetail.paymentUrl ? "Regerar link de pagamento" : "Gerar link de pagamento"}
                    </button>
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => void handleUpdateOrder()}
                      disabled={busy || updating}
                    >
                      {updating ? "Atualizando..." : "Atualizar pedido"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


