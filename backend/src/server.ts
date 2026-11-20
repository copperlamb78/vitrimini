import 'dotenv/config';
import express, { Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import mpRoutes from './routes/mp.routes.js';
import { errorHandler, FRIENDLY_ERRORS } from './middlewares/errorHandler.js';
import {
  isAllowedOrigin,
  validateJwtSecretConfig,
} from './middlewares/auth.js';
import { startCleanupScheduler } from './services/cleanup.service.js';
import { prisma } from './lib/prisma.js';
import { getFrontendBaseUrl } from './services/email.service.js';

export const app = express();
const PORT = Number(process.env.PORT) || 3333;

// Necessário atrás de proxy reverso (Render) para rate-limit e req.ip corretos
app.set('trust proxy', 1);

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Permite chamadas sem header Origin (health checks, webhooks, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '200kb' }));

// Rota leve de Health Check (Render / Uptime monitor)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    status: 'ok',
    service: 'VitriMini API',
    timestamp: new Date().toISOString(),
  });
});

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SITEMAP_CACHE_TTL_MS = 5 * 60 * 1000;
let sitemapCache: { xml: string; expiresAt: number } | null = null;

const sitemapRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas solicitações ao sitemap. Aguarde alguns instantes.',
  },
});

// Sitemap XML dinâmico para indexação no Google (página inicial + vitrines ativas)
app.get('/sitemap.xml', sitemapRateLimiter, async (_req: Request, res: Response, next) => {
  try {
    const nowMs = Date.now();
    if (sitemapCache && sitemapCache.expiresAt > nowMs) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(sitemapCache.xml);
      return;
    }

    const baseUrl = getFrontendBaseUrl();
    const now = new Date();

    const activeCatalogs = await prisma.catalog.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const staticEntries = [
      { loc: `${baseUrl}/`, changefreq: 'weekly', priority: '1.0' },
      { loc: `${baseUrl}/criar`, changefreq: 'monthly', priority: '0.8' },
    ];

    const urlNodes = [
      ...staticEntries.map(
        (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
      ),
      ...activeCatalogs.map(
        (cat) => `  <url>
    <loc>${escapeXml(`${baseUrl}/c/${cat.slug}`)}</loc>
    <lastmod>${cat.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes.join('\n')}
</urlset>`;

    sitemapCache = {
      xml,
      expiresAt: nowMs + SITEMAP_CACHE_TTL_MS,
    };

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', orderRoutes);
app.use('/api', mpRoutes);
app.use('/api', catalogRoutes);

app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: FRIENDLY_ERRORS.NOT_FOUND });
});

app.use(errorHandler);

if (process.env.VITRIMINI_TEST_MODE !== 'true') {
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_PIX === 'true') {
    throw new Error('MOCK_PIX=true é proibido em ambiente de produção.');
  }
  validateJwtSecretConfig();
  app.listen(PORT, () => {
    console.log(`🚀 VitriMini API rodando na porta ${PORT}`);
    startCleanupScheduler();

    const ngrokToken = process.env.NGROK_AUTHTOKEN?.trim();
    if (ngrokToken && process.env.NODE_ENV !== 'production') {
      import('@ngrok/ngrok')
        .then((ngrok) =>
          ngrok.forward({
            addr: PORT,
            authtoken_from_env: true,
          })
        )
        .then((listener) => {
          const publicUrl = listener.url();
          if (publicUrl) {
            if (!process.env.BACKEND_PUBLIC_URL) {
              process.env.BACKEND_PUBLIC_URL = publicUrl;
            }
            console.log(`🌐 Túnel ngrok ativo: ${publicUrl}`);
            console.log(
              `🔔 URL do Webhook Mercado Pago: ${publicUrl}/api/webhooks/pix`
            );
          }
        })
        .catch((err) => {
          console.error('[ngrok Error]: Não foi possível iniciar o túnel:', err);
        });
    }
  });
}
