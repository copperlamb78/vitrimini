import { API_BASE_URL } from '../utils/format';
import { getAccessToken, getImpersonationToken } from './api';
import type {
  AdminCatalogItem,
  AdminEmailLogItem,
  AdminFinanceSummary,
  AdminPaymentItem,
  AdminUserItem,
  AuditLogItem,
  CouponValidationResult,
  GlobalAnnouncementItem,
  PaginatedResponse,
  PromoCouponItem,
  RadarResponse,
  SystemErrorsResponse,
  WebhookLogItem,
} from '../types/admin';
import type { AuthResponse, CatalogPlanCode, CatalogStatus } from '../types/catalog';

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
  fallbackError = 'Erro ao processar solicitação administrativa.'
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : fallbackError;
    throw new Error(msg);
  }
  return data as T;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// Módulo 1: Vitrines
export function listAdminCatalogs(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: CatalogStatus | '';
  planType?: 'ESSENTIAL' | 'PRO' | '';
}) {
  return adminFetch<PaginatedResponse<AdminCatalogItem>>(
    `/api/admin/catalogs${toQuery(params)}`
  );
}

export function updateAdminCatalogSlug(id: string, slug: string) {
  return adminFetch<{ id: string; slug: string }>(`/api/admin/catalogs/${id}/slug`, {
    method: 'PATCH',
    body: JSON.stringify({ slug }),
  });
}

