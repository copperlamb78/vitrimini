import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import { errorHandler, FRIENDLY_ERRORS } from './middlewares/errorHandler.js';
import { startCleanupScheduler } from './services/cleanup.service.js';

export const app = express();
const PORT = Number(process.env.PORT) || 3333;

// Necessário atrás de proxy reverso (Render) para rate-limit e req.ip corretos
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const configuredFrontend = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set<string>([
  'https://vitrimini.com.br',
  'https://www.vitrimini.com.br',
  ...configuredFrontend,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : []),
]);

app.use(
  cors({
    origin(origin, callback) {
      // Permite chamadas sem header Origin (health checks, webhooks, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(normalized)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);

app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: FRIENDLY_ERRORS.NOT_FOUND });
});

app.use(errorHandler);

if (process.env.VITRIMINI_TEST_MODE !== 'true') {
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
