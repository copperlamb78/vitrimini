import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../middlewares/errorHandler.js';
import {
  getAllowedAdminEmails,
  signAuthToken,
  type AuthUserPayload,
} from '../middlewares/auth.js';
import {
  getFrontendBaseUrl,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.service.js';
import * as authRepository from '../repositories/auth.repository.js';
import { prisma } from '../lib/prisma.js';

const CURRENT_TERMS_VERSION = '1.1-2026-11';
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

const FORGOT_PASSWORD_COOLDOWN_MS = 2 * 60 * 1000;
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILED_ATTEMPTS = 5;
const MAX_MEMORY_MAP_ENTRIES = 5_000;

const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'vitrimini-anti-timing-dummy-password',
  10
);

interface LoginLockoutEntry {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

const loginLockouts = new Map<string, LoginLockoutEntry>();
const forgotPasswordCooldowns = new Map<string, number>();

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function pruneExpiredLoginLockouts(now: number): void {
  for (const [key, entry] of loginLockouts.entries()) {
    if (entry.blockedUntil <= now && entry.resetAt <= now) {
      loginLockouts.delete(key);
    }
  }
}

function checkLoginLockout(normalizedEmail: string, now: number): void {
  const entry = loginLockouts.get(normalizedEmail);
  if (!entry) return;

  if (entry.blockedUntil > now) {
    throw new AppError(
      429,
      'Muitas tentativas de senha incorretas. Aguarde alguns minutos ou clique em Esqueci minha senha.'
    );
  }

  if (entry.resetAt <= now) {
    loginLockouts.delete(normalizedEmail);
  }
}

function recordFailedLoginAttempt(normalizedEmail: string, now: number): void {
  const current = loginLockouts.get(normalizedEmail);
  if (current && current.blockedUntil <= now && current.resetAt <= now) {
    loginLockouts.delete(normalizedEmail);
  }

  const active = loginLockouts.get(normalizedEmail);
  if (!active) {
    if (loginLockouts.size >= MAX_MEMORY_MAP_ENTRIES) {
      pruneExpiredLoginLockouts(now);
      if (loginLockouts.size >= MAX_MEMORY_MAP_ENTRIES) {
        const oldestKey = loginLockouts.keys().next().value;
        if (oldestKey !== undefined) {
          loginLockouts.delete(oldestKey);
        }
      }
    }

    loginLockouts.set(normalizedEmail, {
      count: 1,
      resetAt: now + LOGIN_LOCKOUT_WINDOW_MS,
      blockedUntil: 0,
    });
    return;
  }

  active.count += 1;
  if (active.count >= LOGIN_MAX_FAILED_ATTEMPTS && active.blockedUntil <= now) {
    active.blockedUntil = now + LOGIN_LOCKOUT_DURATION_MS;
  }
}

function clearLoginLockout(normalizedEmail: string): void {
  loginLockouts.delete(normalizedEmail);
}

function pruneExpiredForgotPasswordCooldowns(now: number): void {
  for (const [key, expiresAt] of forgotPasswordCooldowns.entries()) {
    if (expiresAt <= now) {
      forgotPasswordCooldowns.delete(key);
    }
  }
}

async function issueSessionTokens(user: AuthUserPayload): Promise<{
  accessToken: string;
  rawRefreshToken: string;
}> {
  const accessToken = signAuthToken(user);
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepository.createRefreshToken({
    tokenHash,
    userId: user.id,
    expiresAt,
  });

  return { accessToken, rawRefreshToken };
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (getAllowedAdminEmails().has(normalizedEmail)) {
    throw new AppError(
      403,
      'Este endereço de e-mail não está disponível para auto-cadastro.'
    );
  }

  const existing = await authRepository.findUserIdByEmail(normalizedEmail);
  if (existing) {
    throw new AppError(
      400,
      'Este e-mail já possui uma conta cadastrada. Clique em Entrar.'
    );
  }

  const passwordHash = await bcrypt.hash(input.password.trim(), 10);
  const now = new Date();

  const user = await authRepository.createUser({
    name: input.name,
    email: normalizedEmail,
    phone: input.phone,
    passwordHash,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    termsVersion: CURRENT_TERMS_VERSION,
  });

  const { accessToken, rawRefreshToken } = await issueSessionTokens(user);

  // Dispara e-mail de boas-vindas em background sem bloquear a resposta do cadastro
  void sendWelcomeEmail({
    to: user.email,
    name: user.name,
  }).catch((mailErr) => {
    console.error('[Welcome Email Error]:', mailErr);
  });

  return {
    token: accessToken,
    rawRefreshToken,
    user: {
      ...user,
      canUseTrial: !user.hasUsedTrial,
    },
  };
}

export async function login(input: LoginInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = Date.now();

  checkLoginLockout(normalizedEmail, now);

  const user = await authRepository.findUserForLoginByEmail(normalizedEmail);
  if (!user) {
    await bcrypt.compare(input.password.trim(), DUMMY_PASSWORD_HASH);
    recordFailedLoginAttempt(normalizedEmail, Date.now());
    throw new AppError(401, 'E-mail ou senha incorretos.');
  }

  const valid = await bcrypt.compare(input.password.trim(), user.passwordHash);
  if (!valid) {
    recordFailedLoginAttempt(normalizedEmail, Date.now());
    throw new AppError(401, 'E-mail ou senha incorretos.');
  }

  clearLoginLockout(normalizedEmail);

  void prisma.user
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => undefined);

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    hasUsedTrial: user.hasUsedTrial,
    canUseTrial: !user.hasUsedTrial,
    _count: user._count,
  };

  const { accessToken, rawRefreshToken } = await issueSessionTokens(publicUser);

  return {
    token: accessToken,
    rawRefreshToken,
    user: publicUser,
  };
}

