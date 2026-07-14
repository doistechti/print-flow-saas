import crypto from "node:crypto";
import type {
  AddProductionNoteRequest,
  MoveProductionOrderRequest,
  OrderDetail,
  OrderStatus,
  ProductionMovement,
  ProductionNote,
  ProductionOrderDetail,
  ProductionOrderStatus,
  ProductionOrderSummary,
  ProductionOverview,
  ProductionStage,
} from "@print-flow/contracts";
import { ApiError } from "../lib/http.js";
import { listCatalogOverviewForTenant } from "./catalog.js";
import { consumeReservedStockForOrder } from "./stock.js";
import { getOrderDetail, orders, updateOrderStatus } from "./orders.js";
import { recordProductionNotification } from "./notifications.js";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}


function addDays(timestamp: string, days: number) {
  return new Date(new Date(timestamp).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

const productionStages: ProductionStage[] = [
  { id: "tenant_alfa_print_stage_receiving", tenantId: "tenant_alfa_print", name: "Recebimento", orderIndex: 0 },
  { id: "tenant_alfa_print_stage_printing", tenantId: "tenant_alfa_print", name: "Impressao", orderIndex: 1 },
  { id: "tenant_alfa_print_stage_finishing", tenantId: "tenant_alfa_print", name: "Acabamento", orderIndex: 2 },
  { id: "tenant_alfa_print_stage_qc", tenantId: "tenant_alfa_print", name: "Conferencia", orderIndex: 3 },
  { id: "tenant_alfa_print_stage_dispatch", tenantId: "tenant_alfa_print", name: "Expedicao", orderIndex: 4 },
  { id: "tenant_nova_graph_stage_receiving", tenantId: "tenant_nova_graph", name: "Recebimento", orderIndex: 0 },
  { id: "tenant_nova_graph_stage_printing", tenantId: "tenant_nova_graph", name: "Impressao", orderIndex: 1 },
  { id: "tenant_nova_graph_stage_finishing", tenantId: "tenant_nova_graph", name: "Acabamento", orderIndex: 2 },
  { id: "tenant_nova_graph_stage_qc", tenantId: "tenant_nova_graph", name: "Conferencia", orderIndex: 3 },
  { id: "tenant_nova_graph_stage_dispatch", tenantId: "tenant_nova_graph", name: "Expedicao", orderIndex: 4 },
];

type ProductionRecord = {
  tenantId: string;
  orderId: string;
  currentStageId: string;
  productionStatus: ProductionOrderStatus;
  noteCount: number;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  movements: ProductionMovement[];
  notes: ProductionNote[];
};

const productionRecords = new Map<string, ProductionRecord>();

function findStageById(tenantId: string, stageId: string) {
  return productionStages.find((stage) => stage.tenantId === tenantId && stage.id === stageId) ?? null;
}

function listStagesForTenant(tenantId: string) {
  return productionStages
    .filter((stage) => stage.tenantId === tenantId)
    .sort((left, right) => left.orderIndex - right.orderIndex);
}

function getLeadTimeDays(order: OrderDetail) {
  const catalog = listCatalogOverviewForTenant(order.tenantId);
  const productsById = new Map(catalog.products.map((product) => [product.id, product]));
  const leadTimes = order.items
    .map((item) => productsById.get(item.productId)?.leadTimeDays ?? 0)
    .filter((value) => value > 0);

  return Math.max(5, ...(leadTimes.length ? leadTimes : [5]));
}

function getInitialStageIndex(order: OrderDetail, stages: ProductionStage[]) {
  if (order.status === "ready" || order.status === "delivered") {
    return Math.max(0, stages.length - 1);
  }

  if (order.status === "in_production" || order.paymentStatus === "paid") {
    return Math.min(1, Math.max(0, stages.length - 1));
  }

  return 0;
}

function getInitialProductionStatus(order: OrderDetail): ProductionOrderStatus {
  if (order.status === "ready" || order.status === "delivered") {
    return "ready";
  }

  if (order.status === "in_production" || order.paymentStatus === "paid") {
    return "in_progress";
  }

  return "queued";
}

function isOverdue(dueAt: string, productionStatus: ProductionOrderStatus, orderStatus: OrderStatus) {
  if (productionStatus === "ready" || orderStatus === "ready" || orderStatus === "delivered") {
    return false;
  }

  return new Date(dueAt).getTime() < Date.now();
}

function isTrackedProductionOrder(order: OrderDetail) {
  return order.status === "in_production" || order.status === "ready" || order.status === "delivered";
}

function ensureProductionRecord(order: OrderDetail, force = false) {
  const existing = productionRecords.get(order.id);
  if (existing) {
    return existing;
  }

  if (!force && !isTrackedProductionOrder(order)) {
    return null;
  }

  const stages = listStagesForTenant(order.tenantId);
  if (!stages.length) {
    throw new ApiError(400, "PRODUCTION_STAGES_MISSING", "Nao ha etapas de producao configuradas para o tenant");
  }

  const stageIndex = getInitialStageIndex(order, stages);
  const stage = stages[stageIndex] ?? stages[0];
  const timestamp = order.updatedAt ?? order.createdAt;
  const dueAt = addDays(timestamp, getLeadTimeDays(order));
  const productionStatus = getInitialProductionStatus(order);
  const noteCount = 0;
  const movement: ProductionMovement = {
    id: createId("production_movement"),
    tenantId: order.tenantId,
    orderId: order.id,
    fromStageId: undefined,
    toStageId: stage.id,
    status: productionStatus,
    note: "Registro inicial da producao",
    createdAt: timestamp,
  };

  const record: ProductionRecord = {
    tenantId: order.tenantId,
    orderId: order.id,
    currentStageId: stage.id,
    productionStatus,
    noteCount,
    dueAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    movements: [movement],
    notes: [],
  };

  productionRecords.set(order.id, record);
  return record;
}

function buildProductionSummary(order: OrderDetail, record: ProductionRecord): ProductionOrderSummary {
  const stages = listStagesForTenant(order.tenantId);
  const currentStage = stages.find((stage) => stage.id === record.currentStageId) ?? stages[0];
  const updatedAt = record.updatedAt ?? order.updatedAt ?? order.createdAt;

  return {
    id: `${order.id}_production`,
    tenantId: order.tenantId,
    orderId: order.id,
    customerProfileId: order.customerProfileId,
    customerName: order.customerName,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    currentStageId: currentStage.id,
    currentStageName: currentStage.name,
    currentStageIndex: currentStage.orderIndex,
    productionStatus: record.productionStatus,
    noteCount: record.notes.length,
    total: order.total,
    dueAt: record.dueAt,
    isOverdue: isOverdue(record.dueAt, record.productionStatus, order.status),
    lastMovementAt: updatedAt,
    createdAt: record.createdAt,
    updatedAt,
  };
}

function buildProductionDetail(order: OrderDetail, record: ProductionRecord): ProductionOrderDetail {
  return {
    ...buildProductionSummary(order, record),
    order,
    stages: listStagesForTenant(order.tenantId),
    movements: [...record.movements].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    notes: [...record.notes].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  };
}

function listProductionCandidates(tenantId: string) {
  return orders.filter((order) => {
    if (order.tenantId !== tenantId) {
      return false;
    }

    return (
      order.status === "in_production" ||
      order.status === "ready" ||
      order.status === "delivered" ||
      productionRecords.has(order.id)
    );
  });
}

function updateRecordFromMovement(record: ProductionRecord, stageId: string, status: ProductionOrderStatus, note?: string, author = "Equipe de producao") {
  const movement: ProductionMovement = {
    id: createId("production_movement"),
    tenantId: record.tenantId,
    orderId: record.orderId,
    fromStageId: record.currentStageId,
    toStageId: stageId,
    status,
    note,
    createdAt: now(),
  };

  record.currentStageId = stageId;
  record.productionStatus = status;
  record.updatedAt = movement.createdAt;
  record.movements.unshift(movement);

  if (note) {
    record.notes.unshift({
      id: createId("production_note"),
      tenantId: record.tenantId,
      orderId: record.orderId,
      body: note,
      author,
      createdAt: movement.createdAt,
    });
    record.noteCount = record.notes.length;
  }

  return movement;
}

function resolveOrderStatusForProduction(status: ProductionOrderStatus): OrderStatus {
  if (status === "ready") {
    return "ready";
  }

  return "in_production";
}

export function listProductionStagesForTenant(tenantId: string) {
  return listStagesForTenant(tenantId);
}

export function getProductionOverview(tenantId: string): ProductionOverview {
  const stages = listStagesForTenant(tenantId);
  const ordersForTenant = listProductionCandidates(tenantId);
  const summaries = ordersForTenant.map((order) => {
    const orderDetail = getOrderDetail(tenantId, order.id);
    if (!orderDetail) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
    }

    const record = ensureProductionRecord(orderDetail);
    if (!record) {
      throw new ApiError(404, "PRODUCTION_ORDER_NOT_FOUND", "Pedido de producao nao encontrado");
    }

    return buildProductionSummary(orderDetail, record);
  });

  const countsByStatus: ProductionOverview["countsByStatus"] = {
    queued: 0,
    in_progress: 0,
    blocked: 0,
    ready: 0,
  };

  const countsByStage: Record<string, number> = {};
  let readyOrders = 0;
  let blockedOrders = 0;
  let overdueOrders = 0;

  for (const stage of stages) {
    countsByStage[stage.id] = 0;
  }

  for (const summary of summaries) {
    countsByStatus[summary.productionStatus] += 1;
    countsByStage[summary.currentStageId] = (countsByStage[summary.currentStageId] ?? 0) + 1;
    if (summary.productionStatus === "ready") {
      readyOrders += 1;
    }
    if (summary.productionStatus === "blocked") {
      blockedOrders += 1;
    }
    if (summary.isOverdue) {
      overdueOrders += 1;
    }
  }

  return {
    stages,
    orders: summaries.sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      return right.lastMovementAt.localeCompare(left.lastMovementAt);
    }),
    countsByStatus,
    countsByStage,
    readyOrders,
    blockedOrders,
    overdueOrders,
  };
}

