import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { recordAdminAudit } from './audit.service.js';
import type { AdminActor } from './adminCatalog.service.js';

const ANNOUNCEMENT_CACHE_TTL_MS = 60 * 1000;
let announcementCache: {
  expiresAt: number;
  data: {
    id: string;
    title: string;
    message: string;
    variant: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    dismissible: boolean;
  } | null;
} | null = null;

export function invalidateAnnouncementCache() {
  announcementCache = null;
}

export async function listCoupons(params: {
  page: number;
  pageSize: number;
  q?: string;
}) {
  const { page, pageSize, q } = params;
  const skip = (page - 1) * pageSize;

  const where = q
    ? {
        OR: [
          { code: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.promoCoupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.promoCoupon.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createCoupon(params: {
  code: string;
  description?: string;
  type: 'EXTENDED_TRIAL' | 'BONUS_DAYS';
  bonusDays: number;
  targetPlanCode?: 'ESSENTIAL_30' | 'PRO_30' | 'PRO_365' | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  admin: AdminActor;
}) {
  const normalizedCode = params.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (normalizedCode.length < 3) {
    throw new AppError(400, 'Código do cupom deve ter ao menos 3 caracteres.');
  }

  const existing = await prisma.promoCoupon.findUnique({
    where: { code: normalizedCode },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, `Já existe um cupom com o código "${normalizedCode}".`);
  }

  const expiresDate = params.expiresAt ? new Date(params.expiresAt) : null;
  if (expiresDate && Number.isNaN(expiresDate.getTime())) {
    throw new AppError(400, 'Data de expiração do cupom inválida.');
  }

  const created = await prisma.promoCoupon.create({
    data: {
      code: normalizedCode,
      description: params.description?.trim() || null,
      type: params.type,
      bonusDays: params.bonusDays,
      targetPlanCode: params.targetPlanCode || null,
      maxUses: params.maxUses ?? null,
      expiresAt: expiresDate,
      isActive: true,
      createdByAdminId: params.admin.id,
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'CREATE_COUPON',
    targetType: 'COUPON',
    targetId: created.id,
    targetLabel: created.code,
    afterJson: {
      bonusDays: created.bonusDays,
      targetPlanCode: created.targetPlanCode,
      maxUses: created.maxUses,
    },
  });

  return created;
}

export async function updateCoupon(params: {
  couponId: string;
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
  description?: string | null;
  admin: AdminActor;
}) {
  const existing = await prisma.promoCoupon.findUnique({
    where: { id: params.couponId },
  });
  if (!existing) {
    throw new AppError(404, 'Cupom não encontrado.');
  }

  const expiresDate =
    params.expiresAt === undefined
      ? undefined
      : params.expiresAt === null || params.expiresAt === ''
        ? null
        : new Date(params.expiresAt);
  if (expiresDate instanceof Date && Number.isNaN(expiresDate.getTime())) {
    throw new AppError(400, 'Data de expiração inválida.');
  }

  const updated = await prisma.promoCoupon.update({
    where: { id: existing.id },
    data: {
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.maxUses !== undefined ? { maxUses: params.maxUses } : {}),
      ...(expiresDate !== undefined ? { expiresAt: expiresDate } : {}),
      ...(params.description !== undefined
        ? { description: params.description?.trim() || null }
        : {}),
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'UPDATE_COUPON',
    targetType: 'COUPON',
    targetId: existing.id,
    targetLabel: existing.code,
    beforeJson: { isActive: existing.isActive, maxUses: existing.maxUses },
    afterJson: { isActive: updated.isActive, maxUses: updated.maxUses },
  });

  return updated;
}

export async function validateCouponCode(params: {
  code: string;
  userId?: string | null;
}) {
  const normalizedCode = params.code.trim().toUpperCase();
  if (!normalizedCode) {
    throw new AppError(400, 'Informe um código promocional.');
  }

  const coupon = await prisma.promoCoupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError(404, 'Código promocional inválido ou desativado.');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'Este código promocional já expirou.');
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError(400, 'Este código promocional atingiu o limite de usos.');
  }

  if (params.userId) {
    const alreadyRedeemed = await prisma.promoCouponRedemption.findUnique({
      where: {
        couponId_userId: {
          couponId: coupon.id,
          userId: params.userId,
        },
      },
      select: { id: true },
    });
    if (alreadyRedeemed) {
      throw new AppError(409, 'Você já utilizou este código promocional.');
    }
  }

  return {
    valid: true,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    bonusDays: coupon.bonusDays,
    targetPlanCode: coupon.targetPlanCode,
  };
}

export async function redeemCouponTx(params: {
  tx: Prisma.TransactionClient;
  code: string;
  userId: string;
  catalogId: string;
}) {
  const normalizedCode = params.code.trim().toUpperCase();
  const coupon = await params.tx.promoCoupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError(400, 'Código promocional inválido ou desativado.');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'Este código promocional já expirou.');
  }

  const incremented = await params.tx.promoCoupon.updateMany({
    where: {
      id: coupon.id,
      isActive: true,
      ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
    },
    data: { usedCount: { increment: 1 } },
  });

  if (incremented.count === 0) {
    throw new AppError(400, 'Este código promocional atingiu o limite de usos.');
  }

  try {
    await params.tx.promoCouponRedemption.create({
      data: {
        couponId: coupon.id,
        userId: params.userId,
        catalogId: params.catalogId,
      },
    });
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 'P2002'
    ) {
      throw new AppError(409, 'Você já utilizou este código promocional.');
    }
    throw err;
  }

  return coupon;
}

