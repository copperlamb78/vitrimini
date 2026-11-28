import type { CatalogPlanType, CatalogStatus } from './catalog';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type HealthStage = 'DRAFT_STUCK' | 'NO_PRODUCTS' | 'READY' | 'SELLING';

export interface AdminCatalogItem {
  id: string;
  storeName: string;
  slug: string;
  status: CatalogStatus;
  planType: CatalogPlanType;
  isTrial: boolean;
  billingType: string;
  autoRenew: boolean;
  subscriptionStatus: string | null;
  logoUrl: string | null;
  whatsapp: string;
  expiresAt: string | null;
  renewalCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
  };
  _count: {
    products: number;
    orders: number;
  };
  health: {
    hasLogo: boolean;
    hasWhatsapp: boolean;
    hasProducts: boolean;
    hasOrders: boolean;
    stage: HealthStage;
  };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasUsedTrial: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  role: 'MERCHANT' | 'BUYER';
  isAdmin: boolean;
  catalogsCount: number;
  ordersCount: number;
  primaryCatalog: {
    id: string;
    storeName: string;
    slug: string;
    whatsapp: string;
  } | null;
}

export interface RadarCatalogItem {
  id: string;
  storeName: string;
  slug: string;
  status: CatalogStatus;
  planType: CatalogPlanType;
  whatsapp: string;
  expiresAt: string | null;
  lastExpirationNoticeStage: string | null;
  lastExpirationNoticeAt: string | null;
  daysRemaining: number;
  urgency: 'EXPIRED' | 'CRITICAL' | 'UPCOMING';
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RadarResponse {
  cronEnabled: boolean;
  quota: {
    sentToday: number;
    limit: number;
    autoStopThreshold: number;
    canSendAutomated: boolean;
  };
  items: RadarCatalogItem[];
}

export interface RevenueBucket {
  grossCents: number;
  feeCents: number;
  netCents: number;
  pixGrossCents: number;
  pixFeeCents: number;
  pixNetCents: number;
  cardGrossCents: number;
  cardFeeCents: number;
  cardNetCents: number;
  count: number;
}

export interface AdminFinanceSummary {
  mrrCents: number;
  planDistribution: {
    ESSENTIAL_30: number;
    PRO_30: number;
    PRO_365: number;
    TRIAL: number;
    LEGACY: number;
  };
  conversionRatePercent: number;
  paidCatalogsCount: number;
  totalCatalogs: number;
  pendingLast7d: number;
  revenue30d: RevenueBucket;
  revenueTotal: RevenueBucket;
}

export interface AdminPaymentItem {
  id: string;
  type: 'CREATION' | 'RENEWAL';
  planCode: string;
  status: 'PENDING' | 'PAID';
  amountCents: number;
  feeCents: number | null;
  netAmountCents: number | null;
  gatewayId: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
  catalog: {
    id: string;
    storeName: string;
    slug: string;
    billingType: string;
    mpPreapprovalId: string | null;
  };
}

export interface WebhookLogItem {
  id: string;
  provider: string;
  eventType: string;
  externalResourceId: string | null;
  catalogId: string | null;
  paymentId: string | null;
  status: 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED';
  httpStatus: number | null;
  errorMessage: string | null;
  payloadJson: unknown;
  processedAt: string | null;
  createdAt: string;
}

export interface SystemErrorItem {
  id: string;
  fingerprint: string;
  source: 'BACKEND' | 'FRONTEND' | 'WEBHOOK' | 'CRON' | 'EMAIL';
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  category: string;
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  statusCode: number | null;
  userId: string | null;
  catalogId: string | null;
  contextJson: unknown;
  occurrenceCount: number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  resolutionNote: string | null;
  resolvedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SystemErrorsResponse extends PaginatedResponse<SystemErrorItem> {
  summary: {
    openCount: number;
    critical24hCount: number;
    frontendOpenCount: number;
    backendOpenCount: number;
    paymentOpenCount: number;
  };
}

export interface AdminEmailLogItem {
  id: string;
  type: string;
  recipient: string;
  status: 'SENT' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
}

export interface PromoCouponItem {
  id: string;
  code: string;
  description: string | null;
  type: 'EXTENDED_TRIAL' | 'BONUS_DAYS';
  bonusDays: number;
  targetPlanCode: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface GlobalAnnouncementItem {
  id: string;
  title: string;
  message: string;
  variant: 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  dismissible: boolean;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  metadata: unknown;
  createdAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  description: string | null;
  type: string;
  bonusDays: number;
  targetPlanCode: string | null;
}
