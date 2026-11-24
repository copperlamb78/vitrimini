import { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import { createOrderSchema } from '../utils/validation.js';
import {
  getFrontendBaseUrl,
  sendNewOrderEmail,
} from './email.service.js';
import {
  createMerchantOnlinePayment,
  hasProFeatures,
} from './mpOAuth.service.js';
import {
  CreateOrderItemInput,
  createOrderWithSequentialNumber,
  deleteOrderRollback,
  findMerchantCatalogOrders,
  findOrdersByUserId,
  findOrdersForCatalogAnalytics,
  findOwnedOrderForStatusUpdate,
  findPublicOrderByTrackingCode,
  findStoreAndUserForOrderCreation,
  queryOwnedCatalog,
  setOrderMpPaymentId,
  updateCatalogOrderStatus,
} from '../repositories/order.repository.js';

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

const ALLOWED_ORDER_STATUSES = new Set<OrderStatus>([
  'PENDING',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
]);

export function getPeriodStartDate(period?: string): Date | undefined {
  const now = new Date();
  if (period === 'today') {
    const brDateStr = now.toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
    });
    return new Date(`${brDateStr}T00:00:00-03:00`);
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return undefined;
}

export async function findOwnedCatalog(catalogId: string, userId: string) {
  const catalog = await queryOwnedCatalog(catalogId, userId);

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  return catalog;
}

export async function createStoreOrder(params: {
  slug: string;
  authUserId: string;
  payload: CreateOrderPayload;
}) {
  const slug = params.slug.trim().toLowerCase();
  if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const { payload: parsed, authUserId } = params;

  const { catalog, validUser } = await findStoreAndUserForOrderCreation(
    slug,
    authUserId
  );

  if (!validUser) {
    throw new AppError(401, 'Conta não encontrada. Entre novamente.');
  }
  const verifiedUserId = validUser.id;

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  if (
    catalog.status !== 'ACTIVE' ||
    (catalog.expiresAt && catalog.expiresAt < new Date())
  ) {
    throw new AppError(
      403,
      'Esta vitrine não está recebendo novos pedidos no momento.'
    );
  }

  const qtyByProductId = new Map<string, number>();
  for (const item of parsed.items) {
    qtyByProductId.set(
      item.productId,
      (qtyByProductId.get(item.productId) || 0) + item.quantity
    );
  }

  const productMap = new Map(catalog.products.map((p) => [p.id, p]));
  const orderItemsData: CreateOrderItemInput[] = [];
  let totalCents = 0;

  for (const [productId, quantity] of qtyByProductId.entries()) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new AppError(
        400,
        'A quantidade máxima por produto em um pedido é de 100 unidades.'
      );
    }

    const product = productMap.get(productId);
    if (!product) {
      throw new AppError(
        400,
        'Um dos produtos selecionados não pertence a esta vitrine.'
      );
    }
    if (!product.available) {
      throw new AppError(
        400,
        `O item "${product.name}" acabou de ficar esgotado. Atualize seu carrinho.`
      );
    }

    totalCents += product.priceCents * quantity;
    if (!Number.isSafeInteger(totalCents) || totalCents > 100_000_000) {
      throw new AppError(
        400,
        'O valor total do pedido excede o limite permitido.'
      );
    }

    orderItemsData.push({
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity,
    });
  }

  if (catalog.minOrderCents > 0 && totalCents < catalog.minOrderCents) {
    const formattedMin = (catalog.minOrderCents / 100)
      .toFixed(2)
      .replace('.', ',');
    throw new AppError(
      400,
      `O valor mínimo para pedidos nesta loja é de R$ ${formattedMin}.`
    );
  }

  const isOnlinePayment = parsed.paymentChannel === 'MERCADO_PAGO';
  if (isOnlinePayment) {
    if (totalCents < 100) {
      throw new AppError(
        400,
        'O pagamento online exige um valor mínimo de R$ 1,00.'
      );
    }
    if (
      !hasProFeatures(catalog) ||
      !catalog.onlinePaymentEnabled ||
      !catalog.mpAccessToken
    ) {
      throw new AppError(
        400,
        'O pagamento online automático não está disponível nesta vitrine.'
      );
    }
    if (parsed.paymentMethod !== 'PIX' && parsed.paymentMethod !== 'CARD') {
      throw new AppError(400, 'Escolha Pix ou Cartão para pagar online.');
    }
  }

  const createdOrder = await createOrderWithSequentialNumber({
    catalogId: catalog.id,
    userId: verifiedUserId,
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    deliveryType: parsed.deliveryType,
    deliveryAddress:
      parsed.deliveryType === 'DELIVERY' ? parsed.deliveryAddress : null,
    deliveryDate: parsed.deliveryDate ?? null,
    paymentMethod: parsed.paymentMethod,
    paymentChannel: parsed.paymentChannel,
    notes: parsed.notes ?? null,
    totalCents,
    items: orderItemsData,
  });

  if (!createdOrder) {
    throw new AppError(
      500,
      'Não foi possível registrar seu pedido agora. Tente novamente.'
    );
  }

  let onlinePaymentResult: {
    mpPaymentId: string;
    qrCodeBase64?: string;
    pixCopyPaste?: string;
    checkoutUrl?: string;
  } | null = null;

  if (isOnlinePayment) {
    try {
      onlinePaymentResult = await createMerchantOnlinePayment({
        catalog,
        order: {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          trackingCode: createdOrder.trackingCode,
          totalCents: createdOrder.totalCents,
          customerName: createdOrder.customerName,
        },
        paymentMethod: parsed.paymentMethod === 'CARD' ? 'CARD' : 'PIX',
      });

      await setOrderMpPaymentId(
        createdOrder.id,
        catalog.id,
        onlinePaymentResult.mpPaymentId
      );
    } catch (mpErr) {
      console.error('[Order Online Payment Error]:', mpErr);
      await deleteOrderRollback(createdOrder.id, catalog.id).catch(() => {});
      throw new AppError(
        502,
        'Não foi possível iniciar o pagamento online agora. Tente novamente.'
      );
    }
  }

  if (!isOnlinePayment && catalog.notifyOrderByEmail && catalog.user?.email) {
    void sendNewOrderEmail({
      to: catalog.user.email,
      merchantName: catalog.user.name,
      storeName: catalog.storeName,
      catalogId: catalog.id,
      orderNumber: createdOrder.orderNumber,
      customerName: createdOrder.customerName,
      totalCents: createdOrder.totalCents,
      deliveryType: createdOrder.deliveryType,
      items: orderItemsData,
    }).catch((mailErr) => {
      console.error('[New Order Email Error]:', mailErr);
    });
  }

  const trackingUrl = `${getFrontendBaseUrl()}/pedido/${createdOrder.trackingCode}`;

  return {
    orderNumber: createdOrder.orderNumber,
    trackingCode: createdOrder.trackingCode,
    totalCents: createdOrder.totalCents,
    status: createdOrder.status,
    paymentChannel: createdOrder.paymentChannel,
    paymentStatus: createdOrder.paymentStatus,
    trackingUrl,
    ...(onlinePaymentResult
      ? {
          mpQrCodeBase64: onlinePaymentResult.qrCodeBase64,
          mpPixCopyPaste: onlinePaymentResult.pixCopyPaste,
          mpCheckoutUrl: onlinePaymentResult.checkoutUrl,
        }
      : {}),
  };
}

