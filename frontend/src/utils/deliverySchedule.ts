const SHIFT_ORDER: Record<string, number> = {
  '': 0,
  Manhã: 1,
  Tarde: 2,
  Noite: 3,
  'Horário Comercial': 4,
};

/**
 * Retorna a data de hoje no fuso America/Sao_Paulo no formato YYYY-MM-DD.
 */
export function getSaoPauloTodayIso(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
}

/**
 * Soma dias a uma data YYYY-MM-DD e retorna YYYY-MM-DD.
 */
export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

/**
 * Retorna a data YYYY-MM-DD do próximo sábado (ou hoje se já for sábado).
 */
export function getNextSaturdayIso(todayIso = getSaoPauloTodayIso()): string {
  const [y, m, d] = todayIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dt.getUTCDay(); // 0=Dom .. 6=Sáb
  const diff = (6 - dayOfWeek + 7) % 7;
  return addDaysIso(todayIso, diff === 0 ? 7 : diff);
}

/**
 * Detecta se um slot possui data específica (dd/mm/aaaa ou dd/mm) anterior ao dia atual.
 * Opções recorrentes ("Toda Sexta • Tarde") e rápidas nunca expiram.
 */
export function isDeliverySlotExpired(
  slot: string,
  todayIso = getSaoPauloTodayIso()
): boolean {
  const fullMatch = slot.match(/^(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (fullMatch) {
    const [, dd, mm, yyyy] = fullMatch;
    const slotIso = `${yyyy}-${mm}-${dd}`;
    return slotIso < todayIso;
  }

  const shortMatch = slot.match(/^(\d{2})\/(\d{2})\b/);
  if (shortMatch) {
    const [, dd, mm] = shortMatch;
    const [todayYear, todayMonth] = todayIso.split('-').map(Number);
    const slotMonth = Number(mm);
    // Se estamos em dezembro e o slot é janeiro, considera ano seguinte
    const resolvedYear =
      todayMonth === 12 && slotMonth === 1 ? todayYear + 1 : todayYear;
    const slotIso = `${resolvedYear}-${mm}-${dd}`;
    return slotIso < todayIso;
  }

  return false;
}

export function filterActiveDeliverySlots(slots: string[]): string[] {
  const todayIso = getSaoPauloTodayIso();
  return slots.filter((slot) => !isDeliverySlotExpired(slot, todayIso));
}

function getSlotSortKey(slot: string): number {
  const fullMatch = slot.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s*\([^)]+\))?(?:\s*•\s*(.+))?$/
  );
  if (fullMatch) {
    const day = Number(fullMatch[1]);
    const month = Number(fullMatch[2]);
    const year = Number(fullMatch[3]);
    const shiftLabel = (fullMatch[4] || '').trim();
    const shiftRank = SHIFT_ORDER[shiftLabel] ?? 5;
    return ((year * 100 + month) * 100 + day) * 10 + shiftRank;
  }

  const shortMatch = slot.match(
    /^(\d{2})\/(\d{2})(?:\s*\([^)]+\))?(?:\s*•\s*(.+))?$/
  );
  if (shortMatch) {
    const day = Number(shortMatch[1]);
    const month = Number(shortMatch[2]);
    const shiftLabel = (shortMatch[3] || '').trim();
    const shiftRank = SHIFT_ORDER[shiftLabel] ?? 5;
    return (20260000 + month * 100 + day) * 10 + shiftRank;
  }

  return 999999999;
}

export function sortDeliverySlots(slots: string[]): string[] {
  return [...slots].sort((a, b) => getSlotSortKey(a) - getSlotSortKey(b));
}
