import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface CreateProductPersistenceInput {
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  orderIndex: number;
  available: boolean;
}

export interface CreateTrialCatalogInput {
  slug: string;
  expiresAt: Date;
  userId: string;
  storeName: string;
  logoUrl: string | null;
  themeColor: string;
  whatsapp: string;
  pixKey: string | null;
  depositPct: number;
  minOrderCents: number;
  paymentNotice: string | null;
  deliveryDates: string[];
  notes: string | null;
  products: CreateProductPersistenceInput[];
}

export interface CreateDraftCatalogInput {
  slug: string;
  planType: 'ESSENTIAL' | 'PRO';
  userId: string;
  storeName: string;
  logoUrl: string | null;
  themeColor: string;
  whatsapp: string;
  pixKey: string | null;
  depositPct: number;
  minOrderCents: number;
  paymentNotice: string | null;
  deliveryDates: string[];
  notes: string | null;
  products: CreateProductPersistenceInput[];
}

export interface UpdateCatalogFieldsPersistenceInput {
  storeName: string;
  logoUrl: string | null;
  themeColor: string;
  whatsapp: string;
  pixKey: string | null;
  depositPct: number;
  minOrderCents: number;
  paymentNotice: string | null;
  deliveryDates: string[];
  notes: string | null;
  pickupAddress: string | null;
  pickupInstructions: string | null;
  deliveryEstimate: string | null;
  notifyOrderByEmail: boolean;
  bioLinksConfig?: Prisma.InputJsonValue;
}

export interface PreparedProductPersistenceItem {
  existingId?: string;
  payload: CreateProductPersistenceInput;
}

const OWNED_CATALOG_DETAIL_SELECT = {
  id: true,
  slug: true,
  editToken: true,
  status: true,
  isTrial: true,
  planType: true,
  onlinePaymentEnabled: true,
  mpUserId: true,
  renewalCount: true,
  storeName: true,
  logoUrl: true,
  themeColor: true,
  whatsapp: true,
  pixKey: true,
  depositPct: true,
  minOrderCents: true,
  paymentNotice: true,
  deliveryDates: true,
  notes: true,
  pickupAddress: true,
  pickupInstructions: true,
  deliveryEstimate: true,
  notifyOrderByEmail: true,
  bioLinksConfig: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  products: {
    orderBy: { orderIndex: 'asc' as const },
  },
} satisfies Prisma.CatalogSelect;

const UPDATED_CATALOG_SELECT = {
  id: true,
  slug: true,
  editToken: true,
  status: true,
  isTrial: true,
  renewalCount: true,
  storeName: true,
  logoUrl: true,
  themeColor: true,
  whatsapp: true,
  pixKey: true,
  depositPct: true,
  minOrderCents: true,
  paymentNotice: true,
  deliveryDates: true,
  notes: true,
  notifyOrderByEmail: true,
  bioLinksConfig: true,
  planType: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  products: {
    orderBy: { orderIndex: 'asc' as const },
  },
} satisfies Prisma.CatalogSelect;

export async function confirmCatalogPaymentTx(params: {
  paymentRecordId: string;
  resolveConfirmation: (record: {
    amountCents: number;
    planCode: string;
    catalog: {
      planType: 'ESSENTIAL' | 'PRO';
      expiresAt: Date | null;
    };
  }) => {
    feeCents: number;
    netAmountCents: number;
    planDurationMs: number;
    nextPlanType: 'ESSENTIAL' | 'PRO';
    nowMs: number;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const paymentRecord = await tx.catalogPayment.findUnique({
      where: { id: params.paymentRecordId },
      include: {
        catalog: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!paymentRecord) {
      return null;
    }

    const computed = params.resolveConfirmation(paymentRecord);

    // Trava atômica anti-race-condition: garante transição única PENDING -> PAID
    const claimed = await tx.catalogPayment.updateMany({
      where: { id: paymentRecord.id, status: 'PENDING' },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        feeCents: computed.feeCents,
        netAmountCents: computed.netAmountCents,
      },
    });

    if (claimed.count === 0) {
      return {
        catalog: paymentRecord.catalog,
        justConfirmed: false,
        type: paymentRecord.type,
        user: paymentRecord.user,
      };
    }

    const currentExpires = paymentRecord.catalog.expiresAt;
    const baseTime =
      currentExpires && currentExpires.getTime() > computed.nowMs
        ? currentExpires.getTime()
        : computed.nowMs;

    if (paymentRecord.type === 'RENEWAL') {
      const updatedCatalog = await tx.catalog.update({
        where: {
          id: paymentRecord.catalogId,
          userId: paymentRecord.userId,
        },
        data: {
          status: 'ACTIVE',
          isTrial: false,
          planType: computed.nextPlanType,
          renewalCount: { increment: 1 },
          expiresAt: new Date(baseTime + computed.planDurationMs),
          notified7DaysBefore: false,
          notifiedExpiration: false,
        },
      });

      return {
        catalog: updatedCatalog,
        justConfirmed: true,
        type: paymentRecord.type,
        user: paymentRecord.user,
      };
    }

    const updatedCatalog = await tx.catalog.update({
      where: {
        id: paymentRecord.catalogId,
        userId: paymentRecord.userId,
      },
      data: {
        status: 'ACTIVE',
        isTrial: false,
        planType: computed.nextPlanType,
        expiresAt: new Date(baseTime + computed.planDurationMs),
        notified7DaysBefore: false,
        notifiedExpiration: false,
      },
    });

    return {
      catalog: updatedCatalog,
      justConfirmed: true,
      type: paymentRecord.type,
      user: paymentRecord.user,
    };
  });
}

export async function findTrialEligibilityData(userId: string, whatsapp: string) {
  const [dbUser, existingTrialByWhatsapp] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { hasUsedTrial: true },
    }),
    prisma.catalog.findFirst({
      where: { whatsapp, isTrial: true },
      select: { id: true },
    }),
  ]);

  return { dbUser, existingTrialByWhatsapp };
}

