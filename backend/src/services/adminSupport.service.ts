import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  getAllowedAdminEmails,
  signImpersonationToken,
} from '../middlewares/auth.js';
import {
  getFrontendBaseUrl,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.service.js';
import { recordAdminAudit } from './audit.service.js';
import type { AdminActor } from './adminCatalog.service.js';

const ADMIN_RESET_LINK_TTL_MS = 60 * 60 * 1000; // 1 hora

export async function listAdminUsers(params: {
  page: number;
  pageSize: number;
  q?: string;
  role?: 'MERCHANT' | 'BUYER';
}) {
  const { page, pageSize, q, role } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(role === 'MERCHANT'
      ? { catalogs: { some: {} } }
      : role === 'BUYER'
        ? { catalogs: { none: {} } }
        : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        hasUsedTrial: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            catalogs: true,
            orders: true,
          },
        },
        catalogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            storeName: true,
            slug: true,
            whatsapp: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const adminEmails = getAllowedAdminEmails();
  const items = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    hasUsedTrial: u.hasUsedTrial,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    role: u._count.catalogs > 0 ? ('MERCHANT' as const) : ('BUYER' as const),
    isAdmin: adminEmails.has(u.email.trim().toLowerCase()),
    catalogsCount: u._count.catalogs,
    ordersCount: u._count.orders,
    primaryCatalog: u.catalogs[0] || null,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function impersonateUser(params: {
  targetUserId: string;
  admin: AdminActor;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hasUsedTrial: true,
      _count: { select: { catalogs: true } },
    },
  });

  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  const allowedAdmins = getAllowedAdminEmails();
  if (allowedAdmins.has(user.email.trim().toLowerCase())) {
    throw new AppError(
      403,
      'Não é permitido entrar no modo suporte em outro Super Admin.'
    );
  }

  const token = signImpersonationToken(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
    params.admin.email
  );

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'IMPERSONATE_START',
    targetType: 'USER',
    targetId: user.id,
    targetLabel: user.email,
  });

  return {
    token,
    expiresInMinutes: 30,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasUsedTrial: user.hasUsedTrial,
      canUseTrial: !user.hasUsedTrial,
      isImpersonation: true,
      impersonatedBy: params.admin.email,
      _count: user._count,
    },
  };
}

export async function resendWelcomeEmailToUser(params: {
  targetUserId: string;
  admin: AdminActor;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  await sendWelcomeEmail({
    to: user.email,
    name: user.name,
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'RESEND_WELCOME_EMAIL',
    targetType: 'USER',
    targetId: user.id,
    targetLabel: user.email,
  });

  return { sent: true, email: user.email };
}

export async function generateResetPasswordLinkForUser(params: {
  targetUserId: string;
  sendEmail: boolean;
  admin: AdminActor;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + ADMIN_RESET_LINK_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const resetUrl = `${getFrontendBaseUrl()}/redefinir-senha?token=${rawToken}`;

  if (params.sendEmail) {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  }

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'GENERATE_RESET_LINK',
    targetType: 'USER',
    targetId: user.id,
    targetLabel: user.email,
    metadata: { sendEmail: params.sendEmail },
  });

  return {
    resetUrl,
    expiresAt,
    emailSent: params.sendEmail,
  };
}
