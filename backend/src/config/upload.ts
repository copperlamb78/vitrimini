import multer from 'multer';
import { UploadValidationError } from '../middlewares/errorHandler.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new UploadValidationError(
          `Formato não suportado (${file.mimetype}). Aceito apenas JPG, PNG, WebP ou AVIF.`
        )
      );
    }
  },
});
