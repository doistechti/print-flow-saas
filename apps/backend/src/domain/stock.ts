import crypto from "node:crypto";
import type {
  CreateStockItemRequest,
  RecordStockMovementRequest,
  StockItem,
  StockMovement,
  StockMovementType,
  StockOverview,
  UpdateStockItemRequest,
} from "@print-flow/contracts";
import { ApiError } from "../lib/http.js";
import { listCatalogOverviewForTenant } from "./catalog.js";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function round(value: number) {
  return Math.max(0, Math.round(value));
}

const stockItems: StockItem[] = [];
const stockMovements: StockMovement[] = [];
const orderReservations = new Map<string, Map<string, number>>();

function buildOpeningQuantity(productId: string, productName: string, unitLabel: string) {
  if (unitLabel.toLowerCase().includes("metro quadrado")) {
    return 180 + productName.length * 2;
  }

  if (unitLabel.toLowerCase().includes("milheiro")) {
    return 9000 + productId.length * 12;
  }

  return 2400 + productName.length * 18;
}

function buildMinimumQuantity(quantityOnHand: number) {
  return Math.max(10, Math.round(quantityOnHand * 0.18));
}

function buildSeedItem(tenantId: string, productId: string, productName: string, unitLabel: string): StockItem {
  const quantityOnHand = round(buildOpeningQuantity(productId, productName, unitLabel));
  const timestamp = now();

  return {
    id: `${tenantId}_${productId}_stock`,
    tenantId,
    name: productName,
    productId,
    productName,
    sku: `${tenantId}-${productId}`,
    unitLabel,
    quantityOnHand,
    quantityReserved: 0,
    minimumQuantity: buildMinimumQuantity(quantityOnHand),
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function ensureSeedForTenant(tenantId: string) {
  const existingProductIds = new Set(
    stockItems.filter((item) => item.tenantId === tenantId && item.productId).map((item) => item.productId as string),
  );
  const catalog = listCatalogOverviewForTenant(tenantId);

  for (const product of catalog.products) {
    if (existingProductIds.has(product.id)) {
      continue;
    }

    const item = buildSeedItem(tenantId, product.id, product.name, product.unitLabel);
    stockItems.unshift(item);
    stockMovements.unshift({
      id: createId("stock_movement"),
      tenantId,
      stockItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      type: "opening",
      quantity: item.quantityOnHand,
      onHandAfter: item.quantityOnHand,
      reservedAfter: item.quantityReserved,
      note: "Saldo inicial do estoque",
      createdAt: item.createdAt,
    });
  }
}

ensureSeedForTenant("tenant_alfa_print");
ensureSeedForTenant("tenant_nova_graph");

function findStockItemById(stockItemId: string) {
  return stockItems.find((item) => item.id === stockItemId) ?? null;
}

function findStockItemByProductId(tenantId: string, productId: string) {
  return stockItems.find((item) => item.tenantId === tenantId && item.productId === productId) ?? null;
}

function getAvailableQuantity(item: StockItem) {
  return Math.max(0, item.quantityOnHand - item.quantityReserved);
}

function pushMovement(item: StockItem, type: StockMovementType, quantity: number, note?: string, orderId?: string) {
  const movement: StockMovement = {
    id: createId("stock_movement"),
    tenantId: item.tenantId,
    stockItemId: item.id,
    productId: item.productId,
    productName: item.productName,
    orderId,
    type,
    quantity,
    onHandAfter: item.quantityOnHand,
    reservedAfter: item.quantityReserved,
    note,
    createdAt: now(),
  };

  stockMovements.unshift(movement);
  item.updatedAt = movement.createdAt;
  return movement;
}

function groupQuantitiesByProduct(items: Array<{ productId: string; quantity: number }>) {
  const totals = new Map<string, number>();

  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }

  return totals;
}

export function listStockItemsForTenant(tenantId: string) {
  return stockItems
    .filter((item) => item.tenantId === tenantId)
    .map((item) => ({ ...item }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function listStockMovementsForTenant(tenantId: string) {
  return stockMovements
    .filter((movement) => movement.tenantId === tenantId)
    .map((movement) => ({ ...movement }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getStockOverview(tenantId: string): StockOverview {
  const items = listStockItemsForTenant(tenantId);
  const movements = listStockMovementsForTenant(tenantId).slice(0, 20);

  const summary = items.reduce(
    (acc, item) => {
      const available = getAvailableQuantity(item);
      acc.totalItems += 1;
      acc.totalOnHand += item.quantityOnHand;
      acc.totalReserved += item.quantityReserved;
      acc.totalAvailable += available;
      if (item.active) {
        acc.activeItems += 1;
      }
      if (item.active && item.minimumQuantity !== undefined && available <= item.minimumQuantity) {
        acc.lowStockItems += 1;
      }
      return acc;
    },
    {
      totalItems: 0,
      activeItems: 0,
      lowStockItems: 0,
      totalOnHand: 0,
      totalReserved: 0,
      totalAvailable: 0,
    },
  );

  return { summary, items, movements };
}

export function createStockItem(tenantId: string, payload: CreateStockItemRequest) {
  if (payload.productId) {
    const existing = findStockItemByProductId(tenantId, payload.productId);
    if (existing) {
      throw new Error("Ja existe um item de estoque para este produto");
    }
  }

  const timestamp = now();
  const item: StockItem = {
    id: createId("stock_item"),
    tenantId,
    name: payload.name,
    productId: payload.productId,
    productName: payload.productName ?? payload.name,
    sku: payload.sku,
    unitLabel: payload.unitLabel ?? "unidade",
    quantityOnHand: round(payload.quantityOnHand),
    quantityReserved: round(payload.quantityReserved ?? 0),
    minimumQuantity: payload.minimumQuantity,
    active: payload.active ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (item.quantityReserved > item.quantityOnHand) {
    throw new Error("Quantidade reservada nao pode exceder o saldo em mao");
  }

  stockItems.unshift(item);
  pushMovement(item, "opening", item.quantityOnHand, payload.note);
  return item;
}

export function updateStockItem(tenantId: string, stockItemId: string, payload: UpdateStockItemRequest) {
  const item = findStockItemById(stockItemId);

  if (!item || item.tenantId !== tenantId) {
    return null;
  }

  if (payload.productId && payload.productId !== item.productId) {
    const existing = findStockItemByProductId(tenantId, payload.productId);
    if (existing && existing.id !== item.id) {
      throw new Error("Ja existe um item de estoque para este produto");
    }
  }

  if (payload.name !== undefined) item.name = payload.name;
  if (payload.productId !== undefined) item.productId = payload.productId;
  if (payload.productName !== undefined) item.productName = payload.productName;
  if (payload.sku !== undefined) item.sku = payload.sku;
  if (payload.unitLabel !== undefined) item.unitLabel = payload.unitLabel;
  if (payload.quantityOnHand !== undefined) item.quantityOnHand = round(payload.quantityOnHand);
  if (payload.quantityReserved !== undefined) item.quantityReserved = round(payload.quantityReserved);
  if (payload.minimumQuantity !== undefined) item.minimumQuantity = round(payload.minimumQuantity);
  if (payload.active !== undefined) item.active = payload.active;

  if (item.quantityReserved > item.quantityOnHand) {
    throw new Error("Quantidade reservada nao pode exceder o saldo em mao");
  }

  item.updatedAt = now();
  return item;
}

export function recordStockMovement(tenantId: string, payload: RecordStockMovementRequest) {
  const item = findStockItemById(payload.stockItemId);

  if (!item || item.tenantId !== tenantId) {
    return null;
  }

  const quantity = round(payload.quantity);
  if (quantity <= 0) {
    throw new Error("Quantidade precisa ser maior que zero");
  }

  if (payload.type === "reserve") {
    if (getAvailableQuantity(item) < quantity) {
      throw new Error("Saldo insuficiente para reserva");
    }
    item.quantityReserved += quantity;
  } else if (payload.type === "release") {
    if (item.quantityReserved < quantity) {
      throw new Error("Nao ha quantidade reservada suficiente");
    }
    item.quantityReserved -= quantity;
  } else if (payload.type === "consumption") {
    if (item.quantityReserved >= quantity) {
      item.quantityReserved -= quantity;
      item.quantityOnHand -= quantity;
    } else if (item.quantityOnHand >= quantity) {
      item.quantityOnHand -= quantity;
    } else {
      throw new Error("Saldo insuficiente para baixa");
    }
  } else {
    item.quantityOnHand += quantity;
  }

  const movement = pushMovement(item, payload.type, quantity, payload.note, payload.orderId);
  return { item, movement };
}

export function reserveStockForOrder(
  tenantId: string,
  orderId: string,
  items: Array<{ productId: string; quantity: number }>,
  note = "Reserva vinculada ao pedido aprovado",
) {
  if (orderReservations.has(orderId)) {
    return listReservationsForOrder(orderId);
  }

  const grouped = groupQuantitiesByProduct(items);
  const targets = [...grouped.entries()].map(([productId, quantity]) => {
    const item = findStockItemByProductId(tenantId, productId);
    if (!item) {
      throw new Error(`Item de estoque nao encontrado para o produto ${productId}`);
    }

    if (!item.active) {
      throw new Error(`Item de estoque inativo para o produto ${item.name}`);
    }

    if (getAvailableQuantity(item) < quantity) {
      throw new Error(`Saldo insuficiente para reservar ${item.name}`);
    }

    return { item, quantity };
  });

  const reservation = new Map<string, number>();

  for (const target of targets) {
    target.item.quantityReserved += target.quantity;
    reservation.set(target.item.id, target.quantity);
    pushMovement(target.item, "reserve", target.quantity, note, orderId);
  }

  orderReservations.set(orderId, reservation);
  return listReservationsForOrder(orderId);
}

export function releaseReservedStockForOrder(
  tenantId: string,
  orderId: string,
  note = "Reserva liberada pelo cancelamento do pedido",
) {
  const reservation = orderReservations.get(orderId);
  if (!reservation) {
    return null;
  }

  for (const [stockItemId, quantity] of reservation.entries()) {
    const item = findStockItemById(stockItemId);
    if (!item || item.tenantId !== tenantId) {
      continue;
    }

    item.quantityReserved = Math.max(0, item.quantityReserved - quantity);
    pushMovement(item, "release", quantity, note, orderId);
  }

  orderReservations.delete(orderId);
  return true;
}

export function consumeReservedStockForOrder(
  tenantId: string,
  orderId: string,
  note = "Baixa do estoque ao iniciar a producao",
) {
  const reservation = orderReservations.get(orderId);
  if (!reservation) {
    return null;
  }

  for (const [stockItemId, quantity] of reservation.entries()) {
    const item = findStockItemById(stockItemId);
    if (!item || item.tenantId !== tenantId) {
      continue;
    }

    if (item.quantityReserved < quantity || item.quantityOnHand < quantity) {
      throw new Error(`Saldo insuficiente para baixar ${item.name}`);
    }

    item.quantityReserved -= quantity;
    item.quantityOnHand -= quantity;
    pushMovement(item, "consumption", quantity, note, orderId);
  }

  orderReservations.delete(orderId);
  return true;
}

export function listReservationsForOrder(orderId: string) {
  const reservation = orderReservations.get(orderId);
  if (!reservation) {
    return [] as Array<{ stockItemId: string; quantity: number }>;
  }

  return [...reservation.entries()].map(([stockItemId, quantity]) => ({ stockItemId, quantity }));
}

export function getStockItemAvailability(stockItemId: string) {
  const item = findStockItemById(stockItemId);
  if (!item) {
    return null;
  }

  return {
    ...item,
    availableQuantity: getAvailableQuantity(item),
  };
}
