import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { recordAdminAudit } from './audit.service.js';
import { sendExpirationRuleEmail } from './email.service.js';
import type { AdminActor } from './adminCatalog.service.js';

const BREVO_DAILY_LIMIT = 300;
const BREVO_AUTO_THRESHOLD = 240; // 80% da cota diária
const CRON_SETTING_KEY = 'EXPIRATION_REMINDER_CRON_ENABLED';

function getSaoPauloDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function getSaoPauloDayStart(date: Date): Date {
  const key = getSaoPauloDateKey(date);
  return new Date(`${key}T00:00:00-03:00`);
}

function getSaoPauloHour(date: Date): number {
  const hourStr = date.toLocaleTimeString('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  });
  return Number(hourStr.split(':')[0]) || 0;
}

export async function getBrevoDailyQuotaStatus() {
  const todayStart = getSaoPauloDayStart(new Date());
  const sentToday = await prisma.emailLog.count({
    where: {
      status: 'SENT',
      createdAt: { gte: todayStart },
    },
  });

  return {
    sentToday,
    limit: BREVO_DAILY_LIMIT,
    autoStopThreshold: BREVO_AUTO_THRESHOLD,
    canSendAutomated: sentToday < BREVO_AUTO_THRESHOLD,
  };
}

export async function getExpirationCronEnabled(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: CRON_SETTING_KEY },
    select: { value: true },
  });
  if (row) {
    return row.value === 'true';
  }
  return process.env.EXPIRATION_REMINDER_CRON_ENABLED === 'true';
}

