import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

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
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[API Error]:', err);

  if (res.headersSent) {
    return;
  }

  // 1. Erros intencionais e seguros da aplicação
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.userMessage });
    return;
  }

  // 2. Erros de upload de imagem (Multer tamanho/formato)
  if (err instanceof multer.MulterError || err instanceof UploadValidationError) {
    res.status(400).json({ error: FRIENDLY_ERRORS.UPLOAD });
    return;
  }

  // 3. Payload JSON malformado (body-parser ou JSON.parse)
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: FRIENDLY_ERRORS.VALIDATION });
    return;
  }

  // 4. Registro não encontrado no Prisma (código P2025)
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2025'
  ) {
    res.status(404).json({ error: FRIENDLY_ERRORS.NOT_FOUND });
    return;
  }

  // 5. Qualquer erro do Prisma, banco de dados, gateway ou exceção inesperada -> 500 genérico
  res.status(500).json({ error: FRIENDLY_ERRORS.INTERNAL });
}
