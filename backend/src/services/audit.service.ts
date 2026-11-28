import { prisma } from '../lib/prisma.js';
import { sanitizeJsonPayload } from '../utils/redact.js';

export type AdminAuditAction =
  | 'UPDATE_SLUG'
  | 'EXTEND_EXPIRATION'
  | 'UPDATE_STATUS'
  | 'TRANSFER_CATALOG'
  | 'CHANGE_PLAN'
  | 'DELETE_CATALOG'
  | 'IMPERSONATE_START'
  | 'RESEND_WELCOME_EMAIL'
  | 'GENERATE_RESET_LINK'
  | 'RECONCILE_PAYMENT'
  | 'SEND_EXPIRATION_EMAIL'
  | 'RUN_EXPIRATION_RULES'
  | 'TOGGLE_EXPIRATION_CRON'
  | 'RETRY_EMAIL'
  | 'CREATE_COUPON'
  | 'UPDATE_COUPON'
  | 'UPDATE_ANNOUNCEMENT'
  | 'CREATE_ANNOUNCEMENT'
  | 'RESOLVE_ERROR'
  | 'PURGE_RESOLVED_ERRORS';

export type AdminAuditTargetType =
  | 'CATALOG'
  | 'USER'
  | 'PAYMENT'
  | 'COUPON'
  | 'SYSTEM_ERROR'
  | 'ANNOUNCEMENT'
  | 'EMAIL'
  | 'SYSTEM';

export interface RecordAdminAuditInput {
  adminUserId: string;
  adminEmail: string;
  action: AdminAuditAction | string;
  targetType: AdminAuditTargetType;
  targetId: string;
  targetLabel?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadata?: unknown;
}

export async function recordAdminAudit(
  input: RecordAdminAuditInput
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId,
        adminEmail: input.adminEmail,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel?.slice(0, 160) || null,
        beforeJson: sanitizeJsonPayload(input.beforeJson),
        afterJson: sanitizeJsonPayload(input.afterJson),
        metadata: sanitizeJsonPayload(input.metadata),
      },
    });
  } catch (err) {
    console.error('[AdminAuditLog Error]:', err);
  }
}

export async function listAdminAuditLogs(params: {
  page: number;
  pageSize: number;
  action?: string;
  targetType?: string;
  q?: string;
}) {
  const { page, pageSize, action, targetType, q } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(q
      ? {
          OR: [
            { targetLabel: { contains: q, mode: 'insensitive' as const } },
            { targetId: { contains: q, mode: 'insensitive' as const } },
            { adminEmail: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
