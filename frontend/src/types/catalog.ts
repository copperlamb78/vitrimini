import type { ThemeId } from '../constants/themes';

export type CatalogStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  _count?: {
    catalogs: number;
    payments: number;
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
  storeName: string;
  logoUrl: string | null;
  themeColor: ThemeId | string;
  whatsapp: string;
  pixKey: string | null;
  depositPct: number;
  deliveryDates: string[];
  notes: string | null;
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
  qrCodeBase64: string;
  pixCopyPaste: string;
  mockMode: boolean;
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
  isExpired?: boolean;
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
