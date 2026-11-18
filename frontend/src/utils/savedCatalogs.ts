import type {
  RecoveredCatalogItem,
  SavedCatalogEntry,
} from '../types/catalog';

export const SAVED_CATALOGS_KEY = 'vitrimini_saved_catalogs';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function getSavedCatalogs(): SavedCatalogEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_CATALOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedCatalogEntry =>
        Boolean(item && item.catalogId && item.slug && item.editToken)
    );
  } catch {
    return [];
  }
}

function writeSavedCatalogs(entries: SavedCatalogEntry[]): SavedCatalogEntry[] {
  try {
    localStorage.setItem(SAVED_CATALOGS_KEY, JSON.stringify(entries));
  } catch {
    // Fallback sem qrCodeBase64 caso cota de localStorage esteja cheia
    try {
      const compact = entries.map((e) =>
        e.status === 'ACTIVE' ? { ...e, qrCodeBase64: '' } : e
      );
      localStorage.setItem(SAVED_CATALOGS_KEY, JSON.stringify(compact));
    } catch {
      // Ignora erro de quota
    }
  }
  return entries;
}

export function saveDraftCatalog(
  input: Omit<SavedCatalogEntry, 'status' | 'createdAt' | 'dismissed'>
): SavedCatalogEntry[] {
  const current = getSavedCatalogs().filter(
    (item) => item.catalogId !== input.catalogId
  );

  const nextEntry: SavedCatalogEntry = {
    ...input,
    status: 'DRAFT',
    createdAt: Date.now(),
    dismissed: false,
  };

  return writeSavedCatalogs([nextEntry, ...current]);
}

export function markCatalogActive(
  catalogId: string,
  patch?: { slug?: string; editToken?: string; storeName?: string }
): SavedCatalogEntry[] {
  const current = getSavedCatalogs();
  const updated = current.map((item) =>
    item.catalogId === catalogId
      ? {
          ...item,
          status: 'ACTIVE' as const,
          slug: patch?.slug ?? item.slug,
          editToken: patch?.editToken ?? item.editToken,
          storeName: patch?.storeName ?? item.storeName,
          dismissed: false,
        }
      : item
  );
  return writeSavedCatalogs(updated);
}

export function dismissDraftCatalog(catalogId: string): SavedCatalogEntry[] {
  const current = getSavedCatalogs();
  const updated = current.map((item) =>
    item.catalogId === catalogId ? { ...item, dismissed: true } : item
  );
  return writeSavedCatalogs(updated);
}

export function mergeRecoveredCatalogs(
  recovered: RecoveredCatalogItem[]
): SavedCatalogEntry[] {
  const current = getSavedCatalogs();
  const byId = new Map<string, SavedCatalogEntry>();
  for (const item of current) {
    byId.set(item.catalogId, item);
  }

  for (const rec of recovered) {
    const existing = byId.get(rec.catalogId);
    byId.set(rec.catalogId, {
      catalogId: rec.catalogId,
      storeName: rec.storeName,
      slug: rec.slug,
      editToken: rec.editToken,
      qrCodeBase64: existing?.qrCodeBase64 ?? '',
      pixCopyPaste: existing?.pixCopyPaste ?? '',
      mockMode: existing?.mockMode ?? false,
      status: 'ACTIVE',
      createdAt: existing?.createdAt ?? Date.now(),
      dismissed: false,
    });
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  return writeSavedCatalogs(merged);
}

export function getResumableDraftCatalog(
  entries: SavedCatalogEntry[]
): SavedCatalogEntry | null {
  const now = Date.now();
  return (
    entries.find(
      (item) =>
        item.status === 'DRAFT' &&
        !item.dismissed &&
        now - item.createdAt <= TWO_HOURS_MS
    ) ?? null
  );
}

export function getRecentDraftsToCheck(
  entries: SavedCatalogEntry[]
): SavedCatalogEntry[] {
  const now = Date.now();
  return entries.filter(
    (item) => item.status === 'DRAFT' && now - item.createdAt <= TWO_HOURS_MS
  );
}
