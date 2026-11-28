import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { redactText, sanitizeJsonPayload } from '../utils/redact.js';

export type ErrorSource = 'BACKEND' | 'FRONTEND' | 'WEBHOOK' | 'CRON' | 'EMAIL';
export type ErrorSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';
export type ErrorCategory =
  | 'PAYMENT'
  | 'AUTH'
  | 'CATALOG'
  | 'WEBHOOK'
  | 'EMAIL'
  | 'DATABASE'
  | 'RUNTIME'
  | 'OTHER';
export type ErrorStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';

export interface CaptureSystemErrorInput {
  source: ErrorSource;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string | null;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  catalogId?: string | null;
  context?: unknown;
}

function normalizeMessageForFingerprint(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '<uuid>'
    )
    .replace(/\b\d{4,}\b/g, '<num>')
    .slice(0, 220);
}

function computeFingerprint(input: {
  source: string;
  category: string;
  route?: string | null;
  message: string;
}): string {
  const normalizedRoute = (input.route || '').split('?')[0].slice(0, 160);
  const normalizedMessage = normalizeMessageForFingerprint(input.message);
  const raw = `${input.source}|${input.category}|${normalizedRoute}|${normalizedMessage}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function captureSystemError(input: CaptureSystemErrorInput): void {
  void persistSystemError(input).catch((err) => {
    console.error('[SystemErrorLog Capture Failed]:', err);
  });
}

async function persistSystemError(
  input: CaptureSystemErrorInput
): Promise<void> {
  const cleanMessage = redactText(input.message || 'Erro desconhecido', 800);
  const cleanStack = input.stack ? redactText(input.stack, 3000) : null;
  const cleanRoute = input.route ? redactText(input.route, 240) : null;
  const fingerprint = computeFingerprint({
    source: input.source,
    category: input.category,
    route: cleanRoute,
    message: cleanMessage,
  });

  const now = new Date();
  const safeContext = sanitizeJsonPayload(input.context);

  const existing = await prisma.systemErrorLog.findUnique({
    where: { fingerprint },
    select: { id: true, status: true },
  });

  if (!existing) {
    if (input.source === 'FRONTEND') {
      const openFrontendCount = await prisma.systemErrorLog.count({
        where: { source: 'FRONTEND', status: 'OPEN' },
      });
      if (openFrontendCount >= 500) {
        return;
      }
    }

    await prisma.systemErrorLog.create({
      data: {
        fingerprint,
        source: input.source,
        severity: input.severity,
        category: input.category,
        message: cleanMessage,
        stack: cleanStack,
        route: cleanRoute,
        method: input.method?.slice(0, 16) || null,
        statusCode:
          typeof input.statusCode === 'number' ? input.statusCode : null,
        userId: input.userId?.slice(0, 64) || null,
        catalogId: input.catalogId?.slice(0, 64) || null,
        contextJson: safeContext,
        occurrenceCount: 1,
        status: 'OPEN',
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
    return;
  }

  await prisma.systemErrorLog.update({
    where: { id: existing.id },
    data: {
      occurrenceCount: { increment: 1 },
      lastSeenAt: now,
      severity: input.severity,
      message: cleanMessage,
      ...(cleanStack ? { stack: cleanStack } : {}),
      ...(safeContext !== undefined ? { contextJson: safeContext } : {}),
      ...(input.userId ? { userId: input.userId.slice(0, 64) } : {}),
      ...(input.catalogId ? { catalogId: input.catalogId.slice(0, 64) } : {}),
      ...(existing.status === 'RESOLVED'
        ? { status: 'OPEN', resolvedAt: null }
        : {}),
    },
  });
}

export async function purgeOldObservabilityLogs(): Promise<{
  webhookDeleted: number;
  errorDeleted: number;
  auditDeleted: number;
}> {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

  const [webhookRes, errorRes, auditRes] = await Promise.all([
    prisma.paymentWebhookLog.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    }),
    prisma.systemErrorLog.deleteMany({
      where: {
        OR: [
          {
            status: { in: ['RESOLVED', 'IGNORED'] },
            lastSeenAt: { lt: thirtyDaysAgo },
          },
          {
            source: 'FRONTEND',
            status: 'OPEN',
            lastSeenAt: { lt: sixtyDaysAgo },
          },
        ],
      },
    }),
    prisma.adminAuditLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    }),
  ]);

  return {
    webhookDeleted: webhookRes.count,
    errorDeleted: errorRes.count,
    auditDeleted: auditRes.count,
  };
}
