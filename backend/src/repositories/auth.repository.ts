import { prisma } from '../lib/prisma.js';

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  termsAcceptedAt: Date;
  privacyAcceptedAt: Date;
  termsVersion: string;
}

export async function findUserIdByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
}

export async function createUser(data: CreateUserData) {
  return prisma.user.create({
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hasUsedTrial: true,
    },
  });
}

/**
 * Uso exclusivo na verificação interna de credenciais no login.
 * O service nunca deve propagar `passwordHash` para fora.
 */
export async function findUserForLoginByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hasUsedTrial: true,
      passwordHash: true,
      _count: {
        select: {
          catalogs: true,
          orders: true,
        },
      },
    },
  });
}

export async function findUserBasicByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function savePasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
    select: { id: true },
  });
}

export async function findUserByValidResetTokenHash(
  tokenHash: string,
  now: Date
) {
  return prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function updatePasswordAndRevokeRefreshTokens(
  userId: string,
  newPasswordHash: string,
  revokedAt: Date
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
      select: { id: true },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    }),
  ]);
}

export async function createRefreshToken(data: {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}) {
  return prisma.refreshToken.create({
    data,
    select: { id: true },
  });
}

export async function findRefreshTokenWithUserByHash(tokenHash: string) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          hasUsedTrial: true,
        },
      },
    },
  });
}

export async function revokeAllUserRefreshTokens(
  userId: string,
  revokedAt: Date
) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt },
  });
}

export async function revokeRefreshTokenById(id: string, revokedAt: Date) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt },
    select: { id: true },
  });
}

export async function rotateRefreshToken(params: {
  currentTokenId: string;
  userId: string;
  nextTokenHash: string;
  nextExpiresAt: Date;
  revokedAt: Date;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id: params.currentTokenId, revokedAt: null },
      data: { revokedAt: params.revokedAt },
    });
    if (revoked.count === 0) return false;

    await tx.refreshToken.create({
      data: {
        tokenHash: params.nextTokenHash,
        userId: params.userId,
        expiresAt: params.nextExpiresAt,
      },
      select: { id: true },
    });
    return true;
  });
}

export async function revokeRefreshTokenByHash(
  tokenHash: string,
  revokedAt: Date
) {
  return prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: { revokedAt },
  });
}

export async function findUserProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hasUsedTrial: true,
      createdAt: true,
      _count: {
        select: {
          catalogs: true,
          payments: true,
          orders: true,
        },
      },
    },
  });
}
