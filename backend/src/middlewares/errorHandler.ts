import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly userMessage: string;

  constructor(statusCode: number, userMessage: string) {
    super(userMessage);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.userMessage = userMessage;
  }
}

export class UploadValidationError extends Error {
  constructor(technicalReason = 'Invalid upload file format') {
    super(technicalReason);
    this.name = 'UploadValidationError';
  }
}

export const FRIENDLY_ERRORS = {
  VALIDATION: 'Verifique os dados preenchidos e tente novamente.',
  UPLOAD: 'Não foi possível processar uma das imagens. Tente uma foto menor.',
  NOT_FOUND: 'Vitrine não encontrada ou link expirado.',
  INTERNAL:
    'Ocorreu uma instabilidade temporária ao processar sua solicitação. Tente novamente em instantes.',
} as const;

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.NODE_ENV === 'production') {
    const errObj =
      typeof err === 'object' && err !== null
        ? (err as { name?: unknown; message?: unknown; code?: unknown })
        : null;
    const safeLog: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      name:
        err instanceof Error
          ? err.name
          : typeof errObj?.name === 'string'
            ? errObj.name
            : 'UnknownError',
      message:
        err instanceof Error
          ? err.message
          : typeof errObj?.message === 'string'
            ? errObj.message
            : String(err),
    };
    if (errObj && 'code' in errObj && errObj.code !== undefined) {
      safeLog.code = errObj.code;
    }
    console.error('[API Error]:', safeLog);
  } else {
    console.error('[API Error]:', err);
  }

  if (res.headersSent) {
    return;
  }

  // 1. Erros intencionais e seguros da aplicação
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.userMessage });
    return;
  }

  // 2. Erros de validação do Zod (garante mensagens 100% em português)
  if (err instanceof ZodError) {
    const rawMsg = err.issues[0]?.message || '';
    const isTechnicalZodMsg =
      !rawMsg || /^invalid/i.test(rawMsg) || /expected/i.test(rawMsg);
    const safeMsg = isTechnicalZodMsg ? FRIENDLY_ERRORS.VALIDATION : rawMsg;
    res.status(400).json({ error: safeMsg });
    return;
  }

  // 3. Erros de upload de imagem (Multer tamanho > 5MB ou formato inválido)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res
        .status(400)
        .json({ error: 'Imagem muito grande. O tamanho máximo permitido é 5 MB.' });
      return;
    }
    res.status(400).json({ error: FRIENDLY_ERRORS.UPLOAD });
    return;
  }

  if (err instanceof UploadValidationError) {
    res.status(400).json({
      error: 'Formato de imagem inválido. Envie apenas JPG, PNG, WebP ou AVIF.',
    });
    return;
  }

  // 4. Payload JSON malformado ou muito grande (body-parser)
  if (
    err instanceof SyntaxError ||
    (typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      (err as { type?: unknown }).type === 'entity.too.large')
  ) {
    res.status(400).json({ error: FRIENDLY_ERRORS.VALIDATION });
    return;
  }

  // 5. Registro não encontrado no Prisma (código P2025)
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2025'
  ) {
    res.status(404).json({ error: FRIENDLY_ERRORS.NOT_FOUND });
    return;
  }

  // 6. Qualquer erro do Prisma, banco de dados, gateway ou exceção inesperada -> 500 genérico
  res.status(500).json({ error: FRIENDLY_ERRORS.INTERNAL });
}
