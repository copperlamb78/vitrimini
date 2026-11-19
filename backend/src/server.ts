import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { UPLOADS_DIR } from './config/upload.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import { errorHandler, FRIENDLY_ERRORS } from './middlewares/errorHandler.js';
import { startCleanupScheduler } from './services/cleanup.service.js';

export const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigin = (
  process.env.FRONTEND_URL || 'http://localhost:5173'
).replace(/\/$/, '');

app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '200kb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'VitriMini API' });
});

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);

app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: FRIENDLY_ERRORS.NOT_FOUND });
});

app.use(errorHandler);

if (process.env.VITRIMINI_TEST_MODE !== 'true') {
  app.listen(PORT, () => {
    console.log(`🚀 VitriMini API rodando em http://localhost:${PORT}`);
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
