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
    .min(6, 'A senha precisa ter pelo menos 6 caracteres.')
    .max(128, 'A senha excede o tamanho máximo permitido.'),
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
    .min(6, 'A nova senha precisa ter pelo menos 6 caracteres.')
    .max(128, 'A senha excede o tamanho máximo permitido.'),
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
    .enum(['rose', 'red', 'amber', 'emerald', 'purple', 'zinc'])
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
