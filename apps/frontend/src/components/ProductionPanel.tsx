import { useEffect, useState } from "react";
import type {
  AddProductionNoteRequest,
  MoveProductionOrderRequest,
  ProductionOrderDetail,
  ProductionOrderStatus,
  ProductionOverview,
  ProductionStage,
} from "@print-flow/contracts";

type ProductionPanelProps = {
  tenantName: string;
  overview: ProductionOverview | null;
  orderDetail: ProductionOrderDetail | null;
  busy: boolean;
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => Promise<void>;
  onMoveOrderStage: (orderId: string, payload: MoveProductionOrderRequest) => Promise<void>;
  onAddOrderNote: (orderId: string, payload: AddProductionNoteRequest) => Promise<void>;
};

const productionStatuses: ProductionOrderStatus[] = ["queued", "in_progress", "blocked", "ready"];

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

function formatRelative(dateTime: string) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(dateTime).getTime()) / 60000));
  if (diffMinutes < 60) {
    return `ha ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `ha ${diffHours} h`;
}

function stageLabel(stage: ProductionStage) {
  return `${stage.orderIndex + 1}. ${stage.name}`;
}

export function ProductionPanel({
  tenantName,
  overview,
  orderDetail,
  busy,
  selectedOrderId,
  onSelectOrder,
  onMoveOrderStage,
  onAddOrderNote,
}: ProductionPanelProps) {
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ProductionOrderStatus>("in_progress");
  const [movementNote, setMovementNote] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("Equipe de producao");
  const [noteBody, setNoteBody] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setSelectedStageId(orderDetail?.currentStageId ?? overview?.stages[0]?.id ?? "");
    setSelectedStatus(orderDetail?.productionStatus ?? "in_progress");
    setMovementNote("");
    setNoteBody("");
  }, [orderDetail, overview?.stages]);

  const stages = orderDetail?.stages ?? overview?.stages ?? [];
  const currentStage = stages.find((stage) => stage.id === orderDetail?.currentStageId) ?? null;

  const handleMoveStage = async () => {
    if (!orderDetail || !selectedStageId) {
      return;
    }

    setUpdating(true);
    try {
      await onMoveOrderStage(orderDetail.orderId, {
        stageId: selectedStageId,
        status: selectedStatus,
        note: movementNote.trim() || undefined,
        author: noteAuthor.trim() || undefined,
      });
      setMovementNote("");
    } catch {
      // O erro ja e tratado no estado global da tela.
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!orderDetail || !noteBody.trim()) {
      return;
    }

    setUpdating(true);
    try {
      await onAddOrderNote(orderDetail.orderId, {
        body: noteBody.trim(),
        author: noteAuthor.trim() || undefined,
      });
      setNoteBody("");
    } catch {
      // O erro ja e tratado no estado global da tela.
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className="panel panel--stacked production-panel">
      <div className="section-head section-head--compact">
        <div>
          <p className="card-label">Producao</p>
          <h2>Operar o ciclo de confecao</h2>
          <p>
            O tenant {tenantName} acompanha a fila produtiva, move pedidos entre etapas e registra observacoes internas
            para evitar perda de contexto no chao de fabrica.
          </p>
        </div>
        <div className="panel-chip">
          <strong>{overview?.orders.length ?? 0}</strong>
          <span>pedidos monitorados</span>
        </div>
      </div>

      <div className="stats-grid stats-grid--compact production-stats">
        <article className="stat-card">
          <span>Em producao</span>
          <strong>{overview?.countsByStatus.in_progress ?? 0}</strong>
          <p>{overview?.readyOrders ?? 0} pedidos prontos para expedicao</p>
        </article>
        <article className="stat-card">
          <span>Atrasados</span>
          <strong>{overview?.overdueOrders ?? 0}</strong>
          <p>{overview?.blockedOrders ?? 0} bloqueados por pendencia interna</p>
        </article>
        <article className="stat-card">
          <span>Etapas ativas</span>
          <strong>{overview?.stages.length ?? 0}</strong>
          <p>Fluxo padrao por tenant e por ordem operacional</p>
        </article>
        <article className="stat-card">
          <span>Prontos</span>
          <strong>{overview?.countsByStatus.ready ?? 0}</strong>
          <p>Pedidos liberados para retirada ou entrega</p>
        </article>
      </div>

      <div className="production-stage-grid">
        {(overview?.stages ?? []).map((stage) => (
          <article key={stage.id} className="production-stage-card">
            <span>{stageLabel(stage)}</span>
            <strong>{overview?.countsByStage[stage.id] ?? 0}</strong>
            <p>{stage.tenantId}</p>
          </article>
        ))}
      </div>

      <div className="production-layout">
        <div className="production-column">
          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Fila de producao</span>
                <h3>Pedidos em acompanhamento</h3>
              </div>
            </div>

            <div className="record-list">
              {(overview?.orders ?? []).map((item) => {
                const active = item.orderId === selectedOrderId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`record-card production-record ${active ? "record-card--active" : ""}`}
                    onClick={() => void onSelectOrder(item.orderId)}
                  >
                    <div>
                      <span>{item.productionStatus}</span>
                      <h4>{item.customerName}</h4>
                    </div>
                    <p>
                      {item.currentStageName} · {item.isOverdue ? "atrasado" : "no prazo"}
                    </p>
                    <small>
                      {formatMoney(item.total)} · entrega prevista {formatDateTime(item.dueAt)}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Etapas configuradas</span>
                <h3>Mapa operacional</h3>
              </div>
            </div>

            <div className="production-matrix">
              {stages.map((stage) => {
                const count = overview?.countsByStage[stage.id] ?? 0;
                const active = stage.id === currentStage?.id;
                return (
                  <article key={stage.id} className={`production-step ${active ? "production-step--active" : ""}`}>
                    <strong>{stage.name}</strong>
                    <p>{count} pedido(s) na etapa</p>
                    <small>Ordem {stage.orderIndex + 1}</small>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="production-column">
          {orderDetail ? (
            <div className="orders-card production-detail-card">
              <div className="orders-card__head">
                <div>
                  <span>Detalhe da producao</span>
                  <h3>{orderDetail.order.customerName}</h3>
                </div>
                <small>{orderDetail.productionStatus}</small>
              </div>

              <div className="production-hero">
                <div>
                  <p className="card-label">Pedido {orderDetail.orderId}</p>
                  <h3>{currentStage?.name ?? "Etapa nao definida"}</h3>
                  <p>
                    Status comercial {orderDetail.orderStatus} e financeiro {orderDetail.paymentStatus}. {orderDetail.isOverdue ? "O prazo venceu e a fila precisa de atencao." : "A janela produtiva esta sob controle."}
                  </p>
                </div>
                <div className="production-meta">
                  <span>Entrega prevista</span>
                  <strong>{formatDateTime(orderDetail.dueAt)}</strong>
                </div>
              </div>

              <div className="detail-list">
                {orderDetail.order.items.map((item) => (
                  <article key={item.id} className="detail-line">
                    <div>
                      <span>{item.productName}</span>
                      <p>
                        {item.quantity} un · {item.variantName ?? "Sem variante"}
                      </p>
                    </div>
                    <strong>{formatMoney(item.total)}</strong>
                  </article>
                ))}
              </div>

              <div className="production-controls">
                <label className="field">
                  <span>Etapa atual</span>
                  <select value={selectedStageId} onChange={(event) => setSelectedStageId(event.target.value)}>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status operacional</span>
                  <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as ProductionOrderStatus)}>
                    {productionStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Observacao da movimentacao</span>
                <textarea
                  value={movementNote}
                  onChange={(event) => setMovementNote(event.target.value)}
                  placeholder="Ex.: arte aprovada, falta insumo, aguardando corte"
                  rows={3}
                />
              </label>

              <label className="field">
                <span>Responsavel</span>
                <input value={noteAuthor} onChange={(event) => setNoteAuthor(event.target.value)} placeholder="Equipe de producao" />
              </label>

              <div className="row-actions">
                <button className="button button--primary" type="button" onClick={() => void handleMoveStage()} disabled={!selectedStageId || busy || updating}>
                  {updating ? "Movendo..." : "Mover etapa"}
                </button>
              </div>

              <div className="production-notes">
                <div className="orders-card__head">
                  <div>
                    <span>Observacoes internas</span>
                    <h3>Historico de fabrica</h3>
                  </div>
                </div>

                <div className="timeline-list">
                  {orderDetail.notes.length ? (
                    orderDetail.notes.map((note) => (
                      <article key={note.id} className="timeline-item">
                        <div>
                          <span>{note.author}</span>
                          <p>{note.body}</p>
                        </div>
                        <small>{formatDateTime(note.createdAt)}</small>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state empty-state--compact">
                      <h3>Sem observacoes</h3>
                      <p>Adicione comentarios internos para documentar pendencias e combinados da producao.</p>
                    </div>
                  )}
                </div>

                <label className="field">
                  <span>Nova observacao</span>
                  <textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Anotar ajuste de arquivo, atraso ou confirmacao de acabamento"
                    rows={4}
                  />
                </label>

                <div className="row-actions">
                  <button className="button button--ghost" type="button" onClick={() => setNoteBody("")} disabled={!noteBody || busy || updating}>
                    Limpar
                  </button>
                  <button className="button button--primary" type="button" onClick={() => void handleAddNote()} disabled={!noteBody.trim() || busy || updating}>
                    {updating ? "Salvando..." : "Salvar observacao"}
                  </button>
                </div>
              </div>

              <div className="production-activity">
                <div className="orders-card__head">
                  <div>
                    <span>Movimentacoes</span>
                    <h3>Trilha de etapa</h3>
                  </div>
                </div>

                <div className="timeline-list">
                  {orderDetail.movements.map((movement) => (
                    <article key={movement.id} className={`timeline-item ${movement.status === "blocked" ? "timeline-item--duplicate" : ""}`}>
                      <div>
                        <span>{movement.status}</span>
                        <p>{movement.note ?? "Movimentacao registrada"}</p>
                      </div>
                      <strong>{stages.find((stage) => stage.id === movement.toStageId)?.name ?? movement.toStageId}</strong>
                      <small>{formatRelative(movement.createdAt)}</small>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>Selecione um pedido</h3>
              <p>Aqui aparecem os detalhes operacionais, as etapas e as observacoes internas da producao.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}