export async function setExpirationCronEnabled(params: {
  enabled: boolean;
  admin: AdminActor;
}) {
  await prisma.systemSetting.upsert({
    where: { key: CRON_SETTING_KEY },
    update: { value: params.enabled ? 'true' : 'false' },
    create: {
      key: CRON_SETTING_KEY,
      value: params.enabled ? 'true' : 'false',
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'TOGGLE_EXPIRATION_CRON',
    targetType: 'SYSTEM',
    targetId: CRON_SETTING_KEY,
    afterJson: { enabled: params.enabled },
  });

  return { enabled: params.enabled };
}

export async function getExpirationRadar(params: { q?: string }) {
  const now = new Date();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const q = params.q?.trim();

  const [catalogs, cronEnabled, quota] = await Promise.all([
    prisma.catalog.findMany({
      where: {
        expiresAt: {
          gte: fifteenDaysAgo,
          lte: sevenDaysAhead,
        },
        status: { in: ['ACTIVE', 'EXPIRED'] },
        ...(q
          ? {
              OR: [
                { storeName: { contains: q, mode: 'insensitive' as const } },
                { slug: { contains: q, mode: 'insensitive' as const } },
                { user: { email: { contains: q, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true,
        storeName: true,
        slug: true,
        status: true,
        planType: true,
        whatsapp: true,
        expiresAt: true,
        lastExpirationNoticeStage: true,
        lastExpirationNoticeAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    getExpirationCronEnabled(),
    getBrevoDailyQuotaStatus(),
  ]);

  const items = catalogs.map((cat) => {
    const expMs = cat.expiresAt ? cat.expiresAt.getTime() : now.getTime();
    const diffDays = Math.ceil((expMs - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      ...cat,
      daysRemaining: diffDays,
      urgency:
        diffDays < 0
          ? ('EXPIRED' as const)
          : diffDays <= 1
            ? ('CRITICAL' as const)
            : ('UPCOMING' as const),
    };
  });

  return {
    cronEnabled,
    quota,
    items,
  };
}

export async function sendManualExpirationReminder(params: {
  catalogId: string;
  admin: AdminActor;
}) {
  const catalog = await prisma.catalog.findUnique({
    where: { id: params.catalogId },
    select: {
      id: true,
      storeName: true,
      slug: true,
      expiresAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!catalog || !catalog.expiresAt) {
    throw new AppError(404, 'Vitrine ou data de validade não encontrada.');
  }

  const quota = await getBrevoDailyQuotaStatus();
  if (!quota.canSendAutomated) {
    throw new AppError(
      429,
      `Cota de segurança do Brevo atingida (${quota.sentToday}/${quota.limit}). Envios de lembrete pausados para preservar transacionais.`
    );
  }

  const now = new Date();
  const diffDays = Math.ceil(
    (catalog.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );
  const stage = diffDays > 0 ? 'D-3' : diffDays === 0 ? 'D-0' : 'D+2';

  await sendExpirationRuleEmail({
    to: catalog.user.email,
    name: catalog.user.name,
    storeName: catalog.storeName,
    slug: catalog.slug,
    expiresAt: catalog.expiresAt,
    stage,
  });

  await prisma.catalog.update({
    where: { id: catalog.id },
    data: {
      lastExpirationNoticeStage: `MANUAL_${stage}`,
      lastExpirationNoticeAt: now,
    },
  });

  await recordAdminAudit({
    adminUserId: params.admin.id,
    adminEmail: params.admin.email,
    action: 'SEND_EXPIRATION_EMAIL',
    targetType: 'CATALOG',
    targetId: catalog.id,
    targetLabel: catalog.slug,
    metadata: { recipient: catalog.user.email, stage },
  });

  return { sent: true, recipient: catalog.user.email, stage };
}

export async function runExpirationEmailRules(params: {
  dryRun: boolean;
  admin?: AdminActor;
  respectBusinessHours?: boolean;
}) {
  const now = new Date();
  if (params.respectBusinessHours) {
    const enabled = await getExpirationCronEnabled();
    if (!enabled) {
      return { skipped: true, reason: 'CRON_DISABLED', processed: 0, candidates: [] };
    }
    const hour = getSaoPauloHour(now);
    if (hour < 9 || hour >= 19) {
      return { skipped: true, reason: 'OUTSIDE_BUSINESS_HOURS', processed: 0, candidates: [] };
    }
  }

  const quota = await getBrevoDailyQuotaStatus();
  if (!params.dryRun && !quota.canSendAutomated) {
    return {
      skipped: true,
      reason: 'BREVO_QUOTA_80_PERCENT',
      quota,
      processed: 0,
      candidates: [],
    };
  }

  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAhead = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const todayKey = getSaoPauloDateKey(now);

  const catalogs = await prisma.catalog.findMany({
    where: {
      expiresAt: { gte: threeDaysAgo, lte: fourDaysAhead },
      status: { in: ['ACTIVE', 'EXPIRED'] },
    },
    select: {
      id: true,
      storeName: true,
      slug: true,
      expiresAt: true,
      lastExpirationNoticeStage: true,
      user: { select: { name: true, email: true } },
    },
  });

  const candidates: Array<{
    catalogId: string;
    slug: string;
    email: string;
    stage: 'D-3' | 'D-0' | 'D+2';
  }> = [];

  for (const cat of catalogs) {
    if (!cat.expiresAt) continue;
    const expKey = getSaoPauloDateKey(cat.expiresAt);
    const diffDays = Math.round(
      (new Date(`${expKey}T00:00:00-03:00`).getTime() -
        new Date(`${todayKey}T00:00:00-03:00`).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    let stage: 'D-3' | 'D-0' | 'D+2' | null = null;
    if (diffDays === 3) stage = 'D-3';
    else if (diffDays === 0) stage = 'D-0';
    else if (diffDays === -2) stage = 'D+2';

    if (!stage) continue;
    if (cat.lastExpirationNoticeStage === stage) continue;

    candidates.push({
      catalogId: cat.id,
      slug: cat.slug,
      email: cat.user.email,
      stage,
    });
  }

  if (params.dryRun) {
    return {
      dryRun: true,
      quota,
      processed: 0,
      candidates,
    };
  }

  let sentCount = 0;
  let currentSentToday = quota.sentToday;

  for (const item of candidates) {
    if (currentSentToday >= BREVO_AUTO_THRESHOLD) {
      break;
    }

    const cat = catalogs.find((c) => c.id === item.catalogId);
    if (!cat || !cat.expiresAt) continue;

    // Marca no banco ANTES do envio para evitar duplicação em restarts
    const updated = await prisma.catalog.updateMany({
      where: {
        id: cat.id,
        OR: [
          { lastExpirationNoticeStage: null },
          { lastExpirationNoticeStage: { not: item.stage } },
        ],
      },
      data: {
        lastExpirationNoticeStage: item.stage,
        lastExpirationNoticeAt: new Date(),
      },
    });

    if (updated.count === 0) continue;

    try {
      await sendExpirationRuleEmail({
        to: cat.user.email,
        name: cat.user.name,
        storeName: cat.storeName,
        slug: cat.slug,
        expiresAt: cat.expiresAt,
        stage: item.stage,
      });
      sentCount += 1;
      currentSentToday += 1;
    } catch (err) {
      console.error('[Expiration Rule Email Error]:', err);
    }
  }

  if (params.admin) {
    await recordAdminAudit({
      adminUserId: params.admin.id,
      adminEmail: params.admin.email,
      action: 'RUN_EXPIRATION_RULES',
      targetType: 'SYSTEM',
      targetId: 'expiration-rules',
      metadata: { sentCount, candidateCount: candidates.length },
    });
  }

  return {
    dryRun: false,
    quota: {
      ...quota,
      sentToday: currentSentToday,
      canSendAutomated: currentSentToday < BREVO_AUTO_THRESHOLD,
    },
    processed: sentCount,
    candidates,
  };
}
