import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { UPLOADS_DIR } from '../config/upload.js';

export const GRACE_PERIOD_DAYS = 30;
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

async function safeDeleteUploadFile(relativeUrl: string | null | undefined): Promise<void> {
  if (!relativeUrl) return;
  const filename = path.basename(relativeUrl);
  if (!filename || filename === '.gitkeep') return;

  const fullPath = path.join(UPLOADS_DIR, filename);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignora silenciosamente caso o arquivo já não exista no disco
  }
}

/**
 * Busca todas as vitrines cujo expiresAt já venceu há mais de 30 dias,
 * apaga fisicamente as imagens (logoUrl e imageUrl dos produtos) da pasta /uploads
 * e remove o registro do banco de dados em cascata.
 */
export async function cleanupExpiredCatalogs(): Promise<number> {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - GRACE_PERIOD_MS);

    // 1. Garante que vitrines com expiresAt < now estejam marcadas como EXPIRED
    await prisma.catalog.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 2. Busca vitrines cujo período de carência de 30 dias já encerrou
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

    if (expiredBeyondGrace.length === 0) {
      return 0;
    }

    for (const catalog of expiredBeyondGrace) {
      await safeDeleteUploadFile(catalog.logoUrl);

      for (const product of catalog.products) {
        await safeDeleteUploadFile(product.imageUrl);
      }

      await prisma.catalog.delete({
        where: { id: catalog.id },
      });
    }

    console.log(
      `🧹 [Cleanup]: ${expiredBeyondGrace.length} vitrine(s) vencida(s) há mais de 30 dias removida(s) permanentemente.`
    );
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