export function updateAdminCatalogLifecycle(
  id: string,
  payload: { addDays?: number; expiresAt?: string; status?: CatalogStatus; reason?: string }
) {
  return adminFetch<{ id: string; status: CatalogStatus; expiresAt: string | null }>(
    `/api/admin/catalogs/${id}/lifecycle`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export function transferAdminCatalog(id: string, targetEmail: string) {
  return adminFetch<{ id: string; slug: string }>(
    `/api/admin/catalogs/${id}/transfer`,
    {
      method: 'POST',
      body: JSON.stringify({ targetEmail }),
    }
  );
}

export function changeAdminCatalogPlan(
  id: string,
  planCode: CatalogPlanCode,
  adjustExpiration: boolean
) {
  return adminFetch<{ id: string; planType: string; expiresAt: string | null }>(
    `/api/admin/catalogs/${id}/plan`,
    {
      method: 'PATCH',
      body: JSON.stringify({ planCode, adjustExpiration }),
    }
  );
}

export function deleteAdminCatalog(id: string, confirmSlug: string) {
  return adminFetch<{ deleted: boolean }>(`/api/admin/catalogs/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmSlug }),
  });
}

// Módulo 2: Usuários & Radar
export function listAdminUsers(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: 'MERCHANT' | 'BUYER' | '';
}) {
  return adminFetch<PaginatedResponse<AdminUserItem>>(
    `/api/admin/users${toQuery(params)}`
  );
}

export function impersonateAdminUser(id: string) {
  return adminFetch<AuthResponse & { expiresInMinutes: number }>(
    `/api/admin/users/${id}/impersonate`,
    { method: 'POST' }
  );
}

export function resendWelcomeAdminUser(id: string) {
  return adminFetch<{ sent: boolean; email: string }>(
    `/api/admin/users/${id}/resend-welcome`,
    { method: 'POST' }
  );
}

export function generateResetLinkAdminUser(id: string, sendEmail: boolean) {
  return adminFetch<{ resetUrl: string; expiresAt: string; emailSent: boolean }>(
    `/api/admin/users/${id}/reset-password-link`,
    {
      method: 'POST',
      body: JSON.stringify({ sendEmail }),
    }
  );
}

export function getAdminRadar(q?: string) {
  return adminFetch<RadarResponse>(`/api/admin/radar${toQuery({ q })}`);
}

export function sendAdminRadarReminder(catalogId: string) {
  return adminFetch<{ sent: boolean; recipient: string; stage: string }>(
    `/api/admin/radar/${catalogId}/notify`,
    { method: 'POST' }
  );
}

export function runAdminRadarRules(dryRun: boolean) {
  return adminFetch<{
    dryRun?: boolean;
    skipped?: boolean;
    reason?: string;
    processed: number;
    candidates: Array<{ catalogId: string; slug: string; email: string; stage: string }>;
  }>('/api/admin/radar/run', {
    method: 'POST',
    body: JSON.stringify({ dryRun }),
  });
}

export function toggleAdminRadarCron(enabled: boolean) {
  return adminFetch<{ enabled: boolean }>('/api/admin/radar/cron', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

// Módulo 3: Financeiro, Webhooks, Erros & E-mails
export function getAdminFinanceSummary() {
  return adminFetch<AdminFinanceSummary>('/api/admin/finance/summary');
}

export function listAdminPayments(params: {
  page?: number;
  pageSize?: number;
  status?: 'PENDING' | 'PAID' | '';
  q?: string;
}) {
  return adminFetch<PaginatedResponse<AdminPaymentItem>>(
    `/api/admin/payments${toQuery(params)}`
  );
}

export function reconcileAdminPayment(id: string) {
  return adminFetch<{ status: string; reconciled: boolean; message: string }>(
    `/api/admin/payments/${id}/reconcile`,
    { method: 'POST' }
  );
}

export function listAdminWebhooks(params: {
  page?: number;
  pageSize?: number;
  status?: 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED' | '';
  q?: string;
}) {
  return adminFetch<PaginatedResponse<WebhookLogItem>>(
    `/api/admin/webhooks${toQuery(params)}`
  );
}

export function listAdminErrors(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  source?: string;
  severity?: string;
  q?: string;
}) {
  return adminFetch<SystemErrorsResponse>(`/api/admin/errors${toQuery(params)}`);
}

export function updateAdminErrorStatus(
  id: string,
  payload: { status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED'; resolutionNote?: string }
) {
  return adminFetch(`/api/admin/errors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function purgeAdminResolvedErrors() {
  return adminFetch<{ deletedCount: number }>('/api/admin/errors/resolved', {
    method: 'DELETE',
  });
}

export function listAdminEmails(params: {
  page?: number;
  pageSize?: number;
  status?: 'SENT' | 'FAILED' | '';
  q?: string;
}) {
  return adminFetch<PaginatedResponse<AdminEmailLogItem>>(
    `/api/admin/emails${toQuery(params)}`
  );
}

export function retryAdminEmail(id: string) {
  return adminFetch<{ retried: boolean }>(`/api/admin/emails/${id}/retry`, {
    method: 'POST',
  });
}

// Módulo 4: Cupons, Aviso Global & Auditoria
export function listAdminCoupons(params: { page?: number; pageSize?: number; q?: string }) {
  return adminFetch<PaginatedResponse<PromoCouponItem>>(
    `/api/admin/coupons${toQuery(params)}`
  );
}

export function createAdminCoupon(payload: {
  code: string;
  description?: string;
  type: 'EXTENDED_TRIAL' | 'BONUS_DAYS';
  bonusDays: number;
  targetPlanCode?: CatalogPlanCode | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}) {
  return adminFetch<PromoCouponItem>('/api/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminCoupon(
  id: string,
  payload: { isActive?: boolean; maxUses?: number | null; description?: string | null }
) {
  return adminFetch<PromoCouponItem>(`/api/admin/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listAdminAnnouncements() {
  return adminFetch<{ items: GlobalAnnouncementItem[] }>('/api/admin/announcements');
}

export function createAdminAnnouncement(payload: {
  title: string;
  message: string;
  variant: 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  dismissible: boolean;
}) {
  return adminFetch<GlobalAnnouncementItem>('/api/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminAnnouncement(
  id: string,
  payload: Partial<{
    title: string;
    message: string;
    variant: 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';
    ctaLabel: string | null;
    ctaUrl: string | null;
    isActive: boolean;
    dismissible: boolean;
  }>
) {
  return adminFetch<GlobalAnnouncementItem>(`/api/admin/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listAdminAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  targetType?: string;
  q?: string;
}) {
  return adminFetch<PaginatedResponse<AuditLogItem>>(
    `/api/admin/audit-logs${toQuery(params)}`
  );
}

// Públicas / Lojista
export async function validatePromoCoupon(code: string): Promise<CouponValidationResult> {
  return adminFetch<CouponValidationResult>(
    `/api/coupons/validate?code=${encodeURIComponent(code.trim())}`,
    {},
    'Cupom inválido ou expirado.'
  );
}

export async function getActiveAnnouncement() {
  const res = await fetch(`${API_BASE_URL}/api/announcements/active`);
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    announcement: GlobalAnnouncementItem | null;
  } | null;
  return data?.announcement ?? null;
}

const reportedClientErrors = new Map<string, number>();
export function reportClientError(payload: {
  message: string;
  stack?: string;
  route?: string;
  category?: 'RUNTIME' | 'PAYMENT' | 'AUTH' | 'CATALOG' | 'OTHER';
  severity?: 'CRITICAL' | 'ERROR' | 'WARNING';
}) {
  try {
    const key = `${payload.route || ''}|${payload.message.slice(0, 120)}`;
    const now = Date.now();
    const last = reportedClientErrors.get(key);
    if (last && now - last < 60_000) {
      return;
    }
    if (reportedClientErrors.size >= 50) {
      const oldest = reportedClientErrors.keys().next().value;
      if (oldest) reportedClientErrors.delete(oldest);
    }
    reportedClientErrors.set(key, now);

    const token = getImpersonationToken() || getAccessToken();
    void fetch(`${API_BASE_URL}/api/telemetry/client-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  } catch {
    // Nunca quebra a UI por falha de telemetria
  }
}