export async function forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  const cooldownUntil = forgotPasswordCooldowns.get(normalizedEmail);
  if (cooldownUntil !== undefined) {
    if (cooldownUntil > now) {
      return {
        message:
          'Se este e-mail estiver cadastrado, enviamos as instruções para redefinir sua senha.',
      };
    }
    forgotPasswordCooldowns.delete(normalizedEmail);
  }

  if (forgotPasswordCooldowns.size >= MAX_MEMORY_MAP_ENTRIES) {
    pruneExpiredForgotPasswordCooldowns(now);
    if (forgotPasswordCooldowns.size >= MAX_MEMORY_MAP_ENTRIES) {
      const oldestKey = forgotPasswordCooldowns.keys().next().value;
      if (oldestKey !== undefined) {
        forgotPasswordCooldowns.delete(oldestKey);
      }
    }
  }

  forgotPasswordCooldowns.set(
    normalizedEmail,
    now + FORGOT_PASSWORD_COOLDOWN_MS
  );

  const user = await authRepository.findUserBasicByEmail(normalizedEmail);
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await authRepository.savePasswordResetToken(user.id, tokenHash, expiresAt);

    const frontendUrl = getFrontendBaseUrl();
    const resetUrl = `${frontendUrl}/redefinir-senha?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (mailErr) {
      console.error('[Password Reset Email Error]:', mailErr);
    }
  }

  return {
    message:
      'Se este e-mail estiver cadastrado, enviamos as instruções para redefinir sua senha.',
  };
}

export async function resetPassword(input: {
  token: string;
  password: string;
}) {
  const tokenHash = hashToken(input.token);
  const user = await authRepository.findUserByValidResetTokenHash(
    tokenHash,
    new Date()
  );

  if (!user) {
    throw new AppError(
      400,
      'Este link de redefinição é inválido ou expirou. Solicite um novo link.'
    );
  }

  const newPasswordHash = await bcrypt.hash(input.password.trim(), 10);

  await authRepository.updatePasswordAndRevokeRefreshTokens(
    user.id,
    newPasswordHash,
    new Date()
  );

  clearLoginLockout(user.email.trim().toLowerCase());

  // Dispara confirmação de senha alterada em background
  void sendPasswordChangedEmail({
    to: user.email,
    name: user.name,
    changedAt: new Date(),
  }).catch((mailErr) => {
    console.error('[Password Changed Email Error]:', mailErr);
  });

  return {
    message: 'Sua senha foi redefinida com sucesso! Você já pode entrar.',
  };
}

export async function refreshSession(rawRefresh: string | null) {
  if (!rawRefresh) {
    throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
  }

  const tokenHash = hashToken(rawRefresh);
  const stored =
    await authRepository.findRefreshTokenWithUserByHash(tokenHash);

  if (!stored) {
    throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
  }

  // Se um token já revogado for reutilizado, revoga todas as sessões do usuário
  if (stored.revokedAt !== null) {
    await authRepository.revokeAllUserRefreshTokens(stored.userId, new Date());
    throw new AppError(
      401,
      'Por segurança, você foi desconectado. Entre novamente.'
    );
  }

  const now = new Date();
  if (stored.expiresAt <= now) {
    await authRepository.revokeRefreshTokenById(stored.id, now);
    throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
  }

  const nextRawRefresh = crypto.randomBytes(48).toString('hex');
  const nextTokenHash = hashToken(nextRawRefresh);
  const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const rotated = await authRepository.rotateRefreshToken({
    currentTokenId: stored.id,
    userId: stored.userId,
    nextTokenHash,
    nextExpiresAt,
    revokedAt: new Date(),
  });

  if (!rotated) {
    throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
  }

  const accessToken = signAuthToken(stored.user);

  void prisma.user
    .update({
      where: { id: stored.userId },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => undefined);

  return {
    token: accessToken,
    rawRefreshToken: nextRawRefresh,
    user: {
      ...stored.user,
      canUseTrial: !stored.user.hasUsedTrial,
    },
  };
}

export async function logout(rawRefresh: string | null): Promise<void> {
  if (!rawRefresh) return;
  await authRepository.revokeRefreshTokenByHash(
    hashToken(rawRefresh),
    new Date()
  );
}

export async function getMe(
  userId: string,
  impersonation?: { isImpersonation?: boolean; impersonatedBy?: string }
) {
  const user = await authRepository.findUserProfileById(userId);
  if (!user) {
    throw new AppError(401, 'Conta não encontrada. Entre novamente.');
  }

  return {
    user: {
      ...user,
      canUseTrial: !user.hasUsedTrial,
      ...(impersonation?.isImpersonation
        ? {
            isImpersonation: true,
            impersonatedBy: impersonation.impersonatedBy,
          }
        : {}),
    },
  };
}
