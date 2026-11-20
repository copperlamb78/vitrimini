import crypto from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from '../utils/validation.js';
import {
  getFrontendBaseUrl,
  sendNewOrderEmail,
} from '../services/email.service.js';
import {
  createMerchantOnlinePayment,
  hasProFeatures,
} from '../services/mpOAuth.service.js';

const router = Router();

const uuidParamSchema = z.string().uuid('Código inválido.');

const orderCreationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitos pedidos enviados em sequência. Aguarde alguns minutos e tente novamente.',
  },
});

const trackingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas consultas de rastreio em sequência. Aguarde alguns minutos e tente novamente.',
  },
});

const myOrdersRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas consultas ao histórico de pedidos. Aguarde alguns minutos e tente novamente.',
  },
});

function getPeriodStartDate(period?: string): Date | undefined {
  const now = new Date();
  if (period === 'today') {
    // Início do dia no fuso America/Sao_Paulo (UTC-3)
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

async function assertCatalogOwnership(catalogId: string, userId: string) {
  const catalog = await prisma.catalog.findUnique({
    where: { id: catalogId },
    select: { id: true, userId: true, storeName: true },
  });

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  if (catalog.userId !== userId) {
    throw new AppError(403, 'Você não tem permissão para acessar esta vitrine.');
  }

  return catalog;
}

// 1. POST /api/store/:slug/orders — Criação de pedido (exige conta cadastrada)
router.post(
  '/store/:slug/orders',
  orderCreationRateLimiter,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = String(req.params.slug || '').trim().toLowerCase();
      if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      const parsed = createOrderSchema.parse(req.body);
      const authUserId = req.user!.id;

      const [catalog, validUser] = await Promise.all([
        prisma.catalog.findUnique({
          where: { slug },
          include: {
            user: {
              select: { name: true, email: true },
            },
            products: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: authUserId },
          select: { id: true },
        }),
      ]);

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

      // Agrupa quantidades caso o cliente envie o mesmo productId duplicado
      const qtyByProductId = new Map<string, number>();
      for (const item of parsed.items) {
        qtyByProductId.set(
          item.productId,
          (qtyByProductId.get(item.productId) || 0) + item.quantity
        );
      }

      const productMap = new Map(catalog.products.map((p) => [p.id, p]));
      const orderItemsData: Array<{
        productId: string;
        productName: string;
        unitPriceCents: number;
        quantity: number;
      }> = [];

      let totalCents = 0;

      for (const [productId, quantity] of qtyByProductId.entries()) {
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
        orderItemsData.push({
          productId: product.id,
          productName: product.name,
          unitPriceCents: product.priceCents,
          quantity,
        });
      }

      const isOnlinePayment = parsed.paymentChannel === 'MERCADO_PAGO';
      if (isOnlinePayment) {
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
          throw new AppError(
            400,
            'Escolha Pix ou Cartão para pagar online.'
          );
        }
      }

      let createdOrder;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          createdOrder = await prisma.$transaction(async (tx) => {
            const lastOrder = await tx.order.findFirst({
              where: { catalogId: catalog.id },
              orderBy: { orderNumber: 'desc' },
              select: { orderNumber: true },
            });

            const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;
            const trackingCode = crypto.randomBytes(5).toString('hex').toUpperCase();

            return tx.order.create({
              data: {
                orderNumber: nextOrderNumber,
                trackingCode,
                catalogId: catalog.id,
                userId: verifiedUserId,
                customerName: parsed.customerName,
                customerPhone: parsed.customerPhone,
                deliveryType: parsed.deliveryType,
                deliveryAddress:
                  parsed.deliveryType === 'DELIVERY' ? parsed.deliveryAddress : null,
                deliveryDate: parsed.deliveryDate,
                paymentMethod: parsed.paymentMethod,
                paymentChannel: parsed.paymentChannel,
                paymentStatus: 'PENDING',
                notes: parsed.notes,
                status: 'PENDING',
                totalCents,
                items: {
                  create: orderItemsData,
                },
              },
              include: { items: true },
            });
          });
          break;
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

          await prisma.order.update({
            where: { id: createdOrder.id },
            data: { mpPaymentId: onlinePaymentResult.mpPaymentId },
          });
        } catch (mpErr) {
          await prisma.order.delete({ where: { id: createdOrder.id } }).catch(() => {});
          throw new AppError(
            502,
            mpErr instanceof Error
              ? mpErr.message
              : 'Não foi possível iniciar o pagamento online agora. Tente novamente.'
          );
        }
      }

      // E-mail assíncrono protegido: para pagamento online, só dispara após confirmação no webhook
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

      res.status(201).json({
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
      });
    } catch (error) {
      next(error);
    }
  }
);

