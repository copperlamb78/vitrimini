import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../middlewares/auth.js';
import { userOrIpKeyGenerator } from '../middlewares/rateLimitGuard.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

const adminReadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error: 'Muitas consultas ao painel administrativo. Aguarde alguns minutos.',
  },
});

const adminWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error: 'Muitas operações administrativas em sequência. Aguarde alguns minutos.',
  },
});

router.use(requireAdmin);

// Visão Geral
router.get('/overview', adminReadRateLimiter, adminController.getOverview);

// Módulo 1: Gestão de Vitrines
router.get('/catalogs', adminReadRateLimiter, adminController.listCatalogs);
router.patch('/catalogs/:id/slug', adminWriteRateLimiter, adminController.updateCatalogSlug);
router.patch('/catalogs/:id/lifecycle', adminWriteRateLimiter, adminController.updateCatalogLifecycle);
router.patch('/catalogs/:id/plan', adminWriteRateLimiter, adminController.changeCatalogPlan);
router.post('/catalogs/:id/transfer', adminWriteRateLimiter, adminController.transferCatalog);
router.delete('/catalogs/:id', adminWriteRateLimiter, adminController.deleteCatalog);

// Módulo 2: Usuários, Suporte & Radar de Vencimentos
router.get('/users', adminReadRateLimiter, adminController.listUsers);
router.post('/users/:id/impersonate', adminWriteRateLimiter, adminController.impersonateUser);
router.post('/users/:id/resend-welcome', adminWriteRateLimiter, adminController.resendWelcomeEmail);
router.post('/users/:id/reset-password-link', adminWriteRateLimiter, adminController.generateResetPasswordLink);

router.get('/radar', adminReadRateLimiter, adminController.getRadar);
router.post('/radar/run', adminWriteRateLimiter, adminController.runRadarRules);
router.patch('/radar/cron', adminWriteRateLimiter, adminController.toggleRadarCron);
router.post('/radar/:catalogId/notify', adminWriteRateLimiter, adminController.sendRadarReminder);

// Módulo 3: Financeiro, Webhooks, Central de Erros & E-mails
router.get('/finance/summary', adminReadRateLimiter, adminController.getFinanceSummary);
router.get('/payments', adminReadRateLimiter, adminController.listPayments);
router.post('/payments/:id/reconcile', adminWriteRateLimiter, adminController.reconcilePayment);
router.get('/webhooks', adminReadRateLimiter, adminController.listWebhooks);

router.get('/errors', adminReadRateLimiter, adminController.listErrors);
router.delete('/errors/resolved', adminWriteRateLimiter, adminController.purgeResolvedErrors);
router.patch('/errors/:id', adminWriteRateLimiter, adminController.updateErrorStatus);

router.get('/emails', adminReadRateLimiter, adminController.listEmails);
router.post('/emails/:id/retry', adminWriteRateLimiter, adminController.retryEmail);

// Módulo 4: Crescimento & Auditoria
router.get('/coupons', adminReadRateLimiter, adminController.listCoupons);
router.post('/coupons', adminWriteRateLimiter, adminController.createCoupon);
router.patch('/coupons/:id', adminWriteRateLimiter, adminController.updateCoupon);

router.get('/announcements', adminReadRateLimiter, adminController.listAnnouncements);
router.post('/announcements', adminWriteRateLimiter, adminController.createAnnouncement);
router.patch('/announcements/:id', adminWriteRateLimiter, adminController.updateAnnouncement);

router.get('/audit-logs', adminReadRateLimiter, adminController.listAuditLogs);

export default router;
