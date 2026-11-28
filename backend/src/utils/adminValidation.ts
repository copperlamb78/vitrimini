import { z } from 'zod';

export const uuidParamSchema = z.string().uuid('ID inválido.');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
});

export const listCatalogsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED']).optional(),
  planType: z.enum(['ESSENTIAL', 'PRO']).optional(),
});

export const updateSlugSchema = z.object({
  slug: z.string().trim().min(3, 'Slug muito curto.').max(60, 'Slug muito longo.'),
});

export const updateLifecycleSchema = z
  .object({
    addDays: z.number().int().min(1).max(3650).optional(),
    expiresAt: z.string().trim().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED']).optional(),
    reason: z.string().trim().max(240).optional(),
  })
  .refine(
    (v) =>
      v.addDays !== undefined ||
      v.expiresAt !== undefined ||
      v.status !== undefined,
    { message: 'Informe dias, data de validade ou status.' }
  );

export const transferCatalogSchema = z
  .object({
    targetEmail: z.string().trim().email('E-mail inválido.').optional(),
    targetUserId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.targetEmail || v.targetUserId), {
    message: 'Informe o e-mail do usuário de destino.',
  });

export const changePlanSchema = z.object({
  planCode: z.enum(['ESSENTIAL_30', 'PRO_30', 'PRO_365']),
  adjustExpiration: z.boolean().optional().default(false),
});

export const deleteCatalogSchema = z.object({
  confirmSlug: z.string().trim().min(1, 'Confirme o slug da vitrine.'),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['MERCHANT', 'BUYER']).optional(),
});

export const generateResetLinkSchema = z.object({
  sendEmail: z.boolean().optional().default(false),
});

export const radarQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
});

export const runExpirationRulesSchema = z.object({
  dryRun: z.boolean().optional().default(true),
});

export const toggleCronSchema = z.object({
  enabled: z.boolean(),
});

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'PAID']).optional(),
});

export const listWebhooksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED']).optional(),
});

export const listErrorsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED']).optional(),
  source: z.enum(['BACKEND', 'FRONTEND', 'WEBHOOK', 'CRON', 'EMAIL']).optional(),
  severity: z.enum(['CRITICAL', 'ERROR', 'WARNING']).optional(),
  category: z.string().trim().max(40).optional(),
});

export const updateErrorStatusSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED']),
  resolutionNote: z.string().trim().max(600).optional(),
});

export const listEmailsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['SENT', 'FAILED']).optional(),
});

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().max(60).optional(),
  targetType: z.string().trim().max(40).optional(),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(32),
  description: z.string().trim().max(240).optional(),
  type: z.enum(['EXTENDED_TRIAL', 'BONUS_DAYS']).default('EXTENDED_TRIAL'),
  bonusDays: z.coerce.number().int().min(1).max(365),
  targetPlanCode: z.enum(['ESSENTIAL_30', 'PRO_30', 'PRO_365']).nullable().optional(),
  maxUses: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  expiresAt: z.string().trim().nullable().optional(),
});

export const updateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  expiresAt: z.string().trim().nullable().optional(),
  description: z.string().trim().max(240).nullable().optional(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(600),
  variant: z.enum(['INFO', 'WARNING', 'SUCCESS', 'PROMO']).default('INFO'),
  ctaLabel: z.string().trim().max(60).nullable().optional(),
  ctaUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (val) => !val || val.startsWith('/') || val.startsWith('https://'),
      'URL do CTA deve começar com / ou https://'
    )
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().trim().nullable().optional(),
  endsAt: z.string().trim().nullable().optional(),
  dismissible: z.boolean().default(true),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