// 2. GET /api/orders/mine — Histórico de pedidos do usuário autenticado
router.get(
  '/orders/mine',
  myOrdersRateLimiter,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await prisma.order.findMany({
        where: { userId: req.user!.id },
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

      res.setHeader('Cache-Control', 'no-store');
      res.json({ orders });
    } catch (error) {
      next(error);
    }
  }
);

// 3. GET /api/orders/track/:trackingCode — Acompanhamento público (LGPD-safe)
router.get(
  '/orders/track/:trackingCode',
  trackingRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trackingCode = String(req.params.trackingCode || '')
        .trim()
        .toUpperCase();

      if (!trackingCode || !/^[A-Z0-9]{6,24}$/.test(trackingCode)) {
        throw new AppError(404, 'Pedido não encontrado.');
      }

      const order = await prisma.order.findUnique({
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

      if (!order) {
        throw new AppError(404, 'Pedido não encontrado.');
      }

      const showPixKey =
        order.paymentMethod === 'PIX' && order.status === 'PENDING';

      res.json({
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
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. GET /api/catalogs/:id/orders — Listagem de pedidos do lojista
router.get(
  '/catalogs/:id/orders',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalogId = uuidParamSchema.parse(req.params.id);
      await assertCatalogOwnership(catalogId, req.user!.id);

      const statusFilter = req.query.status ? String(req.query.status) : undefined;
      const periodFilter = req.query.period ? String(req.query.period) : 'all';
      const periodStart = getPeriodStartDate(periodFilter);
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

      const allowedStatuses = new Set([
        'PENDING',
        'PREPARING',
        'OUT_FOR_DELIVERY',
        'COMPLETED',
        'CANCELLED',
      ]);

      const isAwaitingOnlinePaymentFilter = statusFilter === 'AWAITING_PAYMENT';

      const orders = await prisma.order.findMany({
        where: {
          catalogId,
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
                  ...(statusFilter === 'CANCELLED'
                    ? [{ status: 'CANCELLED' as const }]
                    : []),
                ],
                ...(statusFilter && allowedStatuses.has(statusFilter)
                  ? {
                      status: statusFilter as
                        | 'PENDING'
                        | 'PREPARING'
                        | 'OUT_FOR_DELIVERY'
                        | 'COMPLETED'
                        | 'CANCELLED',
                    }
                  : {}),
              }),
          ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
        },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({ orders, page, limit });
    } catch (error) {
      next(error);
    }
  }
);

// 4. PATCH /api/catalogs/:id/orders/:orderId/status — Atualiza status do pedido
router.patch(
  '/catalogs/:id/orders/:orderId/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalogId = uuidParamSchema.parse(req.params.id);
      const orderId = uuidParamSchema.parse(req.params.orderId);
      await assertCatalogOwnership(catalogId, req.user!.id);

      const { status } = updateOrderStatusSchema.parse(req.body);

      const existing = await prisma.order.findFirst({
        where: { id: orderId, catalogId },
        select: { id: true, deliveryType: true },
      });

      if (!existing) {
        throw new AppError(404, 'Pedido não encontrado nesta vitrine.');
      }

      if (existing.deliveryType === 'PICKUP' && status === 'OUT_FOR_DELIVERY') {
        throw new AppError(
          400,
          'Pedidos de retirada vão direto para "Pronto p/ retirada" (COMPLETED).'
        );
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });

      res.json({ order: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 5. GET /api/catalogs/:id/analytics — Financeiro, Produtos Mais Vendidos e Clientes
router.get(
  '/catalogs/:id/analytics',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalogId = uuidParamSchema.parse(req.params.id);
      const periodFilter = req.query.period ? String(req.query.period) : '30d';
      const periodStart = getPeriodStartDate(periodFilter);

      const [catalog, orders] = await Promise.all([
        prisma.catalog.findUnique({
          where: { id: catalogId },
          select: { id: true, userId: true },
        }),
        prisma.order.findMany({
          where: {
            catalogId,
            ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
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
        }),
      ]);

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }
      if (catalog.userId !== req.user!.id) {
        throw new AppError(403, 'Você não tem permissão para acessar esta vitrine.');
      }

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
        .sort((a, b) => b.quantitySold - a.quantitySold || b.revenueCents - a.revenueCents)
        .slice(0, 15);

      const topCustomers = Array.from(customerStats.values())
        .sort(
          (a, b) =>
            b.totalSpentCents - a.totalSpentCents ||
            b.ordersCount - a.ordersCount
        )
        .slice(0, 30);

      res.json({
        period: periodFilter,
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
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
