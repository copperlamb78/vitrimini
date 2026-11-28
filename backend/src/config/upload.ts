import multer from 'multer';
import { UploadValidationError } from '../middlewares/errorHandler.js';

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB (imagens já comprimidas em WebP no front)

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export function assertValidImageMagicBytes(
  buffer: Buffer,
  mimetype: string
): void {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new UploadValidationError(
      'Arquivo vazio ou inválido para verificação de assinatura.'
    );
  }

  let isValid = false;

  switch (mimetype) {
    case 'image/jpeg':
      isValid =
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      break;
    case 'image/png':
      isValid =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a;
      break;
    case 'image/webp':
      isValid =
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP';
      break;
    case 'image/avif': {
      const box = buffer.subarray(4, 12).toString('ascii');
      isValid = box === 'ftypavif' || box === 'ftypavis';
      break;
    }
    default:
      isValid = false;
  }

  if (!isValid) {
    throw new UploadValidationError(
      `Assinatura binária incompatível com o tipo declarado (${mimetype}).`
    );
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 25,
    fieldSize: 512 * 1024,
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