export function listProductionOrdersForTenant(tenantId: string) {
  return getProductionOverview(tenantId).orders;
}

export function getProductionOrderDetail(tenantId: string, orderId: string) {
  const order = getOrderDetail(tenantId, orderId);
  if (!order) {
    return null;
  }

  const record = ensureProductionRecord(order);
  if (!record) {
    return null;
  }

  return buildProductionDetail(order, record);
}

export function moveProductionOrderStage(tenantId: string, orderId: string, payload: MoveProductionOrderRequest) {
  const order = getOrderDetail(tenantId, orderId);
  if (!order) {
    return null;
  }

  const stages = listStagesForTenant(tenantId);
  const targetStage = findStageById(tenantId, payload.stageId);
  if (!targetStage) {
    throw new ApiError(404, "PRODUCTION_STAGE_NOT_FOUND", "Etapa de producao nao encontrada");
  }

  const record = ensureProductionRecord(order, true)!;
  const nextStatus = payload.status ?? (targetStage.orderIndex === stages.length - 1 ? "ready" : "in_progress");
  updateRecordFromMovement(record, targetStage.id, nextStatus, payload.note, payload.author);
  recordProductionNotification({
    tenantId,
    orderId,
    customerName: order.customerName,
    stageName: targetStage.name,
    status: nextStatus,
    note: payload.note ? `Atualizacao de producao: ${payload.note}` : undefined,
  });

  if (nextStatus === "in_progress") {
    consumeReservedStockForOrder(tenantId, orderId, "Baixa automática ao iniciar a produção");
  }

  const orderStatus = resolveOrderStatusForProduction(nextStatus);
  const updatedOrder = updateOrderStatus(tenantId, orderId, {
    status: orderStatus,
    paymentStatus: order.paymentStatus,
  });

  if (!updatedOrder) {
    return null;
  }

  return buildProductionDetail(updatedOrder, record);
}

export function addProductionNote(tenantId: string, orderId: string, payload: AddProductionNoteRequest) {
  const order = getOrderDetail(tenantId, orderId);
  if (!order) {
    return null;
  }

  const record = ensureProductionRecord(order, true)!;
  const currentStage = listStagesForTenant(tenantId).find((stage) => stage.id === record.currentStageId) ?? null;
  const timestamp = now();
  record.notes.unshift({
    id: createId("production_note"),
    tenantId,
    orderId,
    body: payload.body,
    author: payload.author ?? "Equipe de producao",
    createdAt: timestamp,
  });
  record.noteCount = record.notes.length;
  record.updatedAt = timestamp;

  recordProductionNotification({
    tenantId,
    orderId,
    customerName: order.customerName,
    stageName: currentStage?.name ?? record.currentStageId,
    status: record.productionStatus,
    note: payload.body,
  });

  return buildProductionDetail(order, record);
}
