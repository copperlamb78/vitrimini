import * as adminRepository from '../repositories/admin.repository.js';

const BREVO_DAILY_LIMIT = 300;

function getSaoPauloDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function getSaoPauloDayStart(date: Date): Date {
  const key = getSaoPauloDateKey(date);
  return new Date(`${key}T00:00:00-03:00`);
}

export async function getOverview() {
  const now = new Date();
  const todayStart = getSaoPauloDayStart(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const {
    recentEmailLogs,
    last7DaysEmails,
    totalUsers,
    usersWithCatalogs,
    catalogGroups,
    totalOrders,
    paidTodayAgg,
    paid30dAgg,
    paidTotalAgg,
    recentCatalogs,
    recentPayments,
  } = await adminRepository.fetchOverviewRawData({
    todayStart,
    sevenDaysAgo,
    thirtyDaysAgo,
  });

  // Agrupa e-mails dos últimos 7 dias no fuso America/Sao_Paulo
  const dayBuckets = new Map<
    string,
    { date: string; sent: number; failed: number }
  >();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const key = getSaoPauloDateKey(d);
    dayBuckets.set(key, { date: key, sent: 0, failed: 0 });
  }

  const todayKey = getSaoPauloDateKey(now);
  let sentToday = 0;
  let failedToday = 0;

  for (const log of last7DaysEmails) {
    const key = getSaoPauloDateKey(log.createdAt);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      if (log.status === 'SENT') bucket.sent += 1;
      else bucket.failed += 1;
    }
    if (key === todayKey) {
      if (log.status === 'SENT') sentToday += 1;
      else failedToday += 1;
    }
  }

  const usagePercent = Math.min(
    100,
    Math.round((sentToday / BREVO_DAILY_LIMIT) * 100)
  );

  const catalogsByStatus = {
    ACTIVE: 0,
    DRAFT: 0,
    EXPIRED: 0,
  };
  for (const grp of catalogGroups) {
    catalogsByStatus[grp.status] = grp._count._all;
  }

  return {
    brevo: {
      dailyLimit: BREVO_DAILY_LIMIT,
      sentToday,
      failedToday,
      usagePercent,
      last7Days: Array.from(dayBuckets.values()),
      recentLogs: recentEmailLogs,
    },
    saas: {
      totalUsers,
      usersWithCatalogs,
      catalogsByStatus,
      totalOrders,
      revenueTodayCents: paidTodayAgg._sum.amountCents || 0,
      paymentsTodayCount: paidTodayAgg._count._all,
      revenue30dCents: paid30dAgg._sum.amountCents || 0,
      payments30dCount: paid30dAgg._count._all,
      revenueTotalCents: paidTotalAgg._sum.amountCents || 0,
      paymentsTotalCount: paidTotalAgg._count._all,
      revenue: {
        today: {
          grossCents: paidTodayAgg._sum.amountCents || 0,
          feeCents: paidTodayAgg._sum.feeCents || 0,
          netCents:
            paidTodayAgg._sum.netAmountCents ??
            Math.max(
              0,
              (paidTodayAgg._sum.amountCents || 0) -
                (paidTodayAgg._sum.feeCents || 0)
            ),
        },
        last30d: {
          grossCents: paid30dAgg._sum.amountCents || 0,
          feeCents: paid30dAgg._sum.feeCents || 0,
          netCents:
            paid30dAgg._sum.netAmountCents ??
            Math.max(
              0,
              (paid30dAgg._sum.amountCents || 0) -
                (paid30dAgg._sum.feeCents || 0)
            ),
        },
        total: {
          grossCents: paidTotalAgg._sum.amountCents || 0,
          feeCents: paidTotalAgg._sum.feeCents || 0,
          netCents:
            paidTotalAgg._sum.netAmountCents ??
            Math.max(
              0,
              (paidTotalAgg._sum.amountCents || 0) -
                (paidTotalAgg._sum.feeCents || 0)
            ),
        },
      },
    },
    recentCatalogs,
    recentPayments,
  };
}
