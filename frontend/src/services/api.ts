import { API_BASE_URL } from '../utils/format';
import type {
  AuthResponse,
  AuthUser,
  Catalog,
  CatalogStatusResponse,
  CreateCatalogResponse,
  MyCatalogsResponse,
} from '../types/catalog';

export const AUTH_TOKEN_KEY = 'vitrimini_auth_token';

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

function getAuthHeaders(tokenOverride?: string): Record<string, string> {
  const token = tokenOverride || localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
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

// Auth API
export async function registerUser(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  return safeRequest<AuthResponse>(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.'
  );
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return safeRequest<AuthResponse>(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Não foi possível entrar agora. Verifique seus dados e tente novamente.'
  );
}

export async function getMe(
  tokenOverride?: string
): Promise<{ user: AuthUser }> {
  return safeRequest<{ user: AuthUser }>(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: getAuthHeaders(tokenOverride),
    },
    'Sessão expirada. Faça login novamente.'
  );
}

export async function requestPasswordReset(
  email: string
): Promise<{ message: string }> {
  return safeRequest<{ message: string }>(
    `${API_BASE_URL}/api/auth/forgot-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    'Não foi possível solicitar a recuperação de senha agora. Tente novamente.'
  );
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  return safeRequest<{ message: string }>(
    `${API_BASE_URL}/api/auth/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Não foi possível redefinir sua senha agora. Verifique o link ou solicite um novo.'
  );
}

// Catalogs API
export async function createCatalog(
  formData: FormData,
  tokenOverride?: string
): Promise<CreateCatalogResponse> {
  return safeRequest<CreateCatalogResponse>(
    `${API_BASE_URL}/api/catalogs`,
    {
      method: 'POST',
      headers: getAuthHeaders(tokenOverride),
      body: formData,
    },
    'Não foi possível publicar sua vitrine agora. Verifique sua conexão e tente novamente.'
  );
}

export async function renewCatalog(
  catalogId: string
): Promise<CreateCatalogResponse> {
  return safeRequest<CreateCatalogResponse>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/renew`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
    'Não foi possível gerar o Pix de renovação agora. Tente novamente em instantes.'
  );
}

export async function getMyCatalogs(): Promise<MyCatalogsResponse> {
  return safeRequest<MyCatalogsResponse>(
    `${API_BASE_URL}/api/my-catalogs`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível carregar suas vitrines agora.'
  );
}

export async function getCatalogStatus(
  catalogId: string,
  paymentRecordId?: string
): Promise<CatalogStatusResponse> {
  const query = paymentRecordId
    ? `?paymentRecordId=${encodeURIComponent(paymentRecordId)}`
    : '';
  return safeRequest<CatalogStatusResponse>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/status${query}`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível verificar o status do pagamento agora.'
  );
}

export async function mockPayCatalog(
  catalogId: string
): Promise<CatalogStatusResponse> {
  return safeRequest<CatalogStatusResponse>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/mock-pay`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
    'Não foi possível confirmar o pagamento agora. Tente novamente em instantes.'
  );
}

export async function getPublicStore(
  slug: string,
  preview = false
): Promise<Catalog> {
  const query = preview ? '?preview=true' : '';
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/store/${encodeURIComponent(slug)}${query}`,
    preview ? { headers: getAuthHeaders() } : undefined,
    'Vitrine não encontrada ou indisponível no momento.'
  );
}

export async function getManageCatalog(editToken: string): Promise<Catalog> {
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/manage/${encodeURIComponent(editToken)}`,
    {
      headers: getAuthHeaders(),
    },
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
      headers: getAuthHeaders(),
      body: formData,
    },
    'Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente.'
  );
}
