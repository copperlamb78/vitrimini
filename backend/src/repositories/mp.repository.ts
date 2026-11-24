import { prisma } from '../lib/prisma.js';

export async function findOwnedCatalogForMpConnect(
  catalogId: string,
  userId: string
) {
  return prisma.catalog.findFirst({
    where: { id: catalogId, userId },
    select: {
      id: true,
      userId: true,
      status: true,
      planType: true,
      isTrial: true,
      expiresAt: true,
    },
  });
}

export async function findOwnedCatalogForMpCallback(
  catalogId: string,
  userId: string
) {
  return prisma.catalog.findFirst({
    where: { id: catalogId, userId },
    select: {
      id: true,
      userId: true,
    },
  });
}

export async function saveCatalogMpCredentials(params: {
  catalogId: string;
  userId: string;
  mpUserId: string;
  mpAccessToken: string;
  mpRefreshToken: string | null;
  mpTokenExpiresAt: Date | null;
}) {
  return prisma.catalog.update({
    where: { id: params.catalogId, userId: params.userId },
    data: {
      mpUserId: params.mpUserId,
      mpAccessToken: params.mpAccessToken,
      mpRefreshToken: params.mpRefreshToken,
      mpTokenExpiresAt: params.mpTokenExpiresAt,
      onlinePaymentEnabled: true,
    },
    select: { id: true },
  });
}

export async function findOwnedCatalogForMpToggle(
  catalogId: string,
  userId: string
) {
  return prisma.catalog.findFirst({
    where: { id: catalogId, userId },
    select: {
      id: true,
      userId: true,
      status: true,
      planType: true,
      isTrial: true,
      expiresAt: true,
      mpAccessToken: true,
    },
  });
}

export async function updateCatalogOnlinePaymentEnabled(params: {
  catalogId: string;
  userId: string;
  enabled: boolean;
}) {
  return prisma.catalog.update({
    where: { id: params.catalogId, userId: params.userId },
    data: { onlinePaymentEnabled: params.enabled },
    select: { onlinePaymentEnabled: true },
  });
}

export async function findOwnedCatalogForMpDisconnect(
  catalogId: string,
  userId: string
) {
  return prisma.catalog.findFirst({
    where: { id: catalogId, userId },
    select: {
      id: true,
      userId: true,
    },
  });
}

export async function clearCatalogMpCredentials(
  catalogId: string,
  userId: string
) {
  return prisma.catalog.update({
    where: { id: catalogId, userId },
    data: {
      mpUserId: null,
      mpAccessToken: null,
      mpRefreshToken: null,
      mpTokenExpiresAt: null,
      onlinePaymentEnabled: false,
    },
    select: { id: true },
  });
}

const webhookCatalogMpSelect = {
  id: true,
  mpUserId: true,
  mpAccessToken: true,
  mpRefreshToken: true,
  mpTokenExpiresAt: true,
} as const;

export async function findCatalogMpCredentialsById(catalogId: string) {
  return prisma.catalog.findUnique({
    where: { id: catalogId },
    select: webhookCatalogMpSelect,
  });
}

export async function findCatalogMpCredentialsByPaymentId(mpPaymentId: string) {
  const orderByPayment = await prisma.order.findFirst({
    where: { mpPaymentId },
    select: {
      catalog: {
        select: webhookCatalogMpSelect,
      },
    },
  });

  return orderByPayment?.catalog || null;
}

export async function findOrderForWebhookApproval(
  orderId: string,
  catalogId: string
) {
  return prisma.order.findFirst({
    where: { id: orderId, catalogId },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      totalCents: true,
      deliveryType: true,
      paymentChannel: true,
      items: {
        select: {
          productName: true,
          unitPriceCents: true,
          quantity: true,
        },
      },
      catalog: {
        select: {
          id: true,
          storeName: true,
          notifyOrderByEmail: true,
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });
}

export async function findPaidOrderReplay(
  mpPaymentId: string,
  excludeOrderId: string
) {
  return prisma.order.findFirst({
    where: {
      mpPaymentId,
      paymentStatus: 'PAID',
      id: { not: excludeOrderId },
    },
    select: { id: true },
  });
}

export async function promoteOrderToPaid(params: {
  orderId: string;
  catalogId: string;
  mpPaymentId: string;
  mpFeeCents: number;
  netAmountCents: number;
}) {
  return prisma.order.updateMany({
    where: {
      id: params.orderId,
      catalogId: params.catalogId,
      paymentChannel: 'MERCADO_PAGO',
      paymentStatus: { not: 'PAID' },
    },
    data: {
      paymentStatus: 'PAID',
      status: 'PENDING',
      mpPaymentId: params.mpPaymentId,
      mpFeeCents: params.mpFeeCents,
      netAmountCents: params.netAmountCents,
    },
  });
}

export async function cancelPendingOnlineOrder(params: {
  orderId: string;
  catalogId: string;
  mpPaymentId: string;
}) {
  return prisma.order.updateMany({
    where: {
      id: params.orderId,
      catalogId: params.catalogId,
      paymentChannel: 'MERCADO_PAGO',
      paymentStatus: 'PENDING',
    },
    data: {
      paymentStatus: 'CANCELLED',
      mpPaymentId: params.mpPaymentId,
    },
  });
}