export async function listAnnouncements() {
  return prisma.globalAnnouncement.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
}

export async function createAnnouncement(params: {
  title: string;
  message: string;
  variant: 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  dismissible: boolean;
  admin: AdminActor;
}) {
  const created = await prisma.$transaction(async (tx) => {
    if (params.isActive) {
      await tx.globalAnnouncement.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return tx.globalAnnouncement.create({
      data: {
        title: params.title.trim(),
        message: params.message.trim(),
        variant: params.variant,
        ctaLabel: params.ctaLabel?.trim() || null,
        ctaUrl: params.ctaUrl?.trim() || null,
        isActive: params.isActive,
        startsAt: params.startsAt ? new Date(params.startsAt) : null,
        endsAt: params.endsAt ? new Date(params.endsAt) : null,
        dismissible: params.dismissible,
        updatedByAdminId: params.admin.id,
      },
    });
  });

  invalidateAnnouncementCache();

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'CREATE_ANNOUNCEMENT',
    targetType: 'ANNOUNCEMENT',
    targetId: created.id,
    targetLabel: created.title,
    afterJson: { isActive: created.isActive, variant: created.variant },
  });

  return created;
}

export async function updateAnnouncement(params: {
  id: string;
  title?: string;
  message?: string;
  variant?: 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  dismissible?: boolean;
  admin: AdminActor;
}) {
  const existing = await prisma.globalAnnouncement.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    throw new AppError(404, 'Aviso não encontrado.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (params.isActive === true) {
      await tx.globalAnnouncement.updateMany({
        where: { isActive: true, id: { not: existing.id } },
        data: { isActive: false },
      });
    }

    return tx.globalAnnouncement.update({
      where: { id: existing.id },
      data: {
        ...(params.title !== undefined ? { title: params.title.trim() } : {}),
        ...(params.message !== undefined ? { message: params.message.trim() } : {}),
        ...(params.variant !== undefined ? { variant: params.variant } : {}),
        ...(params.ctaLabel !== undefined
          ? { ctaLabel: params.ctaLabel?.trim() || null }
          : {}),
        ...(params.ctaUrl !== undefined
          ? { ctaUrl: params.ctaUrl?.trim() || null }
          : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params.startsAt !== undefined
          ? { startsAt: params.startsAt ? new Date(params.startsAt) : null }
          : {}),
        ...(params.endsAt !== undefined
          ? { endsAt: params.endsAt ? new Date(params.endsAt) : null }
          : {}),
        ...(params.dismissible !== undefined
          ? { dismissible: params.dismissible }
          : {}),
        updatedByAdminId: params.admin.id,
      },
    });
  });

  invalidateAnnouncementCache();

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'UPDATE_ANNOUNCEMENT',
    targetType: 'ANNOUNCEMENT',
    targetId: updated.id,
    targetLabel: updated.title,
    beforeJson: { isActive: existing.isActive, title: existing.title },
    afterJson: { isActive: updated.isActive, title: updated.title },
  });

  return updated;
}

export async function getActiveAnnouncement() {
  const nowMs = Date.now();
  if (announcementCache && announcementCache.expiresAt > nowMs) {
    return announcementCache.data;
  }

  const now = new Date();
  const active = await prisma.globalAnnouncement.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      message: true,
      variant: true,
      ctaLabel: true,
      ctaUrl: true,
      dismissible: true,
    },
  });

  announcementCache = {
    expiresAt: nowMs + ANNOUNCEMENT_CACHE_TTL_MS,
    data: active,
  };

  return active;
}
