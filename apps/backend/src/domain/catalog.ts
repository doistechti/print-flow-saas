import type { CatalogOverview, PriceAdjustment, PricePreviewRequest, PricePreviewResult, PriceRule, Product, ProductCategory, ProductVariant } from "@print-flow/contracts";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

type ProductTemplate = {
  key: string;
  name: string;
  description: string;
  basePrice: number;
  unitLabel: string;
  leadTimeDays: number;
  variants: Array<{
    key: string;
    name: string;
    attributes: Record<string, string>;
    priceAdjustment: number;
    priceAdjustmentType: "percent" | "absolute";
  }>;
  rules: Array<{
    key: string;
    name: string;
    direction: "discount" | "surcharge";
    adjustmentType: "percent" | "absolute";
    adjustmentValue: number;
    minQuantity?: number;
    description: string;
  }>;
};

type CategoryTemplate = {
  key: string;
  name: string;
  description: string;
  products: ProductTemplate[];
};

const templates: CategoryTemplate[] = [
  {
    key: "stationery",
    name: "Papelaria comercial",
    description: "Itens de alto giro para atendimento rapido e recorrente.",
    products: [
      {
        key: "business-card-premium",
        name: "Cartao de visita premium",
        description: "Couchê 300g com laminação fosca e verniz localizado.",
        basePrice: 78,
        unitLabel: "milheiro",
        leadTimeDays: 3,
        variants: [
          { key: "front-back", name: "Frente e verso", attributes: { faces: "2", acabamento: "verniz localizado" }, priceAdjustment: 18, priceAdjustmentType: "absolute" },
          { key: "spot-varnish", name: "Verniz premium", attributes: { faces: "2", acabamento: "verniz extra" }, priceAdjustment: 12, priceAdjustmentType: "absolute" },
        ],
        rules: [
          { key: "tier-500", name: "Desconto por volume a partir de 500", direction: "discount", adjustmentType: "percent", adjustmentValue: 8, minQuantity: 500, description: "Incentivo para pedidos com maior volume." },
          { key: "tier-1000", name: "Desconto por volume a partir de 1000", direction: "discount", adjustmentType: "percent", adjustmentValue: 15, minQuantity: 1000, description: "Faixa premium para fechamento de pedido grande." },
        ],
      },
      {
        key: "flyer-a5",
        name: "Flyer A5 promocional",
        description: "Flyer em couchê brilho com excelente custo de conversao.",
        basePrice: 52,
        unitLabel: "milheiro",
        leadTimeDays: 2,
        variants: [
          { key: "double-sided", name: "Frente e verso", attributes: { faces: "2", papel: "couchê brilho" }, priceAdjustment: 10, priceAdjustmentType: "absolute" },
          { key: "rush", name: "Entrega urgente", attributes: { prazo: "24h", prioridade: "alta" }, priceAdjustment: 18, priceAdjustmentType: "absolute" },
        ],
        rules: [
          { key: "tier-2000", name: "Desconto por volume a partir de 2000", direction: "discount", adjustmentType: "percent", adjustmentValue: 12, minQuantity: 2000, description: "Desconto para grande volume de distribuicao." },
        ],
      },
    ],
  },
  {
    key: "large-format",
    name: "Grandes formatos",
    description: "Produtos de impacto visual para feiras, fachadas e eventos.",
    products: [
      {
        key: "vinyl-banner",
        name: "Banner em lona",
        description: "Banner com ilhoses e solda reforcada para uso interno ou externo.",
        basePrice: 128,
        unitLabel: "metro quadrado",
        leadTimeDays: 4,
        variants: [
          { key: "with-stand", name: "Com suporte", attributes: { estrutura: "aluminio", uso: "exposicao" }, priceAdjustment: 48, priceAdjustmentType: "absolute" },
          { key: "double-sided", name: "Dupla face", attributes: { faces: "2", uso: "fachada" }, priceAdjustment: 22, priceAdjustmentType: "absolute" },
        ],
        rules: [
          { key: "setup", name: "Taxa de preparacao tecnica", direction: "surcharge", adjustmentType: "absolute", adjustmentValue: 24, description: "Cobertura de acabamento e ajuste de impressao." },
        ],
      },
      {
        key: "vinyl-sticker",
        name: "Adesivo vinil recortado",
        description: "Adesivo resistente para vitrines, frota e sinalizacao interna.",
        basePrice: 94,
        unitLabel: "metro quadrado",
        leadTimeDays: 5,
        variants: [
          { key: "laminated", name: "Com laminação", attributes: { protecao: "fosca", aplicacao: "externa" }, priceAdjustment: 14, priceAdjustmentType: "absolute" },
          { key: "cut-only", name: "Recorte simples", attributes: { acabamento: "simples", aplicacao: "interna" }, priceAdjustment: 0, priceAdjustmentType: "absolute" },
        ],
        rules: [
          { key: "sticker-400", name: "Desconto por volume a partir de 400", direction: "discount", adjustmentType: "percent", adjustmentValue: 7, minQuantity: 400, description: "Desconto comercial para pedidos mais volumosos." },
        ],
      },
    ],
  },
  {
    key: "promo",
    name: "Material promocional",
    description: "Peças para campanhas, eventos e distribuição em massa.",
    products: [
      {
        key: "folder-triplex",
        name: "Folder tríptico",
        description: "Folder dobrado em três partes com alta area de mensagem.",
        basePrice: 66,
        unitLabel: "milheiro",
        leadTimeDays: 3,
        variants: [
          { key: "double-sided", name: "Frente e verso", attributes: { faces: "2", dobra: "tríptica" }, priceAdjustment: 8, priceAdjustmentType: "absolute" },
          { key: "uv", name: "Verniz UV", attributes: { acabamento: "UV localizado", brilho: "alto" }, priceAdjustment: 16, priceAdjustmentType: "absolute" },
        ],
        rules: [
          { key: "tier-1500", name: "Desconto por volume a partir de 1500", direction: "discount", adjustmentType: "percent", adjustmentValue: 10, minQuantity: 1500, description: "Melhor custo para campanhas de larga escala." },
        ],
      },
    ],
  },
];

