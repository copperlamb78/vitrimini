import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getOptionalAuthUserId } from '../middlewares/auth.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import {
  cancelCatalogSubscription,
  createCardSubscriptionForCatalog,
  createCatalog,
  getCatalogStatus,
  getMyCatalogs,
  getOwnedCatalogDetail,
  getPublicStoreBySlug,
  mockPayCatalog,
  normalizeThemeColor,
  processPixWebhook,
  renewCatalog,
  resolveCatalogEditToken,
  syncCatalogSubscriptionForOwner,
  updateOwnedCatalog,
  ValidatedCatalogUpdatePayload,
} from '../services/catalog.service.js';
import {
  bioLinksConfigSchema,
  brazilianPhoneSchema,
  catalogMetadataSchema,
  createCardSubscriptionSchema,
  productInputSchema,
  sanitizePlainText,
  storeAppearanceSchema,
} from '../utils/validation.js';

const productsArraySchema = z
  .array(productInputSchema)
  .min(1, 'Adicione pelo menos um produto válido.')
  .max(300, 'Limite máximo de produtos por requisição excedido.');

const uuidParamSchema = z.string().uuid('Código inválido.');

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    if (value.length > 500_000) {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
  }
  return value as T;
}

function buildValidatedCatalogUpdatePayload(
  body: Record<string, unknown>
): ValidatedCatalogUpdatePayload {
  let storeName: string | undefined;
  if (body.storeName !== undefined) {
    const cleanStoreName = sanitizePlainText(String(body.storeName));
    if (cleanStoreName.length < 2 || cleanStoreName.length > 100) {
      throw new AppError(
        400,
        'O nome da loja deve ter entre 2 e 100 caracteres.'
      );
    }
    storeName = cleanStoreName;
  }

  const whatsapp =
    body.whatsapp !== undefined
      ? brazilianPhoneSchema.parse(body.whatsapp)
      : undefined;

  let depositPct: number | undefined;
  if (body.depositPct !== undefined) {
    const parsedDeposit = Number(body.depositPct);
    if (![0, 50, 100].includes(parsedDeposit)) {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
    depositPct = parsedDeposit;
  }

  let minOrderCents: number | undefined;
  if (body.minOrderCents !== undefined && body.minOrderCents !== '') {
    const parsedMinOrder = Number(body.minOrderCents);
    if (
      !Number.isInteger(parsedMinOrder) ||
      parsedMinOrder < 0 ||
      parsedMinOrder > 10000000
    ) {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
    minOrderCents = parsedMinOrder;
  }

  const themeColor =
    body.themeColor !== undefined
      ? normalizeThemeColor(body.themeColor)
      : undefined;

  let deliveryDates: string[] | undefined;
  if (
    body.deliveryDates !== undefined &&
    body.deliveryDates !== null &&
    body.deliveryDates !== ''
  ) {
    const rawDeliveryDates = parseJsonField<unknown>(body.deliveryDates, []);
    if (!Array.isArray(rawDeliveryDates) || rawDeliveryDates.length > 60) {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
    deliveryDates = rawDeliveryDates
      .map((d) => sanitizePlainText(String(d)).slice(0, 120))
      .filter(Boolean);
  }

  const pixKey =
    body.pixKey !== undefined
      ? body.pixKey
        ? sanitizePlainText(String(body.pixKey)).slice(0, 140)
        : null
      : undefined;

  const paymentNotice =
    body.paymentNotice !== undefined
      ? body.paymentNotice
        ? sanitizePlainText(String(body.paymentNotice)).slice(0, 140) || null
        : null
      : undefined;

  const notes =
    body.notes !== undefined
      ? body.notes
        ? sanitizePlainText(String(body.notes)).slice(0, 1000)
        : null
      : undefined;

  const pickupAddress =
    body.pickupAddress !== undefined
      ? body.pickupAddress
        ? sanitizePlainText(String(body.pickupAddress)).slice(0, 240)
        : null
      : undefined;

  const pickupInstructions =
    body.pickupInstructions !== undefined
      ? body.pickupInstructions
        ? sanitizePlainText(String(body.pickupInstructions)).slice(0, 200)
        : null
      : undefined;

  const deliveryEstimate =
    body.deliveryEstimate !== undefined
      ? body.deliveryEstimate
        ? sanitizePlainText(String(body.deliveryEstimate)).slice(0, 100)
        : null
      : undefined;

  const incomingProducts =
    body.products !== undefined
      ? productsArraySchema.parse(parseJsonField<unknown>(body.products, []))
      : undefined;

  let bioLinksConfig: z.infer<typeof bioLinksConfigSchema> | undefined;
  if (body.bioLinksConfig !== undefined) {
    const rawBioLinks = parseJsonField<unknown>(body.bioLinksConfig, null);
    if (rawBioLinks !== null) {
      bioLinksConfig = bioLinksConfigSchema.parse(rawBioLinks);
    }
  }

  let storeAppearance: z.infer<typeof storeAppearanceSchema> | undefined;
  if (body.storeAppearance !== undefined) {
    const rawStoreAppearance = parseJsonField<unknown>(
      body.storeAppearance,
      null
    );
    if (rawStoreAppearance !== null) {
      storeAppearance = storeAppearanceSchema.parse(rawStoreAppearance);
    }
  }

  return {
    storeName,
    whatsapp,
    depositPct,
    minOrderCents,
    themeColor,
    deliveryDates,
    pixKey,
    paymentNotice,
    notes,
    pickupAddress,
    pickupInstructions,
    deliveryEstimate,
    rawNotifyOrderByEmail: body.notifyOrderByEmail,
    incomingProducts,
    bioLinksConfig,
    storeAppearance,
    removeLogo: body.removeLogo === 'true' || body.removeLogo === true,
  };
}

export async function createCatalogHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawDeliveryDates = parseJsonField<unknown>(
      req.body.deliveryDates,
      []
    );
    const rawProducts = parseJsonField<unknown>(req.body.products, []);

    if (!Array.isArray(rawDeliveryDates) || !Array.isArray(rawProducts)) {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }

    const meta = catalogMetadataSchema.parse({
      storeName: req.body.storeName,
      whatsapp: req.body.whatsapp,
      pixKey: req.body.pixKey,
      depositPct: req.body.depositPct,
      minOrderCents: req.body.minOrderCents,
      paymentNotice: req.body.paymentNotice,
      themeColor: normalizeThemeColor(req.body.themeColor),
      notes: req.body.notes,
      deliveryDates: rawDeliveryDates,
    });

    const validatedProducts = productsArraySchema.parse(rawProducts);
    const files = (req.files as Express.Multer.File[]) || [];

    const deferPayment =
      req.body.deferPayment === true || req.body.deferPayment === 'true';

    const result = await createCatalog({
      userId: req.user!.id,
      userEmail: req.user!.email,
      meta,
      validatedProducts,
      planCode: req.body.planCode,
      couponCode:
        typeof req.body.couponCode === 'string'
          ? req.body.couponCode
          : undefined,
      deferPayment,
      files,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function renewCatalogHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const result = await renewCatalog({
      catalogId,
      userId: req.user!.id,
      userEmail: req.user!.email,
      planCode: req.body?.planCode,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createCardSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const body = createCardSubscriptionSchema.parse(req.body);
    const result = await createCardSubscriptionForCatalog(
      catalogId,
      req.user!.id,
      body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelCardSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const result = await cancelCatalogSubscription(catalogId, req.user!.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

const syncCardSubscriptionSchema = z
  .object({
    preapprovalId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_-]{1,100}$/, 'Identificador de assinatura inválido.')
      .optional(),
  })
  .optional();

export async function syncCardSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const parsedBody = syncCardSubscriptionSchema.parse(req.body);
    const result = await syncCatalogSubscriptionForOwner(
      catalogId,
      req.user!.id,
      parsedBody?.preapprovalId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMyCatalogsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getMyCatalogs(req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCatalogStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const paymentRecordId = req.query.paymentRecordId
      ? uuidParamSchema.parse(String(req.query.paymentRecordId))
      : undefined;

    const result = await getCatalogStatus({
      catalogId,
      userId: req.user!.id,
      paymentRecordId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function mockPayCatalogHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const result = await mockPayCatalog({
      catalogId,
      userId: req.user!.id,
      planCode: req.body?.planCode,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function pixWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const body =
    req.body && typeof req.body === 'object'
      ? (req.body as Record<string, unknown>)
      : {};
  const queryDataId = req.query['data.id']
    ? String(req.query['data.id'])
    : undefined;
  const rawBodyData =
    typeof body.data === 'object' && body.data !== null
      ? (body.data as Record<string, unknown>)
      : undefined;
  const externalResourceId =
    queryDataId || (rawBodyData?.id ? String(rawBodyData.id) : undefined);
  const eventType =
    typeof body.type === 'string'
      ? body.type
      : typeof body.topic === 'string'
        ? body.topic
        : 'unknown';

  try {
    const result = await processPixWebhook({
      body,
      queryDataId,
      xSignature: req.headers['x-signature'] as string | undefined,
      xRequestId: req.headers['x-request-id'] as string | undefined,
    });

    const { recordPaymentWebhookLog } = await import(
      '../services/adminFinance.service.js'
    );
    void recordPaymentWebhookLog({
      eventType,
      externalResourceId,
      status: 'PROCESSED',
      httpStatus: 200,
      payload: body,
    });

    res.status(200).json(result);
  } catch (error) {
    const { recordPaymentWebhookLog } = await import(
      '../services/adminFinance.service.js'
    );
    const { captureSystemError } = await import(
      '../services/errorLog.service.js'
    );
    const errMsg = error instanceof Error ? error.message : String(error);
    const httpStatus = error instanceof AppError ? error.statusCode : 500;
    void recordPaymentWebhookLog({
      eventType,
      externalResourceId,
      status: 'FAILED',
      httpStatus,
      errorMessage: errMsg,
      payload: body,
    });
    if (httpStatus >= 500) {
      captureSystemError({
        source: 'WEBHOOK',
        severity: 'CRITICAL',
        category: 'WEBHOOK',
        message: errMsg,
        stack: error instanceof Error ? error.stack : undefined,
        route: req.originalUrl || req.path,
        method: req.method,
        statusCode: httpStatus,
        context: { eventType, externalResourceId },
      });
    }
    next(error);
  }
}

export async function getPublicStoreHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawSlug = String(req.params.slug || '');
    const isPreview = req.query.preview === 'true';
    const requesterId = isPreview ? getOptionalAuthUserId(req) : null;

    const result = await getPublicStoreBySlug({
      rawSlug,
      isPreview,
      requesterId,
    });

    if (isPreview) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader(
        'Cache-Control',
        'public, max-age=15, stale-while-revalidate=30'
      );
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resolveCatalogTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const editToken = uuidParamSchema.parse(req.params.editToken);
    const result = await resolveCatalogEditToken({
      editToken,
      userId: req.user!.id,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCatalogByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = uuidParamSchema.parse(req.params.id);
    const result = await getOwnedCatalogDetail({
      id,
      userId: req.user!.id,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCatalogByManageTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const editToken = uuidParamSchema.parse(req.params.editToken);
    const result = await getOwnedCatalogDetail({
      editToken,
      userId: req.user!.id,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateCatalogByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = uuidParamSchema.parse(req.params.id);
    const userId = req.user!.id;
    const payload = buildValidatedCatalogUpdatePayload(
      (req.body || {}) as Record<string, unknown>
    );
    const files = (req.files as Express.Multer.File[]) || [];

    const result = await updateOwnedCatalog({
      lookup: { id, userId },
      userId,
      payload,
      files,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateCatalogByManageTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const editToken = uuidParamSchema.parse(req.params.editToken);
    const userId = req.user!.id;
    const payload = buildValidatedCatalogUpdatePayload(
      (req.body || {}) as Record<string, unknown>
    );
    const files = (req.files as Express.Multer.File[]) || [];

    const result = await updateOwnedCatalog({
      lookup: { editToken, userId },
      userId,
      payload,
      files,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
