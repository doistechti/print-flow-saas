import { useEffect, useState, type FormEvent } from "react";
import type {
  CreateStockItemRequest,
  RecordStockMovementRequest,
  StockItem,
  StockMovementType,
  StockOverview,
} from "@print-flow/contracts";

type StockPanelProps = {
  tenantName: string;
  overview: StockOverview | null;
  busy: boolean;
  onCreateItem: (payload: CreateStockItemRequest) => Promise<void>;
  onRecordMovement: (payload: RecordStockMovementRequest) => Promise<void>;
};

const movementTypes: Exclude<StockMovementType, "opening">[] = ["reserve", "release", "consumption", "adjustment"];

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function getAvailableQuantity(item: StockItem) {
  return item.quantityOnHand - item.quantityReserved;
}

export function StockPanel({ tenantName, overview, busy, onCreateItem, onRecordMovement }: StockPanelProps) {
  const [selectedStockItemId, setSelectedStockItemId] = useState("");
  const [movementType, setMovementType] = useState<Exclude<StockMovementType, "opening">>("reserve");
  const [movementQuantity, setMovementQuantity] = useState(100);
  const [movementNote, setMovementNote] = useState("");
  const [movementOrderId, setMovementOrderId] = useState("");
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(false);
  const [itemName, setItemName] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [unitLabel, setUnitLabel] = useState("unidade");
  const [quantityOnHand, setQuantityOnHand] = useState(1000);
  const [minimumQuantity, setMinimumQuantity] = useState(180);
  const [createNote, setCreateNote] = useState("");

  const items = overview?.items ?? [];
  const movements = overview?.movements ?? [];
  const selectedItem = items.find((item) => item.id === selectedStockItemId) ?? items[0] ?? null;

  useEffect(() => {
    if (!items.length) {
      setSelectedStockItemId("");
      return;
    }

    setSelectedStockItemId((current) => (items.some((item) => item.id === current) ? current : items[0].id));
  }, [items]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    setItemName(selectedItem.name);
    setProductId(selectedItem.productId ?? "");
    setProductName(selectedItem.productName ?? selectedItem.name);
    setSku(selectedItem.sku ?? "");
    setUnitLabel(selectedItem.unitLabel ?? "unidade");
    setQuantityOnHand(selectedItem.quantityOnHand);
    setMinimumQuantity(selectedItem.minimumQuantity ?? 0);
  }, [selectedItem]);

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);

    try {
      await onCreateItem({
        name: itemName,
        productId: productId.trim() || undefined,
        productName: productName.trim() || undefined,
        sku: sku.trim() || undefined,
        unitLabel: unitLabel.trim() || undefined,
        quantityOnHand,
        minimumQuantity: minimumQuantity || undefined,
        note: createNote.trim() || undefined,
      });
      setCreateNote("");
    } finally {
      setCreating(false);
    }
  };

  const handleRecordMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem) {
      return;
    }

    setMoving(true);
    try {
      await onRecordMovement({
        stockItemId: selectedItem.id,
        type: movementType,
        quantity: movementQuantity,
        note: movementNote.trim() || undefined,
        orderId: movementOrderId.trim() || undefined,
      });
      setMovementNote("");
      setMovementOrderId("");
    } finally {
      setMoving(false);
    }
  };

  return (
    <section className="panel panel--stacked stock-panel">
      <div className="section-head section-head--compact">
        <div>
          <p className="card-label">Estoque</p>
          <h2>Saldo, reserva e baixa operacional</h2>
          <p>
            O tenant {tenantName} acompanha saldo por item, reserva automática na aprovação do pedido e baixa quando a
            produção inicia.
          </p>
        </div>
        <div className="panel-chip">
          <strong>{overview?.summary.totalAvailable ?? 0}</strong>
          <span>unidades disponíveis</span>
        </div>
      </div>

      <div className="stats-grid stats-grid--compact stock-stats">
        <article className="stat-card">
          <span>Itens ativos</span>
          <strong>{overview?.summary.activeItems ?? 0}</strong>
          <p>{overview?.summary.totalItems ?? 0} itens cadastrados</p>
        </article>
        <article className="stat-card">
          <span>Reservados</span>
          <strong>{overview?.summary.totalReserved ?? 0}</strong>
          <p>Pedido aprovado já separado</p>
        </article>
        <article className="stat-card">
          <span>Baixo estoque</span>
          <strong>{overview?.summary.lowStockItems ?? 0}</strong>
          <p>Itens abaixo do mínimo configurado</p>
        </article>
        <article className="stat-card">
          <span>Saldo em mão</span>
          <strong>{overview?.summary.totalOnHand ?? 0}</strong>
          <p>Volume físico controlado no tenant</p>
        </article>
      </div>

      <div className="stock-layout">
        <div className="stock-column">
          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Itens de estoque</span>
                <h3>Saldo por produto</h3>
              </div>
            </div>

            <div className="record-list">
              {items.length ? (
                items.map((item) => {
                  const active = item.id === selectedStockItemId;
                  const available = getAvailableQuantity(item);
                  const lowStock = item.active && item.minimumQuantity !== undefined && available <= item.minimumQuantity;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`record-card ${active ? "record-card--active" : ""}`}
                      onClick={() => setSelectedStockItemId(item.id)}
                    >
                      <div>
                        <span>{item.active ? "Ativo" : "Inativo"}</span>
                        <h4>{item.name}</h4>
                      </div>
                      <p>
                        Disponível {formatQuantity(available)} · reservado {formatQuantity(item.quantityReserved)}
                      </p>
                      <small className={lowStock ? "stock-warning" : ""}>
                        Mínimo {formatQuantity(item.minimumQuantity ?? 0)} · {item.unitLabel ?? "unidade"}
                      </small>
                    </button>
                  );
                })
              ) : (
                <div className="empty-state empty-state--compact">
                  <h3>Cadastre o primeiro item</h3>
                  <p>Use o formulário ao lado para criar o saldo inicial do estoque.</p>
                </div>
              )}
            </div>
          </div>

          <div className="orders-card">
            <div className="orders-card__head">
              <div>
                <span>Movimentações recentes</span>
                <h3>Trilha operacional</h3>
              </div>
            </div>

            <div className="timeline-list">
              {movements.length ? (
                movements.map((movement) => (
                  <article key={movement.id} className={`timeline-item timeline-item--stock ${movement.type === "consumption" ? "timeline-item--duplicate" : ""}`}>
                    <div>
                      <span>{movement.type}</span>
                      <p>{movement.productName ?? movement.stockItemId}</p>
                    </div>
                    <strong>
                      {formatQuantity(movement.quantity)} · em mão {formatQuantity(movement.onHandAfter)} · reservado {formatQuantity(movement.reservedAfter)}
                    </strong>
                    <small>{formatDateTime(movement.createdAt)}</small>
                  </article>
                ))
              ) : (
                <div className="empty-state empty-state--compact">
                  <h3>Sem movimentações</h3>
                  <p>As reservas e baixas automáticas aparecem aqui quando o fluxo comercial avança.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="stock-column">
          <form className="orders-card stock-form" onSubmit={handleCreateItem}>
            <div className="orders-card__head">
              <div>
                <span>Cadastrar item</span>
                <h3>Novo saldo inicial</h3>
              </div>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Nome</span>
                <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Chapa couché 300g" />
              </label>
              <label className="field">
                <span>Produto vinculado</span>
                <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Cartão de visita premium" />
              </label>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Product ID</span>
                <input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="tenant_produto" />
              </label>
              <label className="field">
                <span>SKU</span>
                <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="SKU-001" />
              </label>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Saldo em mão</span>
                <input type="number" min={0} value={quantityOnHand} onChange={(event) => setQuantityOnHand(Number(event.target.value))} />
              </label>
              <label className="field">
                <span>Mínimo</span>
                <input type="number" min={0} value={minimumQuantity} onChange={(event) => setMinimumQuantity(Number(event.target.value))} />
              </label>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Unidade</span>
                <input value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)} placeholder="milheiro" />
              </label>
              <label className="field">
                <span>Nota inicial</span>
                <input value={createNote} onChange={(event) => setCreateNote(event.target.value)} placeholder="Compra inicial do lote" />
              </label>
            </div>

            <button className="button button--primary" type="submit" disabled={busy || creating}>
              {creating ? "Criando..." : "Criar item"}
            </button>
          </form>

          <form className="orders-card stock-form" onSubmit={handleRecordMovement}>
            <div className="orders-card__head">
              <div>
                <span>Movimentar saldo</span>
                <h3>Reserva, baixa ou ajuste</h3>
              </div>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Item selecionado</span>
                <select value={selectedStockItemId} onChange={(event) => setSelectedStockItemId(event.target.value)} disabled={!items.length}>
                  {items.length ? (
                    items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Nenhum item</option>
                  )}
                </select>
              </label>
              <label className="field">
                <span>Tipo</span>
                <select value={movementType} onChange={(event) => setMovementType(event.target.value as Exclude<StockMovementType, "opening">)}>
                  {movementTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Quantidade</span>
                <input type="number" min={1} value={movementQuantity} onChange={(event) => setMovementQuantity(Number(event.target.value))} />
              </label>
              <label className="field">
                <span>Pedido opcional</span>
                <input value={movementOrderId} onChange={(event) => setMovementOrderId(event.target.value)} placeholder="order_123" />
              </label>
            </div>

            <label className="field">
              <span>Observação</span>
              <textarea value={movementNote} onChange={(event) => setMovementNote(event.target.value)} rows={4} placeholder="Motivo da reserva, baixa ou ajuste" />
            </label>

            <button className="button button--primary" type="submit" disabled={busy || moving || !selectedItem}>
              {moving ? "Registrando..." : "Registrar movimentação"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
