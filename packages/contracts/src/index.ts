export type TenantStatus = "active" | "suspended";
export type UserStatus = "active" | "invited" | "disabled";
export type MembershipStatus = "active" | "invited" | "disabled";
export type OrderStatus =
  | "draft"
  | "quoted"
  | "awaiting_payment"
  | "paid"
  | "in_production"
  | "ready"
  | "delivered"
  | "canceled";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  permissions: string[];
}

export interface RoleSummary {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
}

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  status: MembershipStatus;
  defaultTenant: boolean;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: UserSummary;
  tenant: TenantSummary;
  role: RoleSummary;
  availableTenants: TenantSummary[];
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface SwitchTenantRequest {
  tenantSlug: string;
}

export interface SessionTokenPayload {
  sub: string;
  tenantId: string;
  membershipId: string;
  roleId: string;
  email: string;
  issuedAt: string;
  expiresAt: string;
}

export interface ApiErrorResponse {
  message: string;
  code: string;
  statusCode: number;
}

export interface CustomerProfile {
  id: string;
  tenantId: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  customerProfileId?: string;
  source: "whatsapp" | "manual" | "web";
  stage: "new" | "contacted" | "qualified" | "won" | "lost";
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  leadId?: string;
  customerProfileId?: string;
  status: "open" | "waiting_customer" | "closed";
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  authorType: "customer" | "operator" | "system" | "bot";
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
}

export interface ProductVariant {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  attributes: Record<string, string>;
  priceAdjustment: number;
  priceAdjustmentType: "percent" | "absolute";
  active: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  basePrice: number;
  active: boolean;
  description: string;
  unitLabel: string;
  leadTimeDays: number;
}

export interface PriceRule {
  id: string;
  tenantId: string;
  name: string;
  scope: "catalog" | "category" | "product";
  productId?: string;
  categoryId?: string;
  direction: "discount" | "surcharge";
  adjustmentType: "percent" | "absolute";
  adjustmentValue: number;
  minQuantity?: number;
  active: boolean;
  description: string;
}

export interface CatalogOverview {
  categories: ProductCategory[];
  products: Product[];
  variants: ProductVariant[];
  priceRules: PriceRule[];
}

