import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { UPLOADS_DIR } from './config/upload.js';
import catalogRoutes from './routes/catalog.routes.js';
import { errorHandler, FRIENDLY_ERRORS } from './middlewares/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
  })
);
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'VitriMini API' });
});

app.use('/api', catalogRoutes);

app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: FRIENDLY_ERRORS.NOT_FOUND });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 VitriMini API rodando em http://localhost:${PORT}`);
});
