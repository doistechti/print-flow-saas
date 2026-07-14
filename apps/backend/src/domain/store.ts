import crypto from "node:crypto";
import type {
  AuthSession,
  Conversation,
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  CrmOverview,
  CreateConversationRequest,
  CreateLeadRequest,
  CustomerProfile,
  Lead,
  LeadDetail,
  LeadSummary,
  Role,
  RoleSummary,
  Tenant,
  TenantMembership,
  TenantSummary,
  User,
  UserSummary,
} from "@print-flow/contracts";

function now() {
  return new Date().toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function createPasswordHash(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha256").toString("hex");
}

function seedPassword(password: string, salt: string) {
  return {
    salt,
    hash: createPasswordHash(password, salt),
  };
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export const tenants: Tenant[] = [
  {
    id: "tenant_alfa_print",
    name: "Alfa Print",
    slug: "alfa-print",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "tenant_nova_graph",
    name: "Nova Graph",
    slug: "nova-graph",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  },
];

export const roles: Role[] = [
  {
    id: "role_owner",
    tenantId: "tenant_alfa_print",
    name: "Owner",
    permissions: ["auth:manage", "tenants:switch", "orders:write", "catalog:write", "crm:write"],
  },
  {
    id: "role_operator",
    tenantId: "tenant_alfa_print",
    name: "Operator",
    permissions: ["orders:read", "orders:write", "crm:write"],
  },
  {
    id: "role_manager",
    tenantId: "tenant_nova_graph",
    name: "Manager",
    permissions: ["auth:manage", "tenants:switch", "orders:write", "production:write", "crm:write"],
  },
  {
    id: "role_sales",
    tenantId: "tenant_nova_graph",
    name: "Sales",
    permissions: ["orders:read", "orders:write", "catalog:read", "crm:write"],
  },
];

const passwordBook = new Map<string, { salt: string; hash: string }>([
  ["admin@printflow.local", seedPassword("printflow123", "admin-print-flow")],
  ["sales@printflow.local", seedPassword("printflow123", "sales-print-flow")],
]);

export const users: User[] = [
  {
    id: "user_admin",
    name: "Ana Admin",
    email: "admin@printflow.local",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "user_sales",
    name: "Bruno Sales",
    email: "sales@printflow.local",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  },
];

export const memberships: TenantMembership[] = [
  {
    id: "membership_admin_alfa",
    tenantId: "tenant_alfa_print",
    userId: "user_admin",
    roleId: "role_owner",
    status: "active",
    defaultTenant: true,
    createdAt: now(),
  },
  {
    id: "membership_admin_nova",
    tenantId: "tenant_nova_graph",
    userId: "user_admin",
    roleId: "role_manager",
    status: "active",
    defaultTenant: false,
    createdAt: now(),
  },
  {
    id: "membership_sales_alfa",
    tenantId: "tenant_alfa_print",
    userId: "user_sales",
    roleId: "role_operator",
    status: "active",
    defaultTenant: true,
    createdAt: now(),
  },
  {
    id: "membership_sales_nova",
    tenantId: "tenant_nova_graph",
    userId: "user_sales",
    roleId: "role_sales",
    status: "active",
    defaultTenant: false,
    createdAt: now(),
  },
];

export const customerProfiles: CustomerProfile[] = [
  {
    id: "customer_maria",
    tenantId: "tenant_alfa_print",
    name: "Maria Costa",
    phone: "+55 11 99999-1101",
    email: "maria@acme.com",
    createdAt: minutesAgo(240),
    updatedAt: minutesAgo(12),
  },
  {
    id: "customer_joao",
    tenantId: "tenant_alfa_print",
    name: "Joao Ribeiro",
    phone: "+55 11 98888-2202",
    email: "joao@studio.com",
    createdAt: minutesAgo(180),
    updatedAt: minutesAgo(28),
  },
  {
    id: "customer_lucia",
    tenantId: "tenant_nova_graph",
    name: "Lucia Melo",
    phone: "+55 21 97777-3303",
    email: "lucia@evento.com",
    createdAt: minutesAgo(200),
    updatedAt: minutesAgo(18),
  },
];

export const leads: Lead[] = [
  {
    id: "lead_maria",
    tenantId: "tenant_alfa_print",
    customerProfileId: "customer_maria",
    source: "whatsapp",
    stage: "qualified",
    createdAt: minutesAgo(220),
    updatedAt: minutesAgo(12),
  },
  {
    id: "lead_joao",
    tenantId: "tenant_alfa_print",
    customerProfileId: "customer_joao",
    source: "manual",
    stage: "contacted",
    createdAt: minutesAgo(170),
    updatedAt: minutesAgo(28),
  },
  {
    id: "lead_lucia",
    tenantId: "tenant_nova_graph",
    customerProfileId: "customer_lucia",
    source: "web",
    stage: "new",
    createdAt: minutesAgo(190),
    updatedAt: minutesAgo(18),
  },
];

export const conversations: Conversation[] = [
  {
    id: "conv_maria",
    tenantId: "tenant_alfa_print",
    leadId: "lead_maria",
    customerProfileId: "customer_maria",
    status: "open",
    lastMessageAt: minutesAgo(12),
    createdAt: minutesAgo(220),
    updatedAt: minutesAgo(12),
  },
  {
    id: "conv_joao",
    tenantId: "tenant_alfa_print",
    leadId: "lead_joao",
    customerProfileId: "customer_joao",
    status: "waiting_customer",
    lastMessageAt: minutesAgo(28),
    createdAt: minutesAgo(170),
    updatedAt: minutesAgo(28),
  },
  {
    id: "conv_lucia",
    tenantId: "tenant_nova_graph",
    leadId: "lead_lucia",
    customerProfileId: "customer_lucia",
    status: "open",
    lastMessageAt: minutesAgo(18),
    createdAt: minutesAgo(190),
    updatedAt: minutesAgo(18),
  },
];

export const conversationMessages: ConversationMessage[] = [
  {
    id: "msg_maria_1",
    tenantId: "tenant_alfa_print",
    conversationId: "conv_maria",
    authorType: "customer",
    body: "Quero 500 cartoes de visita frente e verso com verniz localizado.",
    createdAt: minutesAgo(220),
    updatedAt: minutesAgo(220),
  },
  {
    id: "msg_maria_2",
    tenantId: "tenant_alfa_print",
    conversationId: "conv_maria",
    authorType: "operator",
    body: "Perfeito. Vou montar o orcamento com acabamento premium e te retorno.",
    createdAt: minutesAgo(12),
    updatedAt: minutesAgo(12),
  },
  {
    id: "msg_joao_1",
    tenantId: "tenant_alfa_print",
    conversationId: "conv_joao",
    authorType: "customer",
    body: "Preciso de 2 mil folders para um evento em duas cores.",
    createdAt: minutesAgo(170),
    updatedAt: minutesAgo(170),
  },
  {
    id: "msg_joao_2",
    tenantId: "tenant_alfa_print",
    conversationId: "conv_joao",
    authorType: "operator",
    body: "Vou calcular o melhor formato e te envio o link do pedido.",
    createdAt: minutesAgo(28),
    updatedAt: minutesAgo(28),
  },
  {
    id: "msg_lucia_1",
    tenantId: "tenant_nova_graph",
    conversationId: "conv_lucia",
    authorType: "customer",
    body: "Vocês fazem lona para feira com entrega urgente?",
    createdAt: minutesAgo(190),
    updatedAt: minutesAgo(190),
  },
  {
    id: "msg_lucia_2",
    tenantId: "tenant_nova_graph",
    conversationId: "conv_lucia",
    authorType: "system",
    body: "Conversa aberta pelo portal a partir do lead web.",
    createdAt: minutesAgo(18),
    updatedAt: minutesAgo(18),
  },
];

function getCustomerName(customerProfileId?: string) {
  if (!customerProfileId) {
    return "Cliente sem cadastro";
  }

  return findCustomerProfileById(customerProfileId)?.name ?? "Cliente sem cadastro";
}

function getConversationMessages(conversationId: string) {
  return conversationMessages
    .filter((message) => message.conversationId === conversationId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function getConversationLastMessage(conversationId: string) {
  const messages = getConversationMessages(conversationId);
  return messages[messages.length - 1] ?? null;
}

function getConversationUnreadCount(conversation: Conversation) {
  if (conversation.status === "waiting_customer") {
    return 1;
  }

  return 0;
}

export function verifyPassword(email: string, password: string) {
  const credential = passwordBook.get(email.toLowerCase());

  if (!credential) {
    return false;
  }

  const candidateHash = crypto
    .pbkdf2Sync(password, credential.salt, 120000, 64, "sha256")
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(credential.hash));
}

export function toTenantSummary(tenant: Tenant): TenantSummary {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
  };
}

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
  };
}

