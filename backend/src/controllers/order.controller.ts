import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from '../utils/validation.js';
import {
  changeMerchantOrderStatus,
  createStoreOrder,
  getMerchantCatalogAnalytics,
  listMerchantCatalogOrders,
  listMyOrders,
  trackPublicOrder,
} from '../services/order.service.js';

const uuidParamSchema = z.string().uuid('Código inválido.');

export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slug = String(req.params.slug || '');
    const parsed = createOrderSchema.parse(req.body);
    const result = await createStoreOrder({
      slug,
      authUserId: req.user!.id,
      payload: parsed,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMyOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listMyOrders(req.user!.id);
    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function trackOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const trackingCode = String(req.params.trackingCode || '');
    const result = await trackPublicOrder(trackingCode);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCatalogOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const statusFilter = req.query.status
      ? String(req.query.status)
      : undefined;
    const periodFilter = req.query.period ? String(req.query.period) : 'all';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

    const result = await listMerchantCatalogOrders({
      catalogId,
      userId: req.user!.id,
      statusFilter,
      periodFilter,
      page,
      limit,
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const orderId = uuidParamSchema.parse(req.params.orderId);
    const { status } = updateOrderStatusSchema.parse(req.body);

    const result = await changeMerchantOrderStatus({
      catalogId,
      orderId,
      userId: req.user!.id,
      status,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCatalogAnalyticsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const periodFilter = req.query.period ? String(req.query.period) : '30d';

    const result = await getMerchantCatalogAnalytics({
      catalogId,
      userId: req.user!.id,
      periodFilter,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
