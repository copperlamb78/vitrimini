import { API_BASE_URL } from '../utils/format';
import type {
  Catalog,
  CatalogStatusResponse,
  CreateCatalogResponse,
  RecoverCatalogsResponse,
} from '../types/catalog';

const TECHNICAL_PATTERNS = [
  /prisma/i,
  /invocation/i,
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /typeerror/i,
  /syntaxerror/i,
  /econnrefused/i,
  /node_modules/i,
  /[a-z]:\\/i,
  /\/src\//i,
  /<html|<!doctype/i,
  /\bat\s+\w+/i,
];

/**
 * Garante que apenas mensagens curtas, amigáveis e sem detalhes técnicos ou quebras de linha
 * sejam exibidas para o usuário na interface.
 */
export function getSafeErrorMessage(
  err: unknown,
  fallback = 'Ocorreu uma instabilidade temporária. Verifique sua conexão e tente novamente.'
): string {
  const raw =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : '';

  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 180 || trimmed.includes('\n') || trimmed.includes('\r')) {
    return fallback;
  }
  if (TECHNICAL_PATTERNS.some((regex) => regex.test(trimmed))) {
    return fallback;
  }

  return trimmed;
}

async function safeRequest<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackMessage: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(fallbackMessage);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const serverMessage =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error || '')
        : '';
    throw new Error(getSafeErrorMessage(serverMessage, fallbackMessage));
  }

  if (data === null) {
    throw new Error(fallbackMessage);
  }

  return data as T;
}

export async function createCatalog(
  formData: FormData
): Promise<CreateCatalogResponse> {
  return safeRequest<CreateCatalogResponse>(
    `${API_BASE_URL}/api/catalogs`,
    {
      method: 'POST',
      body: formData,
    },
    'Não foi possível publicar sua vitrine agora. Verifique sua conexão e tente novamente.'
  );
}

export async function getCatalogStatus(
  catalogId: string
): Promise<CatalogStatusResponse> {
  return safeRequest<CatalogStatusResponse>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/status`,
    undefined,
    'Não foi possível verificar o status do pagamento agora.'
  );
}

export async function mockPayCatalog(
  catalogId: string
): Promise<CatalogStatusResponse> {
  return safeRequest<CatalogStatusResponse>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/mock-pay`,
    { method: 'POST' },
    'Não foi possível confirmar o pagamento agora. Tente novamente em instantes.'
  );
}

export async function recoverCatalogs(
  whatsapp: string,
  verifier: string
): Promise<RecoverCatalogsResponse> {
  return safeRequest<RecoverCatalogsResponse>(
    `${API_BASE_URL}/api/catalogs/recover`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp, verifier }),
    },
    'Não foi possível consultar seus links agora. Verifique sua conexão e tente novamente.'
  );
}

export async function getPublicStore(
  slug: string,
  preview = false
): Promise<Catalog> {
  const query = preview ? '?preview=true' : '';
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/store/${encodeURIComponent(slug)}${query}`,
    undefined,
    'Vitrine não encontrada ou indisponível no momento.'
  );
}

export async function getManageCatalog(editToken: string): Promise<Catalog> {
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/manage/${encodeURIComponent(editToken)}`,
    undefined,
    'Não foi possível carregar o painel de edição. Verifique o link ou sua conexão.'
  );
}

export async function updateManageCatalog(
  editToken: string,
  formData: FormData
): Promise<Catalog> {
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/manage/${encodeURIComponent(editToken)}`,
    {
      method: 'PUT',
      body: formData,
    },
    'Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente.'
  );
}
