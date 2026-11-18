import type { ThemeId } from '../constants/themes';

export type CatalogStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED';

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
}

export interface RecoveredCatalogItem {
  catalogId: string;
  storeName: string;
  slug: string;
  editToken: string;
  expiresAt: string | null;
}

export interface RecoverCatalogsResponse {
  catalogs: RecoveredCatalogItem[];
}

export interface SavedCatalogEntry {
  catalogId: string;
  storeName: string;
  slug: string;
  editToken: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  mockMode: boolean;
  status: 'DRAFT' | 'ACTIVE';
  createdAt: number;
  dismissed?: boolean;
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
