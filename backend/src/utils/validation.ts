import { z } from 'zod';

/**
 * Remove tags HTML/scripts (<script>, <img onerror>, etc.) e bytes nulos
 * para prevenir Stored XSS em campos de texto livre.
 */
export function sanitizePlainText(input: string): string {
  return input
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Valida e normaliza telefone brasileiro:
 * - Rejeita imediatamente se contiver letras ou caracteres estranhos fora de [0-9()-\s+]
 * - Exige DDD válido (11..99) + 8 ou 9 dígitos (total 10 ou 11 dígitos locais, ou 12-13 com DDI 55)
 * - Normaliza sempre para DDI 55 + DDD + número
 */
export const brazilianPhoneSchema = z
  .string()
  .trim()
  .max(25, 'Número de WhatsApp inválido.')
  .refine((val) => /^[0-9()\-\s+]+$/.test(val), {
    message: 'O telefone deve conter apenas números.',
  })
  .transform((val) => {
    const digits = val.replace(/\D/g, '');
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
      return digits;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return digits;
  })
  .refine((digits) => /^55[1-9]{2}9?\d{8}$/.test(digits), {
    message: 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).',
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'E-mail muito longo.')
  .email('Informe um endereço de e-mail válido.');

export const registerSchema = z.object({
  name: z
    .string()
    .transform(sanitizePlainText)
    .pipe(
      z
        .string()
        .min(2, 'Informe seu nome completo (mínimo 2 caracteres).')
        .max(100, 'Nome muito longo (máximo 100 caracteres).')
    ),
  email: emailSchema,
  phone: brazilianPhoneSchema,
  password: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(6, 'A senha precisa ter pelo menos 6 caracteres.')
        .max(128, 'A senha excede o tamanho máximo permitido.')
    ),
  acceptTerms: z.literal(true, {
    message:
      'Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.',
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Informe sua senha.')
    .max(128, 'Senha inválida.'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, 'Link de redefinição inválido.')
    .max(128, 'Link de redefinição inválido.')
    .refine((val) => /^[a-f0-9]+$/i.test(val), {
      message: 'Link de redefinição inválido.',
    }),
  password: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(6, 'A nova senha precisa ter pelo menos 6 caracteres.')
        .max(128, 'A senha excede o tamanho máximo permitido.')
    ),
});

export const productInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .transform(sanitizePlainText)
    .pipe(
      z
        .string()
        .min(1, 'Todos os produtos precisam ter um nome.')
        .max(120, 'Nome do produto muito longo (máximo 120 caracteres).')
    ),
  description: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const cleaned = sanitizePlainText(val);
      return cleaned.length > 0 ? cleaned : null;
    })
    .refine((val) => val === null || val.length <= 500, {
      message: 'Descrição do produto muito longa (máximo 500 caracteres).',
    }),
  priceCents: z
    .union([z.number(), z.string()])
    .transform((v) => Math.round(Number(v)))
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= 100_000_000, {
      message: 'Preço do produto inválido.',
    }),
  imageUrl: z
    .string()
    .max(300)
    .refine(
      (val) => {
        if (
          val === '' ||
          val.startsWith('https://') ||
          (val.startsWith('/') && !val.startsWith('//'))
        ) {
          return true;
        }
        if (process.env.NODE_ENV !== 'production') {
          return (
            val.startsWith('http://localhost') ||
            val.startsWith('http://127.0.0.1')
          );
        }
        return false;
      },
      { message: 'Link de imagem inválido.' }
    )
    .nullable()
    .optional(),
  imageField: z.string().max(50).optional(),
  orderIndex: z.number().int().min(0).max(10000).optional(),
  available: z.union([z.boolean(), z.string(), z.number()]).optional(),
});

export const buttonShapeSchema = z.enum(['professional', 'modern', 'relaxed']);
export const buttonFillSchema = z.enum(['solid', 'outline']);
export const nichePresetSchema = z.enum([
  'default',
  'bakery',
  'petshop',
  'fashion',
  'delivery',
]);
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida.');

