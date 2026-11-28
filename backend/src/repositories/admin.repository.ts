import { prisma } from '../lib/prisma.js';

export interface OverviewDateRanges {
  todayStart: Date;
  sevenDaysAgo: Date;
  thirtyDaysAgo: Date;
}

export async function fetchOverviewRawData({
  todayStart,
  sevenDaysAgo,
  thirtyDaysAgo,
}: OverviewDateRanges) {
  const [
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
  ] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        recipient: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
    prisma.emailLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { status: true, createdAt: true },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: { catalogs: { some: {} } },
    }),
    prisma.catalog.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.order.count(),
    prisma.catalogPayment.aggregate({
      where: { status: 'PAID', paidAt: { gte: todayStart } },
      _sum: { amountCents: true, feeCents: true, netAmountCents: true },
      _count: { _all: true },
    }),
    prisma.catalogPayment.aggregate({
      where: { status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
      _sum: { amountCents: true, feeCents: true, netAmountCents: true },
      _count: { _all: true },
    }),
    prisma.catalogPayment.aggregate({
      where: { status: 'PAID' },
      _sum: { amountCents: true, feeCents: true, netAmountCents: true },
      _count: { _all: true },
    }),
    prisma.catalog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        storeName: true,
        slug: true,
        status: true,
        expiresAt: true,
        renewalCount: true,
        createdAt: true,
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    }),
    prisma.catalogPayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        amountCents: true,
        gatewayId: true,
        paidAt: true,
        createdAt: true,
        catalogNameSnapshot: true,
        catalogSlugSnapshot: true,
        ownerEmailSnapshot: true,
        user: {
          select: { name: true, email: true },
        },
        catalog: {
          select: { storeName: true, slug: true },
        },
      },
    }),
  ]);

  return {
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
  };
}
