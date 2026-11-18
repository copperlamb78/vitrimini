import { prisma } from '../lib/prisma.js';

export function slugify(text: string): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'loja';
}

export async function generateUniqueSlug(storeName: string): Promise<string> {
  const baseSlug = slugify(storeName);
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.catalog.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}
