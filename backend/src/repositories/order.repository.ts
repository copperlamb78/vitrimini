import crypto from 'node:crypto';
import {
  DeliveryType,
  OrderPaymentChannel,
  OrderPaymentMethod,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CreateOrderTransactionInput {
  catalogId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  deliveryAddress: string | null;
  deliveryDate: string | null;
  paymentMethod: OrderPaymentMethod;
  paymentChannel: OrderPaymentChannel;
  notes: string | null;
  totalCents: number;
  items: CreateOrderItemInput[];
}

const merchantOrderSelect = {
  id: true,
  orderNumber: true,
  trackingCode: true,
  catalogId: true,
  userId: true,
  customerName: true,
  customerPhone: true,
  deliveryType: true,
  deliveryAddress: true,
  deliveryDate: true,
  paymentMethod: true,
  paymentChannel: true,
  paymentStatus: true,
  mpPaymentId: true,
  notes: true,
  status: true,
  totalCents: true,
  mpFeeCents: true,
  netAmountCents: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      orderId: true,
      productId: true,
      productName: true,
      unitPriceCents: true,
      quantity: true,
    },
  },
} satisfies Prisma.OrderSelect;

export async function queryOwnedCatalog(catalogId: string, userId: string) {
  return prisma.catalog.findFirst({
    where: { id: catalogId, userId },
    select: { id: true, storeName: true },
  });
}

export async function findStoreAndUserForOrderCreation(
  slug: string,
  userId: string
) {
  const [catalog, validUser] = await Promise.all([
    prisma.catalog.findUnique({
      where: { slug },
      select: {
        id: true,
        storeName: true,
        status: true,
        planType: true,
        isTrial: true,
        expiresAt: true,
        minOrderCents: true,
        onlinePaymentEnabled: true,
        mpAccessToken: true,
        mpRefreshToken: true,
        mpTokenExpiresAt: true,
        notifyOrderByEmail: true,
        user: {
          select: { name: true, email: true },
        },
        products: {
          select: {
            id: true,
            name: true,
            priceCents: true,
            available: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
  ]);

  return { catalog, validUser };
}

export async function createOrderWithSequentialNumber(
  input: CreateOrderTransactionInput
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const lastOrder = await tx.order.findFirst({
          where: { catalogId: input.catalogId },
          orderBy: { orderNumber: 'desc' },
          select: { orderNumber: true },
        });

        const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;
        const trackingCode = crypto
          .randomBytes(5)
          .toString('hex')
          .toUpperCase();

        return tx.order.create({
          data: {
            orderNumber: nextOrderNumber,
            trackingCode,
            catalogId: input.catalogId,
            userId: input.userId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            deliveryType: input.deliveryType,
            deliveryAddress: input.deliveryAddress,
            deliveryDate: input.deliveryDate,
            paymentMethod: input.paymentMethod,
            paymentChannel: input.paymentChannel,
            paymentStatus: 'PENDING',
            notes: input.notes,
            status: 'PENDING',
            totalCents: input.totalCents,
            items: {
              create: input.items,
            },
          },
          select: {
            id: true,
            orderNumber: true,
            trackingCode: true,
            totalCents: true,
            customerName: true,
            deliveryType: true,
            status: true,
            paymentChannel: true,
            paymentStatus: true,
          },
        });
      });
    } catch (txErr) {
      const isUniqueConflict =
        typeof txErr === 'object' &&
        txErr !== null &&
        'code' in txErr &&
        (txErr as { code?: unknown }).code === 'P2002';
      if (isUniqueConflict && attempt < 2) {
        continue;
      }
      throw txErr;
    }
  }

  return null;
}

export async function setOrderMpPaymentId(
  orderId: string,
  catalogId: string,
  mpPaymentId: string
) {
  return prisma.order.update({
    where: { id: orderId, catalogId },
    data: { mpPaymentId },
    select: { id: true },
  });
}

export async function deleteOrderRollback(orderId: string, catalogId: string) {
  return prisma.order.delete({
    where: { id: orderId, catalogId },
    select: { id: true },
  });
}

export async function findOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      trackingCode: true,
      status: true,
      deliveryType: true,
      deliveryDate: true,
      paymentMethod: true,
      paymentChannel: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      catalog: {
        select: {
          storeName: true,
          slug: true,
          logoUrl: true,
          themeColor: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          unitPriceCents: true,
          quantity: true,
        },
      },
    },
  });
}

export async function findPublicOrderByTrackingCode(trackingCode: string) {
  return prisma.order.findUnique({
    where: { trackingCode },
    select: {
      orderNumber: true,
      trackingCode: true,
      status: true,
      deliveryType: true,
      deliveryDate: true,
      paymentMethod: true,
      paymentChannel: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      updatedAt: true,
      catalog: {
        select: {
          storeName: true,
          slug: true,
          themeColor: true,
          logoUrl: true,
          whatsapp: true,
          pickupAddress: true,
          pickupInstructions: true,
          deliveryEstimate: true,
          pixKey: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          unitPriceCents: true,
          quantity: true,
        },
      },
    },
  });
}

export async function findMerchantCatalogOrders(params: {
  catalogId: string;
  userId: string;
  isAwaitingOnlinePaymentFilter: boolean;
  statusFilter?: OrderStatus;
  includeCancelledInOr: boolean;
  periodStart?: Date;
  skip: number;
  take: number;
}) {
  const {
    catalogId,
    userId,
    isAwaitingOnlinePaymentFilter,
    statusFilter,
    includeCancelledInOr,
    periodStart,
    skip,
    take,
  } = params;

  return prisma.order.findMany({
    where: {
      catalogId,
      catalog: { userId },
      ...(isAwaitingOnlinePaymentFilter
        ? {
            paymentChannel: 'MERCADO_PAGO',
            paymentStatus: 'PENDING',
            status: { not: 'CANCELLED' },
          }
        : {
            OR: [
              { paymentChannel: 'WHATSAPP' },
              { paymentChannel: 'MERCADO_PAGO', paymentStatus: 'PAID' },
              ...(includeCancelledInOr ? [{ status: 'CANCELLED' as const }] : []),
            ],
            ...(statusFilter ? { status: statusFilter } : {}),
          }),
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
    },
    select: merchantOrderSelect,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export async function findOwnedOrderForStatusUpdate(params: {
  orderId: string;
  catalogId: string;
  userId: string;
}) {
  return prisma.order.findFirst({
    where: {
      id: params.orderId,
      catalogId: params.catalogId,
      catalog: { userId: params.userId },
    },
    select: {
      id: true,
      status: true,
      deliveryType: true,
      paymentChannel: true,
      paymentStatus: true,
    },
  });
}

export async function updateCatalogOrderStatus(params: {
  orderId: string;
  catalogId: string;
  status: OrderStatus;
}) {
  return prisma.order.update({
    where: { id: params.orderId, catalogId: params.catalogId },
    data: { status: params.status },
    select: merchantOrderSelect,
  });
}

export async function findOrdersForCatalogAnalytics(params: {
  catalogId: string;
  userId: string;
  periodStart?: Date;
}) {
  return prisma.order.findMany({
    where: {
      catalogId: params.catalogId,
      catalog: { userId: params.userId },
      ...(params.periodStart ? { createdAt: { gte: params.periodStart } } : {}),
    },
    select: {
      status: true,
      totalCents: true,
      paymentChannel: true,
      paymentStatus: true,
      mpFeeCents: true,
      netAmountCents: true,
      customerPhone: true,
      customerName: true,
      createdAt: true,
      items: {
        select: {
          productId: true,
          productName: true,
          unitPriceCents: true,
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
