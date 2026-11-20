import type { ThemeId } from '../constants/themes';

export type CatalogStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasUsedTrial?: boolean;
  canUseTrial?: boolean;
  createdAt?: string;
  _count?: {
    catalogs: number;
    payments?: number;
    orders?: number;
  };
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  catalogId?: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  orderIndex: number;
  available: boolean;
}

export interface Catalog {
  id: string;
  slug: string;
  editToken?: string;
  status: CatalogStatus;
  userId?: string;
  renewalCount?: number;
  isTrial?: boolean;
  storeName: string;
  logoUrl: string | null;
  themeColor: ThemeId | string;
  whatsapp: string;
  pixKey: string | null;
  depositPct: number;
  paymentNotice?: string | null;
  deliveryDates: string[];
  notes: string | null;
  pickupAddress?: string | null;
  pickupInstructions?: string | null;
  deliveryEstimate?: string | null;
  notifyOrderByEmail?: boolean;
  expiresAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  products: Product[];
}

export interface CreateCatalogResponse {
  catalogId: string;
  paymentRecordId?: string;
  slug: string;
  editToken: string;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
  mockMode?: boolean;
  activatedByTrial?: boolean;
  expiresAt?: string | null;
}

export interface CatalogStatusResponse {
  status: CatalogStatus;
  slug: string;
  editToken: string;
  expiresAt?: string | null;
  renewalCount?: number;
  paymentPaid?: boolean;
}

export interface MyCatalogItem {
  id: string;
  storeName: string;
  slug: string;
  editToken: string;
  status: CatalogStatus;
  isTrial?: boolean;
  isExpired?: boolean;
  daysLeft?: number | null;
  daysLeftToDelete?: number | null;
  expiresAt: string | null;
  renewalCount: number;
  logoUrl: string | null;
  themeColor: ThemeId | string;
  createdAt: string;
  _count: {
    products: number;
  };
}

export interface MyCatalogsResponse {
  catalogs: MyCatalogItem[];
  canUseTrial?: boolean;
}

export interface DraftProductItem {
  localId: string;
  name: string;
  description: string;
  priceInput: string;
  available: boolean;
  previewDataUrl?: string;
  blob?: Blob;
}

export type OrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryType = 'PICKUP' | 'DELIVERY';

export type OrderPaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'OTHER';

export interface OrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  trackingCode: string;
  catalogId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  deliveryAddress: string | null;
  deliveryDate: string | null;
  paymentMethod: OrderPaymentMethod;
  notes: string | null;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderResponse {
  orderNumber: number;
  trackingCode: string;
  totalCents: number;
  status: OrderStatus;
  trackingUrl: string;
}

export interface PublicTrackedOrder {
  orderNumber: number;
  trackingCode: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryDate: string | null;
  paymentMethod: OrderPaymentMethod;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  store: {
    storeName: string;
    slug: string;
    themeColor: string;
    logoUrl: string | null;
    whatsapp: string;
    pickupAddress?: string | null;
    pickupInstructions?: string | null;
    deliveryEstimate?: string | null;
    pixKey?: string | null;
  };
  items: OrderItem[];
}

export interface MyCustomerOrder {
  id: string;
  orderNumber: number;
  trackingCode: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryDate: string | null;
  paymentMethod: OrderPaymentMethod;
  totalCents: number;
  createdAt: string;
  catalog: {
    storeName: string;
    slug: string;
    logoUrl: string | null;
    themeColor: string;
  };
  items: OrderItem[];
}

export interface CatalogAnalytics {
  period: string;
  confirmedRevenueCents: number;
  pendingRevenueCents: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  averageTicketCents: number;
  topProducts: Array<{
    productName: string;
    quantitySold: number;
    revenueCents: number;
  }>;
  topCustomers: Array<{
    customerPhone: string;
    customerName: string;
    ordersCount: number;
    totalSpentCents: number;
    lastOrderAt: string;
  }>;
}

export interface AdminOverviewResponse {
  brevo: {
    dailyLimit: number;
    sentToday: number;
    failedToday: number;
    usagePercent: number;
    last7Days: Array<{ date: string; sent: number; failed: number }>;
    recentLogs: Array<{
      id: string;
      type: string;
      recipient: string;
      status: 'SENT' | 'FAILED';
      errorMessage: string | null;
      createdAt: string;
    }>;
  };
  saas: {
    totalUsers: number;
    usersWithCatalogs: number;
    catalogsByStatus: {
      ACTIVE: number;
      DRAFT: number;
      EXPIRED: number;
    };
    totalOrders: number;
    revenueTodayCents: number;
    paymentsTodayCount: number;
    revenue30dCents: number;
    payments30dCount: number;
    revenueTotalCents: number;
    paymentsTotalCount: number;
  };
  recentCatalogs: Array<{
    id: string;
    storeName: string;
    slug: string;
    status: CatalogStatus;
    expiresAt: string | null;
    renewalCount: number;
    createdAt: string;
    user: { name: string; email: string };
    _count: { products: number; orders: number };
  }>;
  recentPayments: Array<{
    id: string;
    type: 'CREATION' | 'RENEWAL';
    status: 'PENDING' | 'PAID';
    amountCents: number;
    gatewayId: string | null;
    paidAt: string | null;
    createdAt: string;
    user: { name: string; email: string };
    catalog: { storeName: string; slug: string };
  }>;
}
