import { API_BASE_URL } from '../utils/format';
import type {
  AdminOverviewResponse,
  AuthResponse,
  AuthUser,
  Catalog,
  CatalogAnalytics,
  CatalogStatusResponse,
  CreateCatalogResponse,
  CreateOrderResponse,
  DeliveryType,
  MyCatalogsResponse,
  MyCustomerOrder,
  Order,
  OrderPaymentMethod,
  OrderStatus,
  PublicTrackedOrder,
} from '../types/catalog';

export const AUTH_TOKEN_KEY = 'vitrimini_auth_token';
export const AUTH_USER_KEY = 'vitrimini_auth_user';
export const AUTH_SESSION_HINT_KEY = 'vitrimini_has_session';
const LEGACY_SAVED_CATALOGS_KEY = 'vitrimini_saved_catalogs';

export function isJwtTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function clearStoredAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_SESSION_HINT_KEY);
    localStorage.removeItem(LEGACY_SAVED_CATALOGS_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignora falhas de storage
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
}

let inFlightRefreshPromise: Promise<AuthResponse | null> | null = null;

export async function refreshAuthSession(): Promise<AuthResponse | null> {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json().catch(() => null)) as AuthResponse | null;
      if (!data?.token || !data?.user) {
        return null;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: data }));
      }
      return data;
    } catch {
      return null;
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

function isPrivatePathname(pathname: string): boolean {
  return (
    pathname.startsWith('/painel') ||
    pathname.startsWith('/minhas-vitrines') ||
    pathname.startsWith('/meus-pedidos') ||
    pathname.startsWith('/super-admin')
  );
}

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
  fallbackMessage: string,
  hasRetried = false
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: 'include',
    });
  } catch {
    throw new Error(fallbackMessage);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && init?.headers) {
      const headersObj = init.headers as Record<string, string>;
      if (headersObj.Authorization) {
        if (!hasRetried) {
          const refreshed = await refreshAuthSession();
          if (refreshed?.token) {
            return safeRequest<T>(
              url,
              {
                ...init,
                headers: {
                  ...headersObj,
                  Authorization: `Bearer ${refreshed.token}`,
                },
              },
              fallbackMessage,
              true
            );
          }
        }

        clearStoredAuthSession();
        if (
          typeof window !== 'undefined' &&
          isPrivatePathname(window.location.pathname)
        ) {
          const currentTarget = `${window.location.pathname}${window.location.search}`;
          window.location.assign(
            `/entrar?redirect=${encodeURIComponent(currentTarget)}`
          );
        }
      }
    }

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

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Silencioso: a limpeza local ocorre de qualquer forma
  }
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
    'Sua conexão expirou. Entre novamente.'
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

// Authenticated Catalog Management (by catalogId + token redirect)
export async function resolveEditToken(
  editToken: string
): Promise<{ catalogId: string }> {
  return safeRequest<{ catalogId: string }>(
    `${API_BASE_URL}/api/catalogs/resolve-token/${encodeURIComponent(editToken)}`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível localizar esta vitrine na sua conta.'
  );
}

export async function getCatalogById(catalogId: string): Promise<Catalog> {
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível carregar o painel da vitrine.'
  );
}

export async function updateCatalogById(
  catalogId: string,
  formData: FormData
): Promise<Catalog> {
  return safeRequest<Catalog>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: formData,
    },
    'Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente.'
  );
}

// Orders API (Public + Merchant)
export async function createStoreOrder(
  slug: string,
  input: {
    customerName: string;
    customerPhone: string;
    deliveryType: DeliveryType;
    deliveryAddress?: string | null;
    deliveryDate?: string | null;
    paymentMethod: OrderPaymentMethod;
    notes?: string | null;
    items: Array<{ productId: string; quantity: number }>;
  }
): Promise<CreateOrderResponse> {
  let tokenOverride: string | undefined;
  if (typeof window !== 'undefined') {
    const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const hasSessionHint = localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1';
    if ((currentToken && isJwtTokenExpired(currentToken)) || (!currentToken && hasSessionHint)) {
      const refreshed = await refreshAuthSession();
      if (refreshed?.token) {
        tokenOverride = refreshed.token;
      }
    }
  }

  return safeRequest<CreateOrderResponse>(
    `${API_BASE_URL}/api/store/${encodeURIComponent(slug)}/orders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(tokenOverride),
      },
      body: JSON.stringify(input),
    },
    'Não foi possível registrar seu pedido agora. Verifique os dados e tente novamente.'
  );
}

export async function getMyOrders(): Promise<{ orders: MyCustomerOrder[] }> {
  return safeRequest<{ orders: MyCustomerOrder[] }>(
    `${API_BASE_URL}/api/orders/mine`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível carregar seus pedidos agora.'
  );
}

export async function trackPublicOrder(
  trackingCode: string
): Promise<PublicTrackedOrder> {
  return safeRequest<PublicTrackedOrder>(
    `${API_BASE_URL}/api/orders/track/${encodeURIComponent(trackingCode)}`,
    undefined,
    'Pedido não encontrado.'
  );
}

export async function getCatalogOrders(
  catalogId: string,
  params?: { status?: string; period?: string }
): Promise<{ orders: Order[] }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.period) qs.set('period', params.period);
  const query = qs.toString() ? `?${qs.toString()}` : '';

  return safeRequest<{ orders: Order[] }>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/orders${query}`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível carregar os pedidos desta vitrine.'
  );
}

export async function updateCatalogOrderStatus(
  catalogId: string,
  orderId: string,
  status: OrderStatus
): Promise<{ order: Order }> {
  return safeRequest<{ order: Order }>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    },
    'Não foi possível atualizar o status do pedido.'
  );
}

export async function getCatalogAnalytics(
  catalogId: string,
  period = '30d'
): Promise<CatalogAnalytics> {
  return safeRequest<CatalogAnalytics>(
    `${API_BASE_URL}/api/catalogs/${encodeURIComponent(catalogId)}/analytics?period=${encodeURIComponent(period)}`,
    {
      headers: getAuthHeaders(),
    },
    'Não foi possível carregar os indicadores financeiros.'
  );
}

// Super Admin API
export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  return safeRequest<AdminOverviewResponse>(
    `${API_BASE_URL}/api/admin/overview`,
    {
      headers: getAuthHeaders(),
    },
    'Acesso negado ou sua conexão expirou.'
  );
}