function buildSeed(tenantId: string, priceMultiplier: number): CatalogOverview {
  const categories: ProductCategory[] = [];
  const products: Product[] = [];
  const variants: ProductVariant[] = [];
  const priceRules: PriceRule[] = [];

  for (const category of templates) {
    const categoryId = `${tenantId}_${category.key}`;
    categories.push({ id: categoryId, tenantId, name: category.name, description: category.description });

    for (const template of category.products) {
      const productId = `${tenantId}_${template.key}`;
      products.push({
        id: productId,
        tenantId,
        categoryId,
        name: template.name,
        basePrice: roundMoney(template.basePrice * priceMultiplier),
        active: true,
        description: template.description,
        unitLabel: template.unitLabel,
        leadTimeDays: template.leadTimeDays,
      });

      for (const variant of template.variants) {
        variants.push({
          id: `${productId}_${variant.key}`,
          tenantId,
          productId,
          name: variant.name,
          attributes: variant.attributes,
          priceAdjustment: variant.priceAdjustmentType === "absolute" ? roundMoney(variant.priceAdjustment * priceMultiplier) : variant.priceAdjustment,
          priceAdjustmentType: variant.priceAdjustmentType,
          active: true,
        });
      }

      for (const rule of template.rules) {
        priceRules.push({
          id: `${productId}_${rule.key}`,
          tenantId,
          name: rule.name,
          scope: "product",
          productId,
          direction: rule.direction,
          adjustmentType: rule.adjustmentType,
          adjustmentValue: rule.adjustmentType === "absolute" ? roundMoney(rule.adjustmentValue * priceMultiplier) : rule.adjustmentValue,
          minQuantity: rule.minQuantity,
          active: true,
          description: rule.description,
        });
      }
    }
  }

  priceRules.push({
    id: `${tenantId}_catalog_setup_fee`,
    tenantId,
    name: "Taxa de configuracao do catalogo",
    scope: "catalog",
    direction: "surcharge",
    adjustmentType: "absolute",
    adjustmentValue: roundMoney(14 * priceMultiplier),
    active: true,
    description: "Taxa fixa de preparacao aplicada para cada simulacao.",
  });

  return { categories, products, variants, priceRules };
}