export interface PricePreviewRequest {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface PriceAdjustment {
  label: string;
  amount: number;
  type: "base" | "variant" | "rule";
  description: string;
}

export interface PricePreviewResult {
  productId: string;
  productName: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
  currency: "BRL";
  unitBasePrice: number;
  unitPrice: number;
  subtotal: number;
  adjustments: PriceAdjustment[];
  total: number;
}

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected";
export type OrderPaymentStatus = "pending" | "processing" | "paid" | "failed";

export interface QuoteItem {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: "BRL";
}

export interface Quote {
  id: string;
  tenantId: string;
  customerProfileId: string;
  customerName: string;
  items: QuoteItem[];
  total: number;
  status: QuoteStatus;
  orderId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: "BRL";
}

export interface Order {
  id: string;
  tenantId: string;
  customerProfileId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  quoteId?: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentUrl?: string;
  billingProvider?: "mock" | "external";
  billingInvoiceId?: string;
  billingChargeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteSummary {
  id: string;
  tenantId: string;
  customerProfileId: string;
  customerName: string;
  status: QuoteStatus;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDetail extends QuoteSummary {
  orderId?: string;
  notes?: string;
  customerProfile: CustomerProfile;
  items: QuoteItem[];
}

export interface OrderSummary {
  id: string;
  tenantId: string;
  customerProfileId: string;
  customerName: string;
  quoteId?: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentUrl?: string;
  billingProvider?: "mock" | "external";
  billingInvoiceId?: string;
  billingChargeId?: string;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends OrderSummary {
  customerProfile: CustomerProfile;
  items: OrderItem[];
  billingEvents: BillingEvent[];
}

export interface BillingLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BillingCustomer {
  name: string;
  email?: string;
  phone?: string;
  document?: string;
}

export interface BillingCreateChargeRequest {
  tenantId: string;
  orderId: string;
  externalReference: string;
  customer: BillingCustomer;
  items: BillingLineItem[];
  total: number;
  currency: "BRL";
  metadata?: Record<string, string>;
}

export interface BillingCreateChargeResponse {
  invoiceId: string;
  chargeId: string;
  paymentUrl: string;
  invoiceStatus: "draft" | "pending" | "paid" | "canceled";
  chargeStatus: "pending" | "paid" | "failed" | "expired";
  provider: "mock" | "external";
}

export interface BillingRecord {
  id: string;
  tenantId: string;
  orderId: string;
  externalReference: string;
  invoiceId: string;
  chargeId: string;
  paymentUrl: string;
  invoiceStatus: BillingCreateChargeResponse["invoiceStatus"];
  chargeStatus: BillingCreateChargeResponse["chargeStatus"];
  provider: BillingCreateChargeResponse["provider"];
  createdAt: string;
  updatedAt: string;
}

export type BillingEventType =
  | "payment_link_created"
  | "payment_webhook_received"
  | "payment_confirmed"
  | "payment_failed"
  | "payment_duplicate";

export interface BillingEvent {
  id: string;
  tenantId: string;
  orderId: string;
  billingRecordId?: string;
  providerEventId?: string;
  type: BillingEventType;
  paymentStatus: OrderPaymentStatus;
  chargeStatus: BillingCreateChargeResponse["chargeStatus"] | "processing";
  message: string;
  payload: Record<string, unknown>;
  duplicate: boolean;
  createdAt: string;
}

export interface BillingWebhookPaymentEvent {
  eventId: string;
  tenantId?: string;
  orderId?: string;
  externalReference?: string;
  billingRecordId?: string;
  invoiceId?: string;
  chargeId?: string;
  paymentId?: string;
  provider?: "mock" | "external";
  status: OrderPaymentStatus | BillingCreateChargeResponse["chargeStatus"];
  occurredAt?: string;
  receivedAt?: string;
  metadata?: Record<string, string>;
  payload?: Record<string, unknown>;
}

export interface BillingWebhookPaymentResponse {
  event: BillingEvent;
  order: OrderDetail;
  duplicate: boolean;
}

export interface CreatePaymentLinkResponse {
  billing: BillingRecord;
  order: OrderDetail;
}

export interface CreateQuoteItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CreateQuoteRequest {
  customerProfileId: string;
  items: CreateQuoteItemRequest[];
  notes?: string;
}

export interface ApproveQuoteResponse {
  quote: QuoteDetail;
  order: OrderDetail;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  paymentUrl?: string;
}

export interface OrdersOverview {
  quoteCounts: Record<QuoteStatus, number>;
  orderCounts: Record<OrderStatus, number>;
  paymentCounts: Record<OrderPaymentStatus, number>;
  recentQuotes: QuoteSummary[];
  recentOrders: OrderSummary[];
  totalQuotedValue: number;
  totalOrderValue: number;
}

export interface ProductionStage {
  id: string;
  tenantId: string;
  name: string;
  orderIndex: number;
}

export interface StockItem {
  id: string;
  tenantId: string;
  name: string;
  quantityOnHand: number;
  quantityReserved: number;
}

export interface Notification {
  id: string;
  tenantId: string;
  kind: "payment_link" | "payment_confirmed" | "production_update" | "remarketing";
  status: "queued" | "sent" | "failed";
}

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface LeadSummary {
  id: string;
  tenantId: string;
  customerProfileId?: string;
  customerName: string;
  source: Lead["source"];
  stage: Lead["stage"];
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetail extends LeadSummary {
  customerProfile: CustomerProfile;
  conversationId?: string;
  notes: string;
  lastActivityAt: string;
}

export interface ConversationSummary {
  id: string;
  tenantId: string;
  leadId?: string;
  customerProfileId?: string;
  customerName: string;
  status: Conversation["status"];
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  customerProfile: CustomerProfile;
  lead?: LeadDetail;
  messages: ConversationMessage[];
}

export interface CrmOverview {
  openConversations: number;
  waitingCustomerConversations: number;
  closedConversations: number;
  leadsByStage: Record<Lead["stage"], number>;
  recentLeads: LeadSummary[];
  recentConversations: ConversationSummary[];
}

export interface CreateLeadRequest {
  customerName: string;
  source?: Lead["source"];
  stage?: Lead["stage"];
  phone?: string;
  email?: string;
  document?: string;
  notes?: string;
}

export interface CreateConversationRequest {
  customerProfileId?: string;
  leadId?: string;
  customerName?: string;
  initialMessage?: string;
}

export interface SendConversationMessageRequest {
  body: string;
  authorType?: ConversationMessage["authorType"];
}