export async function listMyOrders(userId: string) {
  const orders = await findOrdersByUserId(userId);
  return { orders };
}

export async function trackPublicOrder(rawTrackingCode: string) {
  const trackingCode = rawTrackingCode.trim().toUpperCase();

  if (!trackingCode || !/^[A-Z0-9]{6,24}$/.test(trackingCode)) {
    throw new AppError(404, 'Pedido não encontrado.');
  }

  const order = await findPublicOrderByTrackingCode(trackingCode);

  if (!order) {
    throw new AppError(404, 'Pedido não encontrado.');
  }

  const showPixKey =
    order.paymentMethod === 'PIX' && order.status === 'PENDING';

  return {
    orderNumber: order.orderNumber,
    trackingCode: order.trackingCode,
    status: order.status,
    deliveryType: order.deliveryType,
    deliveryDate: order.deliveryDate,
    paymentMethod: order.paymentMethod,
    paymentChannel: order.paymentChannel,
    paymentStatus: order.paymentStatus,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    store: {
      storeName: order.catalog.storeName,
      slug: order.catalog.slug,
      themeColor: order.catalog.themeColor,
      logoUrl: order.catalog.logoUrl,
      whatsapp: order.catalog.whatsapp,
      pickupAddress: order.catalog.pickupAddress,
      pickupInstructions: order.catalog.pickupInstructions,
      deliveryEstimate: order.catalog.deliveryEstimate,
      pixKey: showPixKey ? order.catalog.pixKey : null,
    },
    items: order.items,
  };
}

export async function listMerchantCatalogOrders(params: {
  catalogId: string;
  userId: string;
  statusFilter?: string;
  periodFilter?: string;
  page: number;
  limit: number;
}) {
  await findOwnedCatalog(params.catalogId, params.userId);

  const periodStart = getPeriodStartDate(params.periodFilter || 'all');
  const isAwaitingOnlinePaymentFilter =
    params.statusFilter === 'AWAITING_PAYMENT';

  const validatedStatus =
    params.statusFilter &&
    ALLOWED_ORDER_STATUSES.has(params.statusFilter as OrderStatus)
      ? (params.statusFilter as OrderStatus)
      : undefined;

  const orders = await findMerchantCatalogOrders({
    catalogId: params.catalogId,
    userId: params.userId,
    isAwaitingOnlinePaymentFilter,
    statusFilter: validatedStatus,
    includeCancelledInOr: params.statusFilter === 'CANCELLED',
    periodStart,
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  });

  return {
    orders,
    page: params.page,
    limit: params.limit,
  };
}