export function toRoleSummary(role: Role): RoleSummary {
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions,
  };
}

export function listTenantsForUser(userId: string) {
  const tenantIds = memberships
    .filter((membership) => membership.userId === userId && membership.status === "active")
    .map((membership) => membership.tenantId);

  return tenants.filter((tenant) => tenantIds.includes(tenant.id));
}

export function findUserByEmail(email: string) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findUserById(userId: string) {
  return users.find((user) => user.id === userId) ?? null;
}

export function findTenantBySlug(slug: string) {
  return tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export function findTenantById(tenantId: string) {
  return tenants.find((tenant) => tenant.id === tenantId) ?? null;
}

export function findRoleById(roleId: string) {
  return roles.find((role) => role.id === roleId) ?? null;
}

export function findMembership(userId: string, tenantId: string) {
  return (
    memberships.find(
      (membership) =>
        membership.userId === userId &&
        membership.tenantId === tenantId &&
        membership.status === "active",
    ) ?? null
  );
}

export function getDefaultMembership(userId: string) {
  return (
    memberships.find(
      (membership) =>
        membership.userId === userId && membership.status === "active" && membership.defaultTenant,
    ) ??
    memberships.find((membership) => membership.userId === userId && membership.status === "active") ??
    null
  );
}

export function buildAuthSession(user: User, tenant: Tenant, membership: TenantMembership): AuthSession {
  const role = findRoleById(membership.roleId);

  if (!role) {
    throw new Error("Role not found for membership");
  }

  return {
    accessToken: "",
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    user: toUserSummary(user),
    tenant: toTenantSummary(tenant),
    role: toRoleSummary(role),
    availableTenants: listTenantsForUser(user.id).map(toTenantSummary),
  };
}

export function findCustomerProfileById(customerProfileId: string) {
  return customerProfiles.find((profile) => profile.id === customerProfileId) ?? null;
}

export function listCustomerProfilesForTenant(tenantId: string) {
  return customerProfiles.filter((profile) => profile.tenantId === tenantId);
}

export function findLeadById(leadId: string) {
  return leads.find((lead) => lead.id === leadId) ?? null;
}

export function listLeadsForTenant(tenantId: string) {
  return leads
    .filter((lead) => lead.tenantId === tenantId)
    .map((lead) => buildLeadSummary(lead))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function findConversationById(conversationId: string) {
  return conversations.find((conversation) => conversation.id === conversationId) ?? null;
}

export function findConversationByLeadId(leadId: string) {
  return conversations.find((conversation) => conversation.leadId === leadId) ?? null;
}

export function listConversationsForTenant(tenantId: string) {
  return conversations
    .filter((conversation) => conversation.tenantId === tenantId)
    .map((conversation) => buildConversationSummary(conversation))
    .sort((left, right) => {
      const leftTime = left.lastMessageAt ?? left.updatedAt;
      const rightTime = right.lastMessageAt ?? right.updatedAt;
      return rightTime.localeCompare(leftTime);
    });
}

function buildLeadSummary(lead: Lead): LeadSummary {
  const customerProfile = lead.customerProfileId ? findCustomerProfileById(lead.customerProfileId) : null;

  return {
    id: lead.id,
    tenantId: lead.tenantId,
    customerProfileId: lead.customerProfileId,
    customerName: customerProfile?.name ?? "Cliente sem cadastro",
    source: lead.source,
    stage: lead.stage,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function buildLeadDetail(lead: Lead): LeadDetail {
  const customerProfile = lead.customerProfileId
    ? findCustomerProfileById(lead.customerProfileId)
    : null;
  const conversation = findConversationByLeadId(lead.id);
  const lastActivityAt = conversation?.lastMessageAt ?? lead.updatedAt;

  return {
    ...buildLeadSummary(lead),
    customerProfile: customerProfile ?? {
      id: lead.customerProfileId ?? createId("customer_placeholder"),
      tenantId: lead.tenantId,
      name: "Cliente sem cadastro",
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    },
    conversationId: conversation?.id,
    notes: conversation ? `Conversa ${conversation.status} vinculada ao lead.` : "Lead aguardando conversa.",
    lastActivityAt,
  };
}

function buildConversationSummary(conversation: Conversation): ConversationSummary {
  const customerProfile = conversation.customerProfileId
    ? findCustomerProfileById(conversation.customerProfileId)
    : null;
  const lastMessage = getConversationLastMessage(conversation.id);

  return {
    id: conversation.id,
    tenantId: conversation.tenantId,
    leadId: conversation.leadId,
    customerProfileId: conversation.customerProfileId,
    customerName: customerProfile?.name ?? getCustomerName(conversation.customerProfileId),
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: lastMessage?.body,
    unreadCount: getConversationUnreadCount(conversation),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function buildConversationDetail(conversation: Conversation): ConversationDetail {
  const customerProfile = conversation.customerProfileId
    ? findCustomerProfileById(conversation.customerProfileId)
    : null;
  const lead = conversation.leadId ? findLeadById(conversation.leadId) : null;

  return {
    ...buildConversationSummary(conversation),
    customerProfile: customerProfile ?? {
      id: conversation.customerProfileId ?? createId("customer_placeholder"),
      tenantId: conversation.tenantId,
      name: getCustomerName(conversation.customerProfileId),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    lead: lead ? buildLeadDetail(lead) : undefined,
    messages: getConversationMessages(conversation.id),
  };
}

export function getCrmOverview(tenantId: string): CrmOverview {
  const tenantLeads = leads.filter((lead) => lead.tenantId === tenantId);
  const tenantConversations = conversations.filter((conversation) => conversation.tenantId === tenantId);

  const leadsByStage: CrmOverview["leadsByStage"] = {
    new: 0,
    contacted: 0,
    qualified: 0,
    won: 0,
    lost: 0,
  };

  for (const lead of tenantLeads) {
    leadsByStage[lead.stage] += 1;
  }

  return {
    openConversations: tenantConversations.filter((conversation) => conversation.status === "open").length,
    waitingCustomerConversations: tenantConversations.filter((conversation) => conversation.status === "waiting_customer").length,
    closedConversations: tenantConversations.filter((conversation) => conversation.status === "closed").length,
    leadsByStage,
    recentLeads: tenantLeads
      .map((lead) => buildLeadSummary(lead))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentConversations: tenantConversations
      .map((conversation) => buildConversationSummary(conversation))
      .sort((left, right) => (right.lastMessageAt ?? right.updatedAt).localeCompare(left.lastMessageAt ?? left.updatedAt))
      .slice(0, 5),
  };
}

export function getConversationDetail(tenantId: string, conversationId: string) {
  const conversation = findConversationById(conversationId);

  if (!conversation || conversation.tenantId !== tenantId) {
    return null;
  }

  return buildConversationDetail(conversation);
}

export function listConversationDetailsForTenant(tenantId: string) {
  return conversations
    .filter((conversation) => conversation.tenantId === tenantId)
    .map((conversation) => buildConversationDetail(conversation))
    .sort((left, right) => (right.lastMessageAt ?? right.updatedAt).localeCompare(left.lastMessageAt ?? left.updatedAt));
}

export function createLead(tenantId: string, payload: CreateLeadRequest) {
  const timestamp = now();
  const customerProfile: CustomerProfile = {
    id: createId("customer"),
    tenantId,
    name: payload.customerName,
    document: payload.document,
    phone: payload.phone,
    email: payload.email,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  customerProfiles.unshift(customerProfile);

  const lead: Lead = {
    id: createId("lead"),
    tenantId,
    customerProfileId: customerProfile.id,
    source: payload.source ?? "manual",
    stage: payload.stage ?? "new",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  leads.unshift(lead);

  const conversation: Conversation = {
    id: createId("conv"),
    tenantId,
    leadId: lead.id,
    customerProfileId: customerProfile.id,
    status: "open",
    lastMessageAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  conversations.unshift(conversation);

  const createdMessages: ConversationMessage[] = [];
  if (payload.notes) {
    createdMessages.push({
      id: createId("msg"),
      tenantId,
      conversationId: conversation.id,
      authorType: "system",
      body: payload.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  if (createdMessages.length > 0) {
    conversationMessages.unshift(...createdMessages);
  }

  return {
    lead: buildLeadDetail(lead),
    conversation: buildConversationDetail(conversation),
  };
}

export function createConversation(tenantId: string, payload: CreateConversationRequest) {
  const timestamp = now();
  let customerProfile = payload.customerProfileId
    ? findCustomerProfileById(payload.customerProfileId)
    : null;
  let lead = payload.leadId ? findLeadById(payload.leadId) : null;

  if (lead && lead.tenantId !== tenantId) {
    throw new Error("Lead belongs to another tenant");
  }

  if (customerProfile && customerProfile.tenantId !== tenantId) {
    throw new Error("Customer belongs to another tenant");
  }

  if (lead && !customerProfile && lead.customerProfileId) {
    customerProfile = findCustomerProfileById(lead.customerProfileId);
  }

  if (!customerProfile && payload.customerName) {
    customerProfile = {
      id: createId("customer"),
      tenantId,
      name: payload.customerName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    customerProfiles.unshift(customerProfile);
  }

  if (!customerProfile) {
    throw new Error("Customer profile is required");
  }

  const existingConversation =
    (lead ? findConversationByLeadId(lead.id) : null) ??
    conversations.find(
      (conversation) =>
        conversation.tenantId === tenantId && conversation.customerProfileId === customerProfile?.id,
    ) ??
    null;

  if (existingConversation) {
    return buildConversationDetail(existingConversation);
  }

  if (!lead && payload.leadId) {
    lead = findLeadById(payload.leadId);
  }

  const conversation: Conversation = {
    id: createId("conv"),
    tenantId,
    leadId: lead?.id,
    customerProfileId: customerProfile.id,
    status: "open",
    lastMessageAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  conversations.unshift(conversation);

  if (payload.initialMessage) {
    conversationMessages.unshift({
      id: createId("msg"),
      tenantId,
      conversationId: conversation.id,
      authorType: "customer",
      body: payload.initialMessage,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return buildConversationDetail(conversation);
}

export function appendConversationMessage(
  tenantId: string,
  conversationId: string,
  payload: { body: string; authorType?: ConversationMessage["authorType"] },
) {
  const conversation = findConversationById(conversationId);

  if (!conversation || conversation.tenantId !== tenantId) {
    return null;
  }

  const timestamp = now();
  const message: ConversationMessage = {
    id: createId("msg"),
    tenantId,
    conversationId,
    authorType: payload.authorType ?? "operator",
    body: payload.body,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  conversationMessages.unshift(message);
  conversation.lastMessageAt = timestamp;
  conversation.updatedAt = timestamp;
  conversation.status = message.authorType === "customer" ? "waiting_customer" : conversation.status;

  return buildConversationDetail(conversation);
}
