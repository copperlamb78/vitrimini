import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { recordAdminAudit } from './audit.service.js';
import {
  verifyMercadoPagoOrder,
  fetchMercadoPagoPreapproval,
  calculatePixFeeFallback,
  calculateCardFeeFallback,
  PLAN_CATALOG,
} from './payment.service.js';
import { sanitizeJsonPayload } from '../utils/redact.js';
import { sendWelcomeEmail } from './email.service.js';
import { sendManualExpirationReminder } from './adminRadar.service.js';
import type { AdminActor } from './adminCatalog.service.js';
import { confirmCatalogPayment } from './catalog.service.js';

const BREVO_DAILY_LIMIT = 300;
const BREVO_AUTO_THRESHOLD = 240;

function getSaoPauloDayStart(date: Date): Date {
  const key = date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return new Date(`${key}T00:00:00-03:00`);
}

export async function getFinanceSummary() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeCatalogs,
    totalCatalogs,
    paidCatalogsCount,
    pendingLast7d,
    paid30d,
    paidTotal,
  ] = await Promise.all([
    prisma.catalog.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        planType: true,
        isTrial: true,
        billingType: true,
        payments: {
          where: { status: 'PAID' },
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: { planCode: true },
        },
      },
    }),
    prisma.catalog.count(),
    prisma.catalog.count({
      where: { payments: { some: { status: 'PAID' } } },
    }),
    prisma.catalogPayment.count({
      where: { status: 'PENDING', createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.catalogPayment.findMany({
      where: { status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
      select: {
        amountCents: true,
        feeCents: true,
        netAmountCents: true,
        catalog: { select: { billingType: true } },
      },
    }),
    prisma.catalogPayment.findMany({
      where: { status: 'PAID' },
      select: {
        amountCents: true,
        feeCents: true,
        netAmountCents: true,
        catalog: { select: { billingType: true } },
      },
    }),
  ]);

  let mrrCents = 0;
  const planDistribution = {
    ESSENTIAL_30: 0,
    PRO_30: 0,
    PRO_365: 0,
    TRIAL: 0,
    LEGACY: 0,
  };

  for (const cat of activeCatalogs) {
    const latestCode = cat.payments[0]?.planCode;
    if (cat.isTrial && !latestCode) {
      planDistribution.TRIAL += 1;
      continue;
    }

    if (latestCode === 'PRO_365') {
      planDistribution.PRO_365 += 1;
      mrrCents += Math.round(PLAN_CATALOG.PRO_365.amountCents / 12);
    } else if (latestCode === 'PRO_30') {
      planDistribution.PRO_30 += 1;
      mrrCents += PLAN_CATALOG.PRO_30.amountCents;
    } else if (latestCode === 'ESSENTIAL_30') {
      planDistribution.ESSENTIAL_30 += 1;
      mrrCents += PLAN_CATALOG.ESSENTIAL_30.amountCents;
    } else if (
      latestCode &&
      ['ESSENTIAL_90D', 'PRO_90D', 'ESSENTIAL_90', 'PRO_90', 'PRO_365D'].includes(
        latestCode
      )
    ) {
      planDistribution.LEGACY += 1;
    } else if (cat.planType === 'PRO') {
      planDistribution.PRO_30 += 1;
      mrrCents += PLAN_CATALOG.PRO_30.amountCents;
    } else {
      planDistribution.ESSENTIAL_30 += 1;
      mrrCents += PLAN_CATALOG.ESSENTIAL_30.amountCents;
    }
  }

  function sumPayments(
    rows: Array<{
      amountCents: number;
      feeCents: number | null;
      netAmountCents: number | null;
      catalog: { billingType: string };
    }>
  ) {
    const acc = {
      grossCents: 0,
      feeCents: 0,
      netCents: 0,
      pixGrossCents: 0,
      pixFeeCents: 0,
      pixNetCents: 0,
      cardGrossCents: 0,
      cardFeeCents: 0,
      cardNetCents: 0,
      count: rows.length,
    };
    for (const p of rows) {
      const isCard = p.catalog.billingType === 'CARD_RECURRING';
      const fallback = isCard
        ? calculateCardFeeFallback(p.amountCents)
        : calculatePixFeeFallback(p.amountCents);
      const fee = p.feeCents !== null ? p.feeCents : fallback.feeCents;
      const net =
        p.netAmountCents !== null
          ? p.netAmountCents
          : Math.max(0, p.amountCents - fee);
      acc.grossCents += p.amountCents;
      acc.feeCents += fee;
      acc.netCents += net;
      if (isCard) {
        acc.cardGrossCents += p.amountCents;
        acc.cardFeeCents += fee;
        acc.cardNetCents += net;
      } else {
        acc.pixGrossCents += p.amountCents;
        acc.pixFeeCents += fee;
        acc.pixNetCents += net;
      }
    }
    return acc;
  }

  const conversionRatePercent =
    totalCatalogs > 0
      ? Math.round((paidCatalogsCount / totalCatalogs) * 1000) / 10
      : 0;

  return {
    mrrCents,
    planDistribution,
    conversionRatePercent,
    paidCatalogsCount,
    totalCatalogs,
    pendingLast7d,
    revenue30d: sumPayments(paid30d),
    revenueTotal: sumPayments(paidTotal),
  };
}

export async function listAdminPayments(params: {
  page: number;
  pageSize: number;
  status?: 'PENDING' | 'PAID';
  q?: string;
}) {
  const { page, pageSize, status, q } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { gatewayId: { contains: q, mode: 'insensitive' as const } },
            { planCode: { contains: q, mode: 'insensitive' as const } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
            { catalog: { storeName: { contains: q, mode: 'insensitive' as const } } },
            { catalog: { slug: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.catalogPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        planCode: true,
        status: true,
        amountCents: true,
        feeCents: true,
        netAmountCents: true,
        gatewayId: true,
        paidAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        catalog: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            billingType: true,
            mpPreapprovalId: true,
          },
        },
      },
    }),
    prisma.catalogPayment.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function reconcileAdminPayment(params: {
  paymentId: string;
  admin: AdminActor;
}) {
  const payment = await prisma.catalogPayment.findUnique({
    where: { id: params.paymentId },
    select: {
      id: true,
      status: true,
      amountCents: true,
      gatewayId: true,
      catalogId: true,
      catalog: {
        select: {
          id: true,
          slug: true,
          billingType: true,
          mpPreapprovalId: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, 'Pagamento não encontrado.');
  }

  if (payment.status === 'PAID') {
    return {
      status: 'PAID',
      reconciled: false,
      message: 'Este pagamento já está confirmado como PAGO.',
    };
  }

  let approved = false;
  let mpStatus = 'pending';
  let feeCents: number | undefined;
  let netAmountCents: number | undefined;

  if (payment.gatewayId) {
    const verification = await verifyMercadoPagoOrder(
      payment.gatewayId,
      payment.amountCents
    );
    approved =
      verification.approved &&
      typeof verification.paidCents === 'number' &&
      verification.paidCents >= payment.amountCents;
    mpStatus = verification.approved ? 'approved' : 'pending';
    feeCents = verification.feeCents;
    netAmountCents = verification.netAmountCents;
  } else if (payment.catalog.mpPreapprovalId) {
    const preapproval = await fetchMercadoPagoPreapproval(
      payment.catalog.mpPreapprovalId
    );
    mpStatus = preapproval?.status || 'unknown';
    approved = preapproval?.status === 'authorized';
  } else {
    throw new AppError(
      400,
      'Pagamento não possui gatewayId nem assinatura vinculada no Mercado Pago.'
    );
  }

  if (approved) {
    await confirmCatalogPayment(payment.id, { feeCents, netAmountCents });
  }

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'RECONCILE_PAYMENT',
    targetType: 'PAYMENT',
    targetId: payment.id,
    targetLabel: payment.catalog.slug,
    metadata: {
      gatewayId: payment.gatewayId,
      mpStatus,
      approved,
    },
  });

  return {
    status: approved ? 'PAID' : 'PENDING',
    mpStatus,
    reconciled: approved,
    message: approved
      ? 'Pagamento confirmado no Mercado Pago e vitrine ativada/renovada.'
      : `Pagamento ainda consta como "${mpStatus}" no Mercado Pago.`,
  };
}

export async function recordPaymentWebhookLog(input: {
  provider?: string;
  eventType: string;
  externalResourceId?: string | null;
  catalogId?: string | null;
  paymentId?: string | null;
  status: 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED';
  httpStatus?: number | null;
  errorMessage?: string | null;
  payload?: unknown;
}): Promise<void> {
  try {
    await prisma.paymentWebhookLog.create({
      data: {
        provider: input.provider || 'MERCADO_PAGO',
        eventType: input.eventType.slice(0, 80),
        externalResourceId: input.externalResourceId?.slice(0, 120) || null,
        catalogId: input.catalogId?.slice(0, 64) || null,
        paymentId: input.paymentId?.slice(0, 64) || null,
        status: input.status,
        httpStatus: input.httpStatus ?? null,
        errorMessage: input.errorMessage?.slice(0, 600) || null,
        payloadJson: sanitizeJsonPayload(input.payload),
        processedAt: input.status !== 'RECEIVED' ? new Date() : null,
      },
    });
  } catch (err) {
    console.error('[PaymentWebhookLog Error]:', err);
  }
}

export async function listWebhookLogs(params: {
  page: number;
  pageSize: number;
  status?: 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED';
  q?: string;
}) {
  const { page, pageSize, status, q } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { eventType: { contains: q, mode: 'insensitive' as const } },
            { externalResourceId: { contains: q, mode: 'insensitive' as const } },
            { errorMessage: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.paymentWebhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.paymentWebhookLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listSystemErrors(params: {
  page: number;
  pageSize: number;
  status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  source?: 'BACKEND' | 'FRONTEND' | 'WEBHOOK' | 'CRON' | 'EMAIL';
  severity?: 'CRITICAL' | 'ERROR' | 'WARNING';
  category?: string;
  q?: string;
}) {
  const { page, pageSize, status, source, severity, category, q } = params;
  const skip = (page - 1) * pageSize;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const where = {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(severity ? { severity } : {}),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { message: { contains: q, mode: 'insensitive' as const } },
            { route: { contains: q, mode: 'insensitive' as const } },
            { category: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [
    items,
    total,
    openCount,
    critical24hCount,
    frontendOpenCount,
    backendOpenCount,
    paymentOpenCount,
  ] = await Promise.all([
    prisma.systemErrorLog.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.systemErrorLog.count({ where }),
    prisma.systemErrorLog.count({ where: { status: 'OPEN' } }),
    prisma.systemErrorLog.count({
      where: {
        severity: 'CRITICAL',
        lastSeenAt: { gte: oneDayAgo },
      },
    }),
    prisma.systemErrorLog.count({
      where: { status: 'OPEN', source: 'FRONTEND' },
    }),
    prisma.systemErrorLog.count({
      where: { status: 'OPEN', source: 'BACKEND' },
    }),
    prisma.systemErrorLog.count({
      where: {
        status: 'OPEN',
        OR: [{ source: 'WEBHOOK' }, { category: 'PAYMENT' }],
      },
    }),
  ]);

  return {
    summary: {
      openCount,
      critical24hCount,
      frontendOpenCount,
      backendOpenCount,
      paymentOpenCount,
    },
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function updateSystemErrorStatus(params: {
  errorId: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  resolutionNote?: string;
  admin: AdminActor;
}) {
  const existing = await prisma.systemErrorLog.findUnique({
    where: { id: params.errorId },
    select: { id: true, status: true, message: true },
  });

  if (!existing) {
    throw new AppError(404, 'Registro de erro não encontrado.');
  }

  const updated = await prisma.systemErrorLog.update({
    where: { id: existing.id },
    data: {
      status: params.status,
      ...(params.resolutionNote !== undefined
        ? { resolutionNote: params.resolutionNote.trim() || null }
        : {}),
      resolvedAt: params.status === 'RESOLVED' ? new Date() : null,
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'RESOLVE_ERROR',
    targetType: 'SYSTEM_ERROR',
    targetId: existing.id,
    targetLabel: existing.message.slice(0, 100),
    beforeJson: { status: existing.status },
    afterJson: { status: updated.status, resolutionNote: updated.resolutionNote },
  });

  return updated;
}

export async function purgeResolvedSystemErrors(admin: AdminActor) {
  const deleted = await prisma.systemErrorLog.deleteMany({
    where: {
      status: { in: ['RESOLVED', 'IGNORED'] },
    },
  });

  await recordAdminAudit({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: 'PURGE_RESOLVED_ERRORS',
    targetType: 'SYSTEM_ERROR',
    targetId: 'bulk',
    metadata: { deletedCount: deleted.count },
  });

  return { deletedCount: deleted.count };
}

export async function listEmailLogs(params: {
  page: number;
  pageSize: number;
  status?: 'SENT' | 'FAILED';
  q?: string;
}) {
  const { page, pageSize, status, q } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { recipient: { contains: q, mode: 'insensitive' as const } },
            { type: { contains: q, mode: 'insensitive' as const } },
            { errorMessage: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function retryFailedEmail(params: {
  emailLogId: string;
  admin: AdminActor;
}) {
  const log = await prisma.emailLog.findUnique({
    where: { id: params.emailLogId },
  });

  if (!log) {
    throw new AppError(404, 'Registro de e-mail não encontrado.');
  }
  if (log.status !== 'FAILED') {
    throw new AppError(400, 'Somente e-mails com falha podem ser reenviados.');
  }

  const todayStart = getSaoPauloDayStart(new Date());
  const sentToday = await prisma.emailLog.count({
    where: { status: 'SENT', createdAt: { gte: todayStart } },
  });

  const isCriticalTransactional = ['WELCOME', 'PASSWORD_RESET', 'NEW_ORDER'].includes(
    log.type
  );
  const limit = isCriticalTransactional ? BREVO_DAILY_LIMIT - 5 : BREVO_AUTO_THRESHOLD;
  if (sentToday >= limit) {
    throw new AppError(
      429,
      `Cota diária de segurança do Brevo atingida (${sentToday}/${BREVO_DAILY_LIMIT}).`
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: log.recipient.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      catalogs: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!user) {
    throw new AppError(
      400,
      'Não foi possível localizar o destinatário para reenvio automático.'
    );
  }

  if (log.type === 'WELCOME') {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  } else if (
    ['EXPIRATION_REMINDER', 'CATALOG_EXPIRING_SOON', 'CATALOG_EXPIRED'].includes(
      log.type
    ) &&
    user.catalogs[0]
  ) {
    await sendManualExpirationReminder({
      catalogId: user.catalogs[0].id,
      admin: params.admin,
    });
  } else {
    throw new AppError(
      400,
      `Reenvio automático não suportado para o tipo "${log.type}".`
    );
  }

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'RETRY_EMAIL',
    targetType: 'EMAIL',
    targetId: log.id,
    targetLabel: log.recipient,
    metadata: { type: log.type },
  });

  return { retried: true, recipient: log.recipient, type: log.type };
}
