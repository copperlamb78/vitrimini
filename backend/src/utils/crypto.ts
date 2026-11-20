import crypto from 'node:crypto';

function getJwtSecretForCrypto(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET não configurado ou muito curto em produção para criptografia.'
      );
    }
    return secret;
  }

  if (secret) {
    if (secret.length < 16) {
      throw new Error(
        'JWT_SECRET muito curto em desenvolvimento para criptografia.'
      );
    }
    return secret;
  }

  return 'vitrimini-default-jwt-secret-2026';
}

function getPrimaryEncryptionSecret(): string {
  const dedicatedKey = process.env.MP_ENCRYPTION_KEY?.trim();
  if (dedicatedKey) {
    if (dedicatedKey.length < 16) {
      throw new Error('MP_ENCRYPTION_KEY deve ter pelo menos 16 caracteres.');
    }
    return dedicatedKey;
  }

  if (process.env.NODE_ENV !== 'production') {
    return process.env.JWT_SECRET?.trim()
      ? getJwtSecretForCrypto()
      : 'vitrimini-default-mp-encryption-secret-2026';
  }

  return getJwtSecretForCrypto();
}

function deriveAesKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function tryDecryptWithKey(payload: string, key: Buffer): string {
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de segredo criptografado inválido.');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    deriveAesKey(getPrimaryEncryptionSecret()),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de segredo criptografado inválido.');
  }

  const primarySecret = getPrimaryEncryptionSecret();
  try {
    return tryDecryptWithKey(payload, deriveAesKey(primarySecret));
  } catch (primaryErr) {
    // Fallback para tokens antigos criptografados com JWT_SECRET antes da separação de MP_ENCRYPTION_KEY
    if (process.env.MP_ENCRYPTION_KEY?.trim()) {
      const legacySecret = getJwtSecretForCrypto();
      if (legacySecret !== primarySecret) {
        return tryDecryptWithKey(payload, deriveAesKey(legacySecret));
      }
    }
    throw primaryErr;
  }
}

interface MpOAuthStatePayload {
  catalogId: string;
  userId: string;
  nonce: string;
  exp: number;
}

export function signMpOAuthState(
  catalogId: string,
  userId: string,
  nonce: string = crypto.randomBytes(16).toString('hex')
): string {
  const payload: MpOAuthStatePayload = {
    catalogId,
    userId,
    nonce,
    exp: Date.now() + 15 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getJwtSecretForCrypto())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyMpOAuthState(state: string): MpOAuthStatePayload | null {
  const dotIdx = state.indexOf('.');
  if (dotIdx === -1) return null;

  const encoded = state.slice(0, dotIdx);
  const sig = state.slice(dotIdx + 1);
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getJwtSecretForCrypto())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as MpOAuthStatePayload;
    if (
      !parsed?.catalogId ||
      !parsed?.userId ||
      typeof parsed.nonce !== 'string' ||
      parsed.nonce.length === 0 ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
