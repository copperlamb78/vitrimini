import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';
import * as adminCatalogService from '../services/adminCatalog.service.js';
import * as adminSupportService from '../services/adminSupport.service.js';
import * as adminFinanceService from '../services/adminFinance.service.js';
import * as adminRadarService from '../services/adminRadar.service.js';
import * as adminGrowthService from '../services/adminGrowth.service.js';
import * as auditService from '../services/audit.service.js';
import {
  changePlanSchema,
  createAnnouncementSchema,
  createCouponSchema,
  deleteCatalogSchema,
  generateResetLinkSchema,
  listAuditLogsQuerySchema,
  listCatalogsQuerySchema,
  listEmailsQuerySchema,
  listErrorsQuerySchema,
  listPaymentsQuerySchema,
  listUsersQuerySchema,
  listWebhooksQuerySchema,
  paginationQuerySchema,
  radarQuerySchema,
  runExpirationRulesSchema,
  toggleCronSchema,
  transferCatalogSchema,
  updateAnnouncementSchema,
  updateCouponSchema,
  updateErrorStatusSchema,
  updateLifecycleSchema,
  updateSlugSchema,
  uuidParamSchema,
} from '../utils/adminValidation.js';

function getAdminActor(req: Request) {
  return {
    id: req.user!.id,
    email: req.user!.email,
  };
}

export async function getOverview(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const overview = await adminService.getOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

export async function listCatalogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listCatalogsQuerySchema.parse(req.query);
    const result = await adminCatalogService.listAdminCatalogs(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateCatalogSlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const { slug } = updateSlugSchema.parse(req.body);
    const updated = await adminCatalogService.updateCatalogSlug({
      catalogId,
      rawSlug: slug,
      admin: getAdminActor(req),
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function updateCatalogLifecycle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const body = updateLifecycleSchema.parse(req.body);
    const updated = await adminCatalogService.updateCatalogLifecycle({
      catalogId,
      ...body,
      admin: getAdminActor(req),
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function transferCatalog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const body = transferCatalogSchema.parse(req.body);
    const result = await adminCatalogService.transferCatalogOwnership({
      catalogId,
      ...body,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function changeCatalogPlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const body = changePlanSchema.parse(req.body);
    const updated = await adminCatalogService.changeCatalogPlan({
      catalogId,
      ...body,
      admin: getAdminActor(req),
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteCatalog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const { confirmSlug } = deleteCatalogSchema.parse(req.body);
    const result = await adminCatalogService.deleteCatalogSafely({
      catalogId,
      confirmSlug,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await adminSupportService.listAdminUsers(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function impersonateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targetUserId = uuidParamSchema.parse(req.params.id);
    const result = await adminSupportService.impersonateUser({
      targetUserId,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resendWelcomeEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targetUserId = uuidParamSchema.parse(req.params.id);
    const result = await adminSupportService.resendWelcomeEmailToUser({
      targetUserId,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function generateResetPasswordLink(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targetUserId = uuidParamSchema.parse(req.params.id);
    const { sendEmail } = generateResetLinkSchema.parse(req.body ?? {});
    const result = await adminSupportService.generateResetPasswordLinkForUser({
      targetUserId,
      sendEmail,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRadar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = radarQuerySchema.parse(req.query);
    const result = await adminRadarService.getExpirationRadar(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function sendRadarReminder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.catalogId);
    const result = await adminRadarService.sendManualExpirationReminder({
      catalogId,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function runRadarRules(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { dryRun } = runExpirationRulesSchema.parse(req.body ?? {});
    const result = await adminRadarService.runExpirationEmailRules({
      dryRun,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function toggleRadarCron(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { enabled } = toggleCronSchema.parse(req.body);
    const result = await adminRadarService.setExpirationCronEnabled({
      enabled,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getFinanceSummary(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await adminFinanceService.getFinanceSummary();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listPaymentsQuerySchema.parse(req.query);
    const result = await adminFinanceService.listAdminPayments(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function reconcilePayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paymentId = uuidParamSchema.parse(req.params.id);
    const result = await adminFinanceService.reconcileAdminPayment({
      paymentId,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listWebhooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listWebhooksQuerySchema.parse(req.query);
    const result = await adminFinanceService.listWebhookLogs(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listErrors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listErrorsQuerySchema.parse(req.query);
    const result = await adminFinanceService.listSystemErrors(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateErrorStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errorId = uuidParamSchema.parse(req.params.id);
    const body = updateErrorStatusSchema.parse(req.body);
    const result = await adminFinanceService.updateSystemErrorStatus({
      errorId,
      ...body,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function purgeResolvedErrors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await adminFinanceService.purgeResolvedSystemErrors(
      getAdminActor(req)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listEmailsQuerySchema.parse(req.query);
    const result = await adminFinanceService.listEmailLogs(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function retryEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emailLogId = uuidParamSchema.parse(req.params.id);
    const result = await adminFinanceService.retryFailedEmail({
      emailLogId,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listAuditLogsQuerySchema.parse(req.query);
    const result = await auditService.listAdminAuditLogs(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listCoupons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = paginationQuerySchema.parse(req.query);
    const result = await adminGrowthService.listCoupons(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = createCouponSchema.parse(req.body);
    const result = await adminGrowthService.createCoupon({
      ...body,
      admin: getAdminActor(req),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const couponId = uuidParamSchema.parse(req.params.id);
    const body = updateCouponSchema.parse(req.body);
    const result = await adminGrowthService.updateCoupon({
      couponId,
      ...body,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAnnouncements(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const items = await adminGrowthService.listAnnouncements();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = createAnnouncementSchema.parse(req.body);
    const result = await adminGrowthService.createAnnouncement({
      ...body,
      admin: getAdminActor(req),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = uuidParamSchema.parse(req.params.id);
    const body = updateAnnouncementSchema.parse(req.body);
    const result = await adminGrowthService.updateAnnouncement({
      id,
      ...body,
      admin: getAdminActor(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