export async function createTrialCatalogTx(input: CreateTrialCatalogInput) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: input.userId, hasUsedTrial: false },
      data: { hasUsedTrial: true },
    });

    if (claimed.count === 0) {
      return null;
    }

    return tx.catalog.create({
      data: {
        slug: input.slug,
        status: 'ACTIVE',
        isTrial: true,
        expiresAt: input.expiresAt,
        userId: input.userId,
        storeName: input.storeName,
        logoUrl: input.logoUrl,
        themeColor: input.themeColor,
        whatsapp: input.whatsapp,
        pixKey: input.pixKey,
        depositPct: input.depositPct,
        minOrderCents: input.minOrderCents,
        paymentNotice: input.paymentNotice,
        deliveryDates: input.deliveryDates,
        notes: input.notes,
        products: {
          create: input.products,
        },
      },
    });
  });
}

export async function createDraftCatalog(input: CreateDraftCatalogInput) {
  return prisma.catalog.create({
    data: {
      slug: input.slug,
      status: 'DRAFT',
      isTrial: false,
      planType: input.planType,
      userId: input.userId,
      storeName: input.storeName,
      logoUrl: input.logoUrl,
      themeColor: input.themeColor,
      whatsapp: input.whatsapp,
      pixKey: input.pixKey,
      depositPct: input.depositPct,
      minOrderCents: input.minOrderCents,
      paymentNotice: input.paymentNotice,
      deliveryDates: input.deliveryDates,
      notes: input.notes,
      products: {
        create: input.products,
      },
    },
  });
}

export async function createCatalogPaymentRecord(input: {
  userId: string;
  catalogId: string;
  type: 'CREATION' | 'RENEWAL';
  planCode: string;
  amountCents: number;
  gatewayId: string;
}) {
  return prisma.catalogPayment.create({
    data: {
      userId: input.userId,
      catalogId: input.catalogId,
      type: input.type,
      planCode: input.planCode,
      status: 'PENDING',
      amountCents: input.amountCents,
      gatewayId: input.gatewayId,
    },
  });
}

export async function updateOwnedCatalogPaymentId(
  catalogId: string,
  userId: string,
  paymentId: string
) {
  return prisma.catalog.update({
    where: { id: catalogId, userId },
    data: { paymentId },
  });
}

export async function findOwnedCatalogById(id: string, userId: string) {
  return prisma.catalog.findFirst({
    where: { id, userId },
  });
}

export async function findUserCatalogsAndTrialFlag(userId: string) {
  const [catalogs, dbUser] = await Promise.all([
    prisma.catalog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        storeName: true,
        slug: true,
        editToken: true,
        status: true,
        isTrial: true,
        planType: true,
        onlinePaymentEnabled: true,
        mpUserId: true,
        expiresAt: true,
        renewalCount: true,
        logoUrl: true,
        themeColor: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { hasUsedTrial: true },
    }),
  ]);

  return { catalogs, dbUser };
}

export async function findOwnedCatalogStatusSummary(id: string, userId: string) {
  return prisma.catalog.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      slug: true,
      editToken: true,
      expiresAt: true,
      renewalCount: true,
    },
  });
}