const alphaSeed = buildSeed("tenant_alfa_print", 1);
const novaSeed = buildSeed("tenant_nova_graph", 1.08);

export const catalogCategories = [...alphaSeed.categories, ...novaSeed.categories];
export const catalogProducts = [...alphaSeed.products, ...novaSeed.products];
export const catalogVariants = [...alphaSeed.variants, ...novaSeed.variants];
export const catalogPriceRules = [...alphaSeed.priceRules, ...novaSeed.priceRules];

function findProductById(productId: string) {
  return catalogProducts.find((product) => product.id === productId) ?? null;
}

function findVariantById(variantId: string) {
  return catalogVariants.find((variant) => variant.id === variantId) ?? null;
}

function matchesRule(rule: PriceRule, tenantId: string, product: Product, quantity: number) {
  if (rule.tenantId !== tenantId || !rule.active) {
    return false;
  }

  if (rule.productId && rule.productId !== product.id) {
    return false;
  }

  if (rule.categoryId && rule.categoryId !== product.categoryId) {
    return false;
  }

  if (rule.minQuantity && quantity < rule.minQuantity) {
    return false;
  }

  return true;
}

function signedAdjustment(value: number, direction: PriceRule["direction"]) {
  return direction === "discount" ? -Math.abs(value) : Math.abs(value);
}

export function listCatalogOverviewForTenant(tenantId: string): CatalogOverview {
  return {
    categories: catalogCategories.filter((category) => category.tenantId === tenantId),
    products: catalogProducts.filter((product) => product.tenantId === tenantId),
    variants: catalogVariants.filter((variant) => variant.tenantId === tenantId),
    priceRules: catalogPriceRules.filter((rule) => rule.tenantId === tenantId),
  };
}

export function previewCatalogPrice(tenantId: string, payload: PricePreviewRequest): PricePreviewResult | null {
  const product = findProductById(payload.productId);
  if (!product || product.tenantId !== tenantId || payload.quantity <= 0) {
    return null;
  }

  const quantity = Math.max(1, Math.floor(payload.quantity));
  const variant = payload.variantId ? findVariantById(payload.variantId) : null;
  if (variant && (variant.tenantId !== tenantId || variant.productId !== product.id)) {
    return null;
  }

  let subtotal = product.basePrice * quantity;
  const adjustments: PriceAdjustment[] = [
    {
      label: product.name,
      amount: roundMoney(subtotal),
      type: "base" as const,
      description: `${product.unitLabel} base`,
    },
  ];

  if (variant) {
    const variantValue = variant.priceAdjustmentType === "percent" ? subtotal * (variant.priceAdjustment / 100) : variant.priceAdjustment * quantity;
    const variantAmount = roundMoney(variantValue);
    subtotal += variantAmount;
    adjustments.push({
      label: variant.name,
      amount: variantAmount,
      type: "variant" as const,
      description: Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(" · "),
    });
  }

  for (const rule of catalogPriceRules.filter((rule) => matchesRule(rule, tenantId, product, quantity))) {
    const rawValue = rule.adjustmentType === "percent" ? subtotal * (rule.adjustmentValue / 100) : rule.adjustmentValue;
    const amount = roundMoney(signedAdjustment(rawValue, rule.direction));
    subtotal += amount;
    adjustments.push({
      label: rule.name,
      amount,
      type: "rule" as const,
      description: `${rule.scope} · ${rule.adjustmentType === "percent" ? `${rule.adjustmentValue}%` : `R$ ${rule.adjustmentValue.toFixed(2)}`}`,
    });
  }

  const total = roundMoney(subtotal);

  return {
    productId: product.id,
    productName: product.name,
    quantity,
    variantId: variant?.id,
    variantName: variant?.name,
    currency: "BRL",
    unitBasePrice: roundMoney(product.basePrice),
    unitPrice: roundMoney(total / quantity),
    subtotal: roundMoney(product.basePrice * quantity),
    adjustments,
    total,
  };
}


