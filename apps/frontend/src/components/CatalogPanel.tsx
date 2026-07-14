import { useEffect, useState, type FormEvent } from "react";
import type { CatalogOverview, PricePreviewRequest, PricePreviewResult } from "@print-flow/contracts";

type CatalogPanelProps = {
  tenantName: string;
  catalog: CatalogOverview | null;
  preview: PricePreviewResult | null;
  busy: boolean;
  draftCount: number;
  onPreview: (payload: PricePreviewRequest) => Promise<void>;
  onAddItem: (preview: PricePreviewResult) => void;
};

const EMPTY_PRODUCTS: CatalogOverview["products"] = [];
const EMPTY_VARIANTS: CatalogOverview["variants"] = [];
const EMPTY_CATEGORIES: CatalogOverview["categories"] = [];
const EMPTY_PRICE_RULES: CatalogOverview["priceRules"] = [];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function CatalogPanel({ tenantName, catalog, preview, busy, draftCount, onPreview, onAddItem }: CatalogPanelProps) {
  const [quantity, setQuantity] = useState(1000);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const products = catalog?.products ?? EMPTY_PRODUCTS;
  const variants = catalog?.variants ?? EMPTY_VARIANTS;
  const categories = catalog?.categories ?? EMPTY_CATEGORIES;
  const priceRules = catalog?.priceRules ?? EMPTY_PRICE_RULES;

  useEffect(() => {
    if (!products.length) {
      setSelectedProductId("");
      setSelectedVariantId("");
      return;
    }

    const firstProductId = products[0].id;
    setSelectedProductId((current) => (products.some((product) => product.id === current) ? current : firstProductId));
  }, [products]);

  useEffect(() => {
    const productVariants = variants.filter((variant) => variant.productId === selectedProductId);
    setSelectedVariantId((current) => {
      if (!productVariants.length) {
        return "";
      }

      return productVariants.some((variant) => variant.id === current) ? current : productVariants[0].id;
    });
  }, [selectedProductId, variants]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedProductVariants = variants.filter((variant) => variant.productId === selectedProductId);
  const selectedVariant = selectedProductVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const selectedCategory = selectedProduct
    ? categories.find((category) => category.id === selectedProduct.categoryId) ?? null
    : null;

  const submitPreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    await onPreview({
      productId: selectedProduct.id,
      quantity,
      variantId: selectedVariant?.id,
    });
  };

  return (
    <section className="panel panel--stacked catalog-panel">
      <div className="section-head section-head--compact">
        <div>
          <p className="card-label">Catálogo e precificação</p>
          <h2>Montar orçamento comercial</h2>
          <p>
            O catálogo do tenant {tenantName} combina produtos, variantes e regras de preço para
            simular valores antes de gerar o pedido.
          </p>
        </div>
        <div className="panel-chip">
          <strong>{draftCount}</strong>
          <span>itens no rascunho</span>
        </div>
      </div>

      <div className="stats-grid stats-grid--compact">
        <article className="stat-card">
          <span>Categorias</span>
          <strong>{categories.length}</strong>
          <p>Estrutura de linhas comerciais</p>
        </article>
        <article className="stat-card">
          <span>Produtos</span>
          <strong>{products.length}</strong>
          <p>Itens vendáveis do tenant</p>
        </article>
        <article className="stat-card">
          <span>Variantes</span>
          <strong>{variants.length}</strong>
          <p>Acabamentos e combinações</p>
        </article>
        <article className="stat-card">
          <span>Regras de preço</span>
          <strong>{priceRules.length}</strong>
          <p>Faixas, taxas e descontos</p>
        </article>
      </div>

      <div className="catalog-layout">
        <div className="catalog-list">
          {products.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            const active = product.id === selectedProductId;
            return (
              <button
                key={product.id}
                type="button"
                className={`list-card catalog-card ${active ? "catalog-card--active" : ""}`}
                onClick={() => setSelectedProductId(product.id)}
              >
                <div>
                  <span>{category?.name ?? "Categoria"}</span>
                  <h3>{product.name}</h3>
                </div>
                <p>{product.description}</p>
                <small>
                  A partir de {formatMoney(product.basePrice)} por {product.unitLabel} · prazo médio {product.leadTimeDays} dias
                </small>
              </button>
            );
          })}
        </div>

        <div className="catalog-detail">
          <div className="catalog-hero">
            <div>
              <p className="card-label">Precificação em tempo real</p>
              <h3>{selectedProduct?.name ?? "Selecione um produto"}</h3>
              <p>{selectedProduct?.description ?? "A simulação aparece aqui junto com a composição do preço."}</p>
            </div>
            <div className="catalog-meta">
              <span>{selectedCategory?.name ?? "Categoria"}</span>
              <strong>{selectedProduct ? formatMoney(selectedProduct.basePrice) : "--"}</strong>
            </div>
          </div>

          <form className="catalog-form" onSubmit={submitPreview}>
            <div className="two-column-grid">
              <label className="field">
                <span>Quantidade</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Variante</span>
                <select
                  value={selectedVariantId}
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                  disabled={!selectedProductVariants.length}
                >
                  {selectedProductVariants.length ? (
                    selectedProductVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Sem variantes</option>
                  )}
                </select>
              </label>
            </div>

            <button className="button button--primary" type="submit" disabled={!selectedProduct || busy}>
              {busy ? "Calculando..." : "Atualizar precificação"}
            </button>
          </form>

          <div className="price-preview-card">
            {preview && selectedProduct ? (
              <>
                <div className="price-summary">
                  <div>
                    <span>Preço unitário</span>
                    <strong>{formatMoney(preview.unitPrice)}</strong>
                  </div>
                  <div>
                    <span>Total estimado</span>
                    <strong>{formatMoney(preview.total)}</strong>
                  </div>
                </div>

                <div className="price-adjustments">
                  {preview.adjustments.map((adjustment) => (
                    <article key={`${adjustment.type}-${adjustment.label}`} className="price-adjustment">
                      <div>
                        <span>{adjustment.label}</span>
                        <p>{adjustment.description}</p>
                      </div>
                      <strong className={adjustment.amount < 0 ? "is-negative" : ""}>
                        {adjustment.amount < 0 ? "-" : "+"}{formatMoney(Math.abs(adjustment.amount))}
                      </strong>
                    </article>
                  ))}
                </div>

                <button className="button button--ghost" type="button" onClick={() => onAddItem(preview)}>
                  Adicionar ao orçamento
                </button>
              </>
            ) : (
              <div className="empty-state empty-state--compact">
                <h3>Simule um preço</h3>
                <p>Escolha um produto e clique em atualizar para ver a composição do orçamento.</p>
              </div>
            )}
          </div>

          <div className="rules-grid">
            {priceRules.map((rule) => (
              <article key={rule.id} className="rule-card">
                <span>{rule.scope}</span>
                <h4>{rule.name}</h4>
                <p>{rule.description}</p>
                <small>
                  {rule.direction === "discount" ? "Desconto" : "Acréscimo"} · {rule.adjustmentType === "percent" ? `${rule.adjustmentValue}%` : formatMoney(rule.adjustmentValue)}
                  {rule.minQuantity ? ` · mínimo ${rule.minQuantity}` : ""}
                </small>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
