import type { Prisma } from '@prisma/client';

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|hash|token|jwt|auth(orization)?|cookie|secret|api[-_]?key|brevo|mpaccess|mprefresh|card[-_]?number|cvv|security[-_]?code|private[-_]?key)/i;

const JWT_LIKE_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const CARD_DIGITS_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;

function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function redactText(raw: string, maxLen = 2000): string {
  const sanitized = raw
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(JWT_LIKE_PATTERN, '[REDACTED_JWT]')
    .replace(CARD_DIGITS_PATTERN, (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19 && isValidLuhn(digits)
        ? '[REDACTED_CARD]'
        : match;
    });

  if (sanitized.length <= maxLen) {
    return sanitized;
  }
  return `${sanitized.slice(0, maxLen)}...[TRUNCATED]`;
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (depth > 5) {
    return '[MAX_DEPTH]';
  }
  if (typeof value === 'string') {
    return redactText(value, 600);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 40);
    for (const [key, val] of entries) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactValue(val, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function sanitizeJsonPayload(
  value: unknown
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const redacted = redactValue(value, 0);
  if (redacted === undefined || redacted === null) {
    return undefined;
  }
  return redacted as Prisma.InputJsonValue;
}