export const storeAppearanceSchema = z.object({
  bgColor: hexColorSchema
    .optional()
    .nullable()
    .transform((v) => v || undefined),
  primaryColor: hexColorSchema,
  buttonShape: buttonShapeSchema.optional().default('modern'),
  buttonFill: buttonFillSchema.optional().default('solid'),
  nichePreset: nichePresetSchema.optional().default('default'),
});

export const catalogMetadataSchema = z.object({
  storeName: z
    .string()
    .transform(sanitizePlainText)
    .pipe(
      z
        .string()
        .min(2, 'Informe o nome do estabelecimento (mínimo 2 caracteres).')
        .max(100, 'Nome da loja muito longo (máximo 100 caracteres).')
    ),
  whatsapp: brazilianPhoneSchema,
  pixKey: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const cleaned = sanitizePlainText(val);
      return cleaned.length > 0 ? cleaned : null;
    })
    .refine((val) => val === null || val.length <= 140, {
      message: 'Chave Pix muito longa (máximo 140 caracteres).',
    }),
  depositPct: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === undefined || val === '' ? 50 : Number(val)))
    .refine((val) => [0, 50, 100].includes(val), {
      message: 'Porcentagem de sinal deve ser 0, 50 ou 100.',
    }),
  minOrderCents: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === undefined || val === '' ? 0 : Number(val)))
    .refine((val) => Number.isInteger(val) && val >= 0 && val <= 10000000, {
      message: 'Valor mínimo do pedido inválido.',
    }),
  paymentNotice: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const cleaned = sanitizePlainText(val);
      return cleaned.length > 0 ? cleaned : null;
    })
    .refine((val) => val === null || val.length <= 140, {
      message: 'Aviso de pagamento muito longo (máximo 140 caracteres).',
    }),
  themeColor: z
    .union([
      z.enum(['rose', 'red', 'amber', 'emerald', 'purple', 'zinc']),
      hexColorSchema,
    ])
    .optional()
    .default('rose'),
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const cleaned = sanitizePlainText(val);
      return cleaned.length > 0 ? cleaned : null;
    })
    .refine((val) => val === null || val.length <= 1000, {
      message: 'Texto de avisos muito longo (máximo 1000 caracteres).',
    }),
  deliveryDates: z
    .array(
      z
        .string()
        .transform(sanitizePlainText)
        .pipe(z.string().max(120, 'Data de entrega muito longa.'))
    )
    .max(60, 'Limite máximo de 60 datas de entrega excedido.')
    .optional()
    .default([]),
});

export const createOrderSchema = z
  .object({
    customerName: z
      .string()
      .transform(sanitizePlainText)
      .pipe(
        z
          .string()
          .min(2, 'Informe seu nome (mínimo 2 caracteres).')
          .max(100, 'Nome muito longo.')
      ),
    customerPhone: brazilianPhoneSchema,
    deliveryType: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
    deliveryAddress: z
      .string()
      .nullable()
      .optional()
      .transform((val) => {
        if (!val) return null;
        const cleaned = sanitizePlainText(val);
        return cleaned.length > 0 ? cleaned : null;
      })
      .refine((val) => val === null || val.length <= 240, {
        message: 'Endereço muito longo (máximo 240 caracteres).',
      }),
    deliveryDate: z
      .string()
      .nullable()
      .optional()
      .transform((val) => {
        if (!val) return null;
        const cleaned = sanitizePlainText(val);
        return cleaned.length > 0 ? cleaned : null;
      })
      .refine((val) => val === null || val.length <= 100, {
        message: 'Data de entrega muito longa.',
      }),
    paymentMethod: z.enum(['PIX', 'CARD', 'CASH', 'OTHER']).default('PIX'),
    paymentChannel: z.enum(['WHATSAPP', 'MERCADO_PAGO']).optional().default('WHATSAPP'),
    notes: z
      .string()
      .nullable()
      .optional()
      .transform((val) => {
        if (!val) return null;
        const cleaned = sanitizePlainText(val);
        return cleaned.length > 0 ? cleaned : null;
      })
      .refine((val) => val === null || val.length <= 400, {
        message: 'Observações muito longas (máximo 400 caracteres).',
      }),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Produto inválido.'),
          quantity: z.coerce
            .number()
            .int('Quantidade inválida.')
            .min(1, 'Quantidade mínima é 1.')
            .max(100, 'Quantidade máxima por item é 100.'),
        })
      )
      .min(1, 'Adicione pelo menos um item ao pedido.')
      .max(50, 'Limite de 50 itens diferentes por pedido.'),
  })
  .refine(
    (data) =>
      data.deliveryType !== 'DELIVERY' ||
      (typeof data.deliveryAddress === 'string' &&
        data.deliveryAddress.trim().length >= 5),
    {
      message: 'Informe o endereço completo para entrega.',
      path: ['deliveryAddress'],
    }
  );

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PREPARING',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
  ]),
});

function isSafeHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeBioImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/uploads/') && !trimmed.startsWith('//')) {
    return !trimmed.includes('..');
  }
  return isSafeHttpUrl(trimmed);
}

const optionalSafeImageUrlSchema = z
  .string()
  .max(500, 'Link de imagem muito longo (máximo 500 caracteres).')
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return undefined;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  .refine((val) => val === undefined || isSafeBioImageUrl(val), {
    message: 'Link de imagem inválido.',
  });

export const bioLinkItemSchema = z.object({
  id: z.string().trim().min(1, 'ID do link inválido.').max(64),
  title: z
    .string()
    .transform(sanitizePlainText)
    .pipe(
      z
        .string()
        .min(1, 'Informe o título do link.')
        .max(40, 'O título do link deve ter no máximo 40 caracteres.')
    ),
  subtitle: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return undefined;
      const cleaned = sanitizePlainText(val);
      return cleaned.length > 0 ? cleaned : undefined;
    })
    .refine((val) => val === undefined || val.length <= 60, {
      message: 'O subtítulo do link deve ter no máximo 60 caracteres.',
    }),
  url: z
    .string()
    .trim()
    .max(500, 'URL muito longa (máximo 500 caracteres).')
    .refine(isSafeHttpUrl, {
      message: 'URL inválida: use apenas links iniciados por http:// ou https://.',
    }),
  icon: z
    .enum(['whatsapp', 'instagram', 'tiktok', 'maps', 'catalog', 'vip', 'link'])
    .default('link'),
  highlighted: z.boolean().optional().default(false),
  layout: z.enum(['compact', 'featured-card']).optional().default('compact'),
  imageUrl: optionalSafeImageUrlSchema,
});

function sanitizeOptionalSocial(maxLen: number) {
  return z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return undefined;
      const cleaned = sanitizePlainText(val);
      return cleaned.length > 0 ? cleaned.slice(0, maxLen) : undefined;
    });
}

export const bioLinksConfigSchema = z.object({
  enabled: z.boolean().default(false),
  theme: z.enum(['minimal', 'brand-soft', 'dark-glass']).default('minimal'),
  buttonStyle: z.enum(['pill', 'card', 'outline']).default('card'),
  nichePreset: nichePresetSchema.optional().default('default'),
  inheritStoreTheme: z.boolean().optional().default(true),
  buttonShape: buttonShapeSchema.optional(),
  buttonFill: buttonFillSchema.optional(),
  bgColor: hexColorSchema
    .optional()
    .nullable()
    .transform((v) => v || undefined),
  primaryColor: hexColorSchema
    .optional()
    .nullable()
    .transform((v) => v || undefined),
  storeAppearance: storeAppearanceSchema.optional(),
  bannerUrl: optionalSafeImageUrlSchema,
  bannerStyle: z
    .enum(['none', 'brand-gradient', 'image'])
    .optional()
    .default('none'),
  showFeaturedProducts: z.boolean().default(true),
  socials: z
    .object({
      instagram: sanitizeOptionalSocial(160),
      tiktok: sanitizeOptionalSocial(160),
      whatsapp: sanitizeOptionalSocial(30),
    })
    .default({ instagram: undefined, tiktok: undefined, whatsapp: undefined }),
  links: z
    .array(bioLinkItemSchema)
    .max(8, 'Você pode adicionar no máximo 8 links personalizados.')
    .default([]),
});