export async function findOwnedCatalogPaymentForStatus(params: {
  catalogId: string;
  userId: string;
  paymentRecordId?: string;
}) {
  if (params.paymentRecordId) {
    return prisma.catalogPayment.findFirst({
      where: {
        id: params.paymentRecordId,
        catalogId: params.catalogId,
        userId: params.userId,
      },
    });
  }

  return prisma.catalogPayment.findFirst({
    where: {
      catalogId: params.catalogId,
      userId: params.userId,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPendingOwnedCatalogPayment(
  catalogId: string,
  userId: string
) {
  return prisma.catalogPayment.findFirst({
    where: {
      catalogId,
      userId,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function activateOwnedCatalogMockDirect(params: {
  id: string;
  userId: string;
  planType: 'ESSENTIAL' | 'PRO';
  expiresAt: Date;
}) {
  return prisma.catalog.update({
    where: { id: params.id, userId: params.userId },
    data: {
      status: 'ACTIVE',
      isTrial: false,
      planType: params.planType,
      expiresAt: params.expiresAt,
    },
    select: {
      status: true,
      slug: true,
      editToken: true,
      expiresAt: true,
      renewalCount: true,
    },
  });
}

export async function findCatalogPaymentByGatewayId(gatewayId: string) {
  return prisma.catalogPayment.findFirst({
    where: { gatewayId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findFallbackPendingPaymentForWebhook(
  catalogId: string,
  mpOrderId: string
) {
  return prisma.catalogPayment.findFirst({
    where: {
      catalogId,
      status: 'PENDING',
      OR: [{ gatewayId: null }, { gatewayId: mpOrderId }],
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPendingPaymentByCatalogIdForWebhook(
  catalogId: string
) {
  return prisma.catalogPayment.findFirst({
    where: { catalogId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCatalogByIdForWebhook(catalogId: string) {
  return prisma.catalog.findUnique({
    where: { id: catalogId },
  });
}

export async function activateCatalogFromMockWebhook(
  catalogId: string,
  userId: string,
  expiresAt: Date
) {
  return prisma.catalog.update({
    where: { id: catalogId, userId },
    data: {
      status: 'ACTIVE',
      expiresAt,
    },
  });
}

export async function findPublicCatalogBySlug(slug: string) {
  return prisma.catalog.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      slug: true,
      status: true,
      isTrial: true,
      planType: true,
      onlinePaymentEnabled: true,
      mpAccessToken: true,
      storeName: true,
      logoUrl: true,
      themeColor: true,
      whatsapp: true,
      pixKey: true,
      depositPct: true,
      minOrderCents: true,
      paymentNotice: true,
      deliveryDates: true,
      notes: true,
      bioLinksConfig: true,
      expiresAt: true,
      products: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          priceCents: true,
          imageUrl: true,
          orderIndex: true,
          available: true,
        },
      },
    },
  });
}

export async function markOwnedCatalogExpired(catalogId: string, userId: string) {
  return prisma.catalog.update({
    where: { id: catalogId, userId },
    data: { status: 'EXPIRED' },
  });
}

export async function findOwnedCatalogIdByEditToken(
  editToken: string,
  userId: string
) {
  return prisma.catalog.findFirst({
    where: { editToken, userId },
    select: { id: true },
  });
}

export async function findOwnedCatalogDetail(
  lookup: { id: string; userId: string } | { editToken: string; userId: string }
) {
  const where =
    'id' in lookup
      ? { id: lookup.id, userId: lookup.userId }
      : { editToken: lookup.editToken, userId: lookup.userId };

  return prisma.catalog.findFirst({
    where,
    select: OWNED_CATALOG_DETAIL_SELECT,
  });
}

export async function findOwnedCatalogWithProducts(
  lookup: { id: string; userId: string } | { editToken: string; userId: string }
) {
  const where =
    'id' in lookup
      ? { id: lookup.id, userId: lookup.userId }
      : { editToken: lookup.editToken, userId: lookup.userId };

  return prisma.catalog.findFirst({
    where,
    include: { products: true },
  });
}

export async function updateOwnedCatalogAndProductsTx(params: {
  catalogId: string;
  userId: string;
  catalogData: UpdateCatalogFieldsPersistenceInput;
  toDeleteProductIds: string[];
  preparedProducts?: PreparedProductPersistenceItem[];
}) {
  return prisma.$transaction(async (tx) => {
    const { bioLinksConfig, ...scalarFields } = params.catalogData;

    await tx.catalog.update({
      where: {
        id: params.catalogId,
        userId: params.userId,
      },
      data: {
        ...scalarFields,
        ...(bioLinksConfig !== undefined ? { bioLinksConfig } : {}),
      },
    });

    if (params.preparedProducts) {
      if (params.toDeleteProductIds.length > 0) {
        await tx.product.deleteMany({
          where: {
            id: { in: params.toDeleteProductIds },
            catalogId: params.catalogId,
          },
        });
      }

      for (const item of params.preparedProducts) {
        if (item.existingId) {
          await tx.product.updateMany({
            where: {
              id: item.existingId,
              catalogId: params.catalogId,
            },
            data: item.payload,
          });
        } else {
          await tx.product.create({
            data: {
              ...item.payload,
              catalogId: params.catalogId,
            },
          });
        }
      }
    }

    return tx.catalog.findFirst({
      where: {
        id: params.catalogId,
        userId: params.userId,
      },
      select: UPDATED_CATALOG_SELECT,
    });
  });
}
