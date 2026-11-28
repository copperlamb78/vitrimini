import { prisma } from '../lib/prisma.js';
import {
  sendCatalogExpiredEmail,
  sendCatalogExpiringSoonEmail,
} from './email.service.js';
import { deleteImagesFromR2 } from './r2.service.js';
import { purgeOldObservabilityLogs } from './errorLog.service.js';
import { runExpirationEmailRules } from './adminRadar.service.js';

export const GRACE_PERIOD_DAYS = 30;
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Executa o ciclo completo de notificações e limpeza de vitrines:
 * 1. Aviso de 7 dias antes do vencimento (notified7DaysBefore)
 * 2. Transição ACTIVE -> EXPIRED + aviso de início da carência de 30 dias (notifiedExpiration)
 * 3. Exclusão definitiva em lote no Cloudflare R2 (1 op Class A) e remoção do banco após 30 dias de carência
 */
export async function cleanupExpiredCatalogs(): Promise<number> {
  try {
    const now = new Date();
    const sevenDaysAhead = new Date(now.getTime() + SEVEN_DAYS_MS);
    const cutoffDate = new Date(now.getTime() - GRACE_PERIOD_MS);

    // 1. Aviso de 7 dias antes do vencimento
    const expiringSoonCatalogs = await prisma.catalog.findMany({
      where: {
        status: 'ACTIVE',
        notified7DaysBefore: false,
        expiresAt: {
          gt: now,
          lte: sevenDaysAhead,
        },
      },
      select: {
        id: true,
        storeName: true,
        slug: true,
        expiresAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    for (const cat of expiringSoonCatalogs) {
      await prisma.catalog.update({
        where: { id: cat.id },
        data: { notified7DaysBefore: true },
      });

      if (cat.expiresAt) {
        void sendCatalogExpiringSoonEmail({
          to: cat.user.email,
          name: cat.user.name,
          storeName: cat.storeName,
          slug: cat.slug,
          expiresAt: cat.expiresAt,
        }).catch((mailErr) => {
          console.error('[Expiring Soon Email Error]:', mailErr);
        });
      }
    }

    // 2. Vitrines que venceram (expiresAt <= now) mas ainda estão dentro da janela de 30 dias
    const newlyExpiredCatalogs = await prisma.catalog.findMany({
      where: {
        expiresAt: {
          gte: cutoffDate,
          lte: now,
        },
        OR: [{ status: 'ACTIVE' }, { notifiedExpiration: false }],
      },
      select: {
        id: true,
        storeName: true,
        slug: true,
        expiresAt: true,
        notifiedExpiration: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    for (const cat of newlyExpiredCatalogs) {
      const shouldNotify = !cat.notifiedExpiration;

      await prisma.catalog.update({
        where: { id: cat.id },
        data: {
          status: 'EXPIRED',
          notifiedExpiration: true,
        },
      });

      if (shouldNotify && cat.expiresAt) {
        void sendCatalogExpiredEmail({
          to: cat.user.email,
          name: cat.user.name,
          storeName: cat.storeName,
          slug: cat.slug,
          expiresAt: cat.expiresAt,
        }).catch((mailErr) => {
          console.error('[Catalog Expired Email Error]:', mailErr);
        });
      }
    }

    // 3. Busca vitrines cujo período de carência de 30 dias já encerrou para exclusão definitiva
    const expiredBeyondGrace = await prisma.catalog.findMany({
      where: {
        expiresAt: { lt: cutoffDate },
      },
      select: {
        id: true,
        slug: true,
        logoUrl: true,
        products: {
          select: {
            imageUrl: true,
          },
        },
      },
    });

    if (expiredBeyondGrace.length > 0) {
      // Coleta todas as URLs de imagens e apaga em um único lote no R2 (1 operação Class A)
      const allImageUrls: Array<string | null> = [];
      for (const catalog of expiredBeyondGrace) {
        allImageUrls.push(catalog.logoUrl);
        for (const product of catalog.products) {
          allImageUrls.push(product.imageUrl);
        }
      }

      await deleteImagesFromR2(allImageUrls);

      await prisma.catalog.deleteMany({
        where: {
          id: { in: expiredBeyondGrace.map((c) => c.id) },
        },
      });

      console.log(
        `🧹 [Cleanup]: ${expiredBeyondGrace.length} vitrine(s) vencida(s) há mais de 30 dias removida(s) permanentemente (banco + R2).`
      );
    }

    const ruleResult = await runExpirationEmailRules({
      dryRun: false,
      respectBusinessHours: true,
    });
    if (!ruleResult.skipped && ruleResult.processed > 0) {
      console.log(
        `📧 [Expiration Rules]: ${ruleResult.processed} lembrete(s) enviado(s).`
      );
    }

    const purged = await purgeOldObservabilityLogs();
    if (
      purged.webhookDeleted > 0 ||
      purged.errorDeleted > 0 ||
      purged.auditDeleted > 0
    ) {
      console.log(
        `🧹 [Cleanup Logs]: webhooks=${purged.webhookDeleted}, errors=${purged.errorDeleted}, audits=${purged.auditDeleted}`
      );
    }

    return expiredBeyondGrace.length;
  } catch (err) {
    console.error('[Cleanup Error]: Falha ao executar limpeza automática:', err);
    return 0;
  }
}

export function startCleanupScheduler(): void {
  void cleanupExpiredCatalogs();

  const timer = setInterval(() => {
    void cleanupExpiredCatalogs();
  }, TWELVE_HOURS_MS);

  timer.unref();
}
