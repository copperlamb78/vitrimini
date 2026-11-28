import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { markMerchantCache } from '../middlewares/auth.js';
import { deleteImagesFromR2 } from './r2.service.js';
import { recordAdminAudit } from './audit.service.js';
import { PLAN_CATALOG, type PlanCode } from './payment.service.js';
import { slugify } from '../utils/slug.js';

export interface AdminActor {
  id: string;
  email: string;
}

const RESERVED_SLUGS = new Set([
  'admin',
  'super-admin',
  'criar',
  'minhas-vitrines',
  'meus-pedidos',
  'pedido',
  'api',
  'c',
  'login',
  'entrar',
  'cadastro',
  'redefinir-senha',
  'termos',
  'privacidade',
  'cardapio-digital-whatsapp',
  'catalogo-online-roupas',
  'vitrine-digital-confeitaria',
  'link-pedidos-instagram',
  'health',
  'sitemap',
  'robots',
]);

export type HealthStage = 'DRAFT_STUCK' | 'NO_PRODUCTS' | 'READY' | 'SELLING';

function computeHealthScore(cat: {
  status: string;
  logoUrl: string | null;
  whatsapp: string;
  _count: { products: number; orders: number };
}) {
  const hasLogo = Boolean(cat.logoUrl && cat.logoUrl.trim());
  const hasWhatsapp = Boolean(cat.whatsapp && cat.whatsapp.replace(/\D/g, '').length >= 10);
  const hasProducts = cat._count.products > 0;
  const hasOrders = cat._count.orders > 0;

  let stage: HealthStage = 'READY';
  if (cat.status === 'DRAFT') {
    stage = 'DRAFT_STUCK';
  } else if (!hasProducts) {
    stage = 'NO_PRODUCTS';
  } else if (hasOrders) {
    stage = 'SELLING';
  }

  return {
    hasLogo,
    hasWhatsapp,
    hasProducts,
    hasOrders,
    stage,
  };
}