export async function changeMerchantOrderStatus(params: {
  catalogId: string;
  orderId: string;
  userId: string;
  status: OrderStatus;
}) {
  await findOwnedCatalog(params.catalogId, params.userId);

  const existing = await findOwnedOrderForStatusUpdate({
    orderId: params.orderId,
    catalogId: params.catalogId,
    userId: params.userId,
  });

  if (!existing) {
    throw new AppError(404, 'Pedido não encontrado nesta vitrine.');
  }

  if (existing.status === 'CANCELLED' && params.status !== 'CANCELLED') {
    throw new AppError(400, 'Pedidos cancelados não podem ser reabertos.');
  }

  if (
    existing.paymentChannel === 'MERCADO_PAGO' &&
    existing.paymentStatus !== 'PAID' &&
    params.status !== 'CANCELLED'
  ) {
    throw new AppError(
      400,
      'Este pedido aguarda confirmação do pagamento online antes de avançar.'
    );
  }

  if (
    existing.deliveryType === 'PICKUP' &&
    params.status === 'OUT_FOR_DELIVERY'
  ) {
    throw new AppError(
      400,
      'Pedidos de retirada vão direto para "Pronto p/ retirada" (COMPLETED).'
    );
  }

  const updated = await updateCatalogOrderStatus({
    orderId: existing.id,
    catalogId: params.catalogId,
    status: params.status,
  });

  return { order: updated };
}

export async function getMerchantCatalogAnalytics(params: {
  catalogId: string;
  userId: string;
  periodFilter?: string;
}) {
  await findOwnedCatalog(params.catalogId, params.userId);

  const period = params.periodFilter || '30d';
  const periodStart = getPeriodStartDate(period);

  const orders = await findOrdersForCatalogAnalytics({
    catalogId: params.catalogId,
    userId: params.userId,
    periodStart,
  });

  let confirmedRevenueCents = 0;
  let pendingRevenueCents = 0;
  let completedOrdersCount = 0;
  let pendingOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let onlineGrossRevenueCents = 0;
  let onlineMpFeesCents = 0;
  let onlineNetRevenueCents = 0;

  const productStats = new Map<
    string,
    { productName: string; quantitySold: number; revenueCents: number }
  >();

  const customerStats = new Map<
    string,
    {
      customerPhone: string;
      customerName: string;
      ordersCount: number;
      totalSpentCents: number;
      lastOrderAt: Date;
    }
  >();

  for (const order of orders) {
    if (
      order.paymentChannel === 'MERCADO_PAGO' &&
      order.paymentStatus !== 'PAID'
    ) {
      continue;
    }
    if (order.status === 'COMPLETED') {
      confirmedRevenueCents += order.totalCents;
      completedOrdersCount += 1;
      if (
        order.paymentChannel === 'MERCADO_PAGO' &&
        order.paymentStatus === 'PAID'
      ) {
        const fee = order.mpFeeCents ?? 0;
        const net =
          order.netAmountCents ?? Math.max(0, order.totalCents - fee);
        onlineGrossRevenueCents += order.totalCents;
        onlineMpFeesCents += fee;
        onlineNetRevenueCents += net;
      }
    } else if (order.status === 'CANCELLED') {
      cancelledOrdersCount += 1;
    } else {
      pendingRevenueCents += order.totalCents;
      pendingOrdersCount += 1;
    }

    if (order.status !== 'CANCELLED') {
      for (const item of order.items) {
        const key = item.productId || item.productName.toLowerCase();
        const existingProd = productStats.get(key);
        const itemRevenue = item.unitPriceCents * item.quantity;
        if (existingProd) {
          existingProd.quantitySold += item.quantity;
          existingProd.revenueCents += itemRevenue;
        } else {
          productStats.set(key, {
            productName: item.productName,
            quantitySold: item.quantity,
            revenueCents: itemRevenue,
          });
        }
      }

      const existingCust = customerStats.get(order.customerPhone);
      if (existingCust) {
        existingCust.ordersCount += 1;
        existingCust.totalSpentCents += order.totalCents;
        if (order.createdAt > existingCust.lastOrderAt) {
          existingCust.lastOrderAt = order.createdAt;
          existingCust.customerName = order.customerName;
        }
      } else {
        customerStats.set(order.customerPhone, {
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          ordersCount: 1,
          totalSpentCents: order.totalCents,
          lastOrderAt: order.createdAt,
        });
      }
    }
  }

  const averageTicketCents =
    completedOrdersCount > 0
      ? Math.round(confirmedRevenueCents / completedOrdersCount)
      : 0;

  const topProducts = Array.from(productStats.values())
    .sort(
      (a, b) =>
        b.quantitySold - a.quantitySold || b.revenueCents - a.revenueCents
    )
    .slice(0, 15);

  const topCustomers = Array.from(customerStats.values())
    .sort(
      (a, b) =>
        b.totalSpentCents - a.totalSpentCents || b.ordersCount - a.ordersCount
    )
    .slice(0, 30);

  return {
    period,
    confirmedRevenueCents,
    pendingRevenueCents,
    onlineGrossRevenueCents,
    onlineMpFeesCents,
    onlineNetRevenueCents,
    completedOrdersCount,
    pendingOrdersCount,
    cancelledOrdersCount,
    averageTicketCents,
    topProducts,
    topCustomers,
  };
}