export async function listAdminCatalogs(params: {
  page: number;
  pageSize: number;
  q?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED';
  planType?: 'ESSENTIAL' | 'PRO';
}) {
  const { page, pageSize, q, status, planType } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status } : {}),
    ...(planType ? { planType } : {}),
    ...(q
      ? {
          OR: [
            { storeName: { contains: q, mode: 'insensitive' as const } },
            { slug: { contains: q, mode: 'insensitive' as const } },
            { whatsapp: { contains: q, mode: 'insensitive' as const } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
            { user: { name: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.catalog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        storeName: true,
        slug: true,
        status: true,
        planType: true,
        isTrial: true,
        billingType: true,
        autoRenew: true,
        subscriptionStatus: true,
        logoUrl: true,
        whatsapp: true,
        expiresAt: true,
        renewalCount: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    }),
    prisma.catalog.count({ where }),
  ]);

  const items = rows.map((row) => ({
    ...row,
    health: computeHealthScore(row),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function updateCatalogSlug(params: {
  catalogId: string;
  rawSlug: string;
  admin: AdminActor;
}) {
  const normalized = slugify(params.rawSlug);
  if (normalized.length < 3 || normalized.length > 60) {
    throw new AppError(400, 'Slug deve ter entre 3 e 60 caracteres.');
  }
  if (RESERVED_SLUGS.has(normalized)) {
    throw new AppError(400, `O slug "${normalized}" é reservado pelo sistema.`);
  }

  const catalog = await prisma.catalog.findUnique({
    where: { id: params.catalogId },
    select: { id: true, slug: true, storeName: true },
  });
  if (!catalog) {
    throw new AppError(404, 'Vitrine não encontrada.');
  }

  if (catalog.slug === normalized) {
    return catalog;
  }

  const conflict = await prisma.catalog.findUnique({
    where: { slug: normalized },
    select: { id: true },
  });
  if (conflict) {
    throw new AppError(409, `O slug "${normalized}" já está em uso por outra vitrine.`);
  }

  const updated = await prisma.catalog.update({
    where: { id: catalog.id },
    data: { slug: normalized },
    select: { id: true, slug: true, storeName: true },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'UPDATE_SLUG',
    targetType: 'CATALOG',
    targetId: catalog.id,
    targetLabel: updated.slug,
    beforeJson: { slug: catalog.slug },
    afterJson: { slug: updated.slug },
  });

  return updated;
}

export async function updateCatalogLifecycle(params: {
  catalogId: string;
  addDays?: number;
  expiresAt?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED';
  reason?: string;
  admin: AdminActor;
}) {
  const catalog = await prisma.catalog.findUnique({
    where: { id: params.catalogId },
    select: {
      id: true,
      slug: true,
      storeName: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!catalog) {
    throw new AppError(404, 'Vitrine não encontrada.');
  }

  const now = new Date();
  let nextExpiresAt = catalog.expiresAt;

  if (typeof params.addDays === 'number') {
    const base =
      catalog.expiresAt && catalog.expiresAt.getTime() > now.getTime()
        ? catalog.expiresAt
        : now;
    nextExpiresAt = new Date(base.getTime() + params.addDays * 24 * 60 * 60 * 1000);
  } else if (params.expiresAt) {
    const parsed = new Date(params.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(400, 'Data de validade inválida.');
    }
    nextExpiresAt = parsed;
  }

  const nextStatus =
    params.status ??
    (nextExpiresAt && nextExpiresAt.getTime() > now.getTime()
      ? 'ACTIVE'
      : catalog.status);

  const isExtendingToFuture =
    nextExpiresAt && nextExpiresAt.getTime() > now.getTime();

  const updated = await prisma.catalog.update({
    where: { id: catalog.id },
    data: {
      status: nextStatus,
      expiresAt: nextExpiresAt,
      ...(isExtendingToFuture
        ? {
            notified7DaysBefore: false,
            notifiedExpiration: false,
            lastExpirationNoticeStage: null,
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      status: true,
      expiresAt: true,
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: params.status && !params.addDays && !params.expiresAt
      ? 'UPDATE_STATUS'
      : 'EXTEND_EXPIRATION',
    targetType: 'CATALOG',
    targetId: catalog.id,
    targetLabel: catalog.slug,
    beforeJson: { status: catalog.status, expiresAt: catalog.expiresAt },
    afterJson: { status: updated.status, expiresAt: updated.expiresAt },
    metadata: params.reason ? { reason: params.reason } : undefined,
  });

  return updated;
}

export async function transferCatalogOwnership(params: {
  catalogId: string;
  targetEmail?: string;
  targetUserId?: string;
  admin: AdminActor;
}) {
  const normalizedEmail = params.targetEmail?.trim().toLowerCase();
  if (!normalizedEmail && !params.targetUserId) {
    throw new AppError(400, 'Informe o e-mail ou ID do usuário de destino.');
  }

  const [catalog, targetUser] = await Promise.all([
    prisma.catalog.findUnique({
      where: { id: params.catalogId },
      select: {
        id: true,
        slug: true,
        storeName: true,
        userId: true,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    params.targetUserId
      ? prisma.user.findUnique({
          where: { id: params.targetUserId },
          select: { id: true, email: true, name: true },
        })
      : prisma.user.findUnique({
          where: { email: normalizedEmail! },
          select: { id: true, email: true, name: true },
        }),
  ]);

  if (!catalog) {
    throw new AppError(404, 'Vitrine não encontrada.');
  }
  if (!targetUser) {
    throw new AppError(404, 'Usuário de destino não encontrado.');
  }
  if (catalog.userId === targetUser.id) {
    throw new AppError(400, 'Esta vitrine já pertence a este usuário.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.catalog.update({
      where: { id: catalog.id },
      data: { userId: targetUser.id },
      select: { id: true, slug: true, storeName: true, userId: true },
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: params.admin.id,
        adminEmail: params.admin.email,
        action: 'TRANSFER_CATALOG',
        targetType: 'CATALOG',
        targetId: catalog.id,
        targetLabel: catalog.slug,
        beforeJson: { userId: catalog.userId, ownerEmail: catalog.user.email },
        afterJson: { userId: targetUser.id, ownerEmail: targetUser.email },
      },
    });

    return res;
  });

  markMerchantCache(targetUser.id);
  return { ...updated, targetUser };
}

export async function changeCatalogPlan(params: {
  catalogId: string;
  planCode: PlanCode;
  adjustExpiration?: boolean;
  admin: AdminActor;
}) {
  const plan = PLAN_CATALOG[params.planCode];
  if (!plan) {
    throw new AppError(400, 'Plano inválido.');
  }

  const catalog = await prisma.catalog.findUnique({
    where: { id: params.catalogId },
    select: {
      id: true,
      slug: true,
      planType: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!catalog) {
    throw new AppError(404, 'Vitrine não encontrada.');
  }

  const now = new Date();
  let nextExpiresAt = catalog.expiresAt;
  if (params.adjustExpiration) {
    const base =
      catalog.expiresAt && catalog.expiresAt.getTime() > now.getTime()
        ? catalog.expiresAt
        : now;
    nextExpiresAt = new Date(base.getTime() + plan.days * 24 * 60 * 60 * 1000);
  }

  const updated = await prisma.catalog.update({
    where: { id: catalog.id },
    data: {
      planType: plan.planType,
      ...(params.adjustExpiration
        ? {
            expiresAt: nextExpiresAt,
            status: 'ACTIVE',
            notified7DaysBefore: false,
            notifiedExpiration: false,
            lastExpirationNoticeStage: null,
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      planType: true,
      status: true,
      expiresAt: true,
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'CHANGE_PLAN',
    targetType: 'CATALOG',
    targetId: catalog.id,
    targetLabel: catalog.slug,
    beforeJson: {
      planType: catalog.planType,
      expiresAt: catalog.expiresAt,
      status: catalog.status,
    },
    afterJson: {
      planCode: params.planCode,
      planType: updated.planType,
      expiresAt: updated.expiresAt,
      status: updated.status,
    },
  });

  return updated;
}

export async function deleteCatalogSafely(params: {
  catalogId: string;
  confirmSlug: string;
  admin: AdminActor;
}) {
  const catalog = await prisma.catalog.findUnique({
    where: { id: params.catalogId },
    select: {
      id: true,
      slug: true,
      storeName: true,
      status: true,
      planType: true,
      userId: true,
      logoUrl: true,
      user: { select: { email: true } },
      products: { select: { imageUrl: true } },
      _count: { select: { products: true, orders: true } },
    },
  });

  if (!catalog) {
    throw new AppError(404, 'Vitrine não encontrada.');
  }

  if (params.confirmSlug.trim() !== catalog.slug) {
    throw new AppError(
      400,
      'Confirmação inválida: digite o slug exato da vitrine para excluir.'
    );
  }

  const imageUrls: Array<string | null> = [
    catalog.logoUrl,
    ...catalog.products.map((p) => p.imageUrl),
  ];

  await deleteImagesFromR2(imageUrls);

  await prisma.$transaction(async (tx) => {
    await tx.catalog.delete({
      where: { id: catalog.id },
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: params.admin.id,
        adminEmail: params.admin.email,
        action: 'DELETE_CATALOG',
        targetType: 'CATALOG',
        targetId: catalog.id,
        targetLabel: catalog.slug,
        beforeJson: {
          storeName: catalog.storeName,
          slug: catalog.slug,
          status: catalog.status,
          planType: catalog.planType,
          ownerEmail: catalog.user.email,
          productsCount: catalog._count.products,
          ordersCount: catalog._count.orders,
        },
      },
    });
  });

  return { deleted: true, id: catalog.id, slug: catalog.slug };
}
