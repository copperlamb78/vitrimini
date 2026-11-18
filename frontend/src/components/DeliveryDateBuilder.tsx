import { useState } from 'react';
import { CalendarPlus, Sparkles, X } from 'lucide-react';
import type { ThemePalette } from '../constants/themes';

const SHIFTS = [
  'Manhã',
  'Tarde',
  'Noite',
  'Horário Comercial',
  'Sem turno específico',
] as const;

type ShiftOption = (typeof SHIFTS)[number];

const SHIFT_ORDER: Record<string, number> = {
  '': 0,
  Manhã: 1,
  Tarde: 2,
  Noite: 3,
  'Horário Comercial': 4,
};

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const QUICK_CONTINUOUS_OPTIONS = [
  'Combinar data no WhatsApp',
  'Prazo de 2 dias úteis',
  'Sob encomenda (consultar agenda)',
];

function formatDateSlot(isoDate: string, shift: ShiftOption): string | null {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(dateObj.getTime())) return null;

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const weekday = WEEKDAYS_PT[dateObj.getDay()];

  if (shift === 'Sem turno específico') {
    return `${dd}/${mm} (${weekday})`;
  }
  return `${dd}/${mm} (${weekday}) • ${shift}`;
}

function getSlotSortKey(slot: string): number {
  const match = slot.match(/^(\d{2})\/(\d{2})(?:\s*\([^)]+\))?(?:\s*•\s*(.+))?$/);
  if (!match) {
    return 999999;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const shiftLabel = (match[3] || '').trim();
  const shiftRank = SHIFT_ORDER[shiftLabel] ?? 5;
  return (month * 100 + day) * 10 + shiftRank;
}

export function sortDeliverySlots(slots: string[]): string[] {
  return [...slots].sort((a, b) => {
    const keyA = getSlotSortKey(a);
    const keyB = getSlotSortKey(b);
    if (keyA !== keyB) return keyA - keyB;
    return 0;
  });
}

interface DeliveryDateBuilderProps {
  value: string[];
  onChange: (next: string[]) => void;
  theme: ThemePalette;
}

export function DeliveryDateBuilder({
  value,
  onChange,
  theme,
}: DeliveryDateBuilderProps) {
  const [dateInput, setDateInput] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftOption>('Manhã');
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  function addSlot(slot: string) {
    const cleaned = slot.trim();
    if (!cleaned) return;
    if (value.includes(cleaned)) return;
    onChange(sortDeliverySlots([...value, cleaned]));
  }

  function handleAddFormattedDate() {
    if (!dateInput) return;
    const formatted = formatDateSlot(dateInput, selectedShift);
    if (!formatted) return;
    addSlot(formatted);
  }

  function handleAddCustom() {
    if (!customInput.trim()) return;
    addSlot(customInput);
    setCustomInput('');
  }

  function handleRemoveSlot(target: string) {
    onChange(value.filter((item) => item !== target));
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 space-y-3">
        {/* 1. Data + Turno */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-semibold text-stone-600">
              Escolha o dia no calendário
            </label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-900"
            />
          </div>

          <div className="sm:col-span-7">
            <label className="block text-[11px] font-semibold text-stone-600">
              Turno disponível
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SHIFTS.map((shift) => {
                const active = selectedShift === shift;
                return (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setSelectedShift(shift)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {shift}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleAddFormattedDate}
            disabled={!dateInput}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText}`}
          >
            <CalendarPlus className="h-4 w-4" />
            + Adicionar data
          </button>

          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showCustom
              ? 'Ocultar opções sem data fixa'
              : 'Trabalha sem data fixa? Ver atalhos'}
          </button>
        </div>

        {/* Atalhos para encomendas contínuas + opção personalizada */}
        {showCustom && (
          <div className="space-y-2.5 border-t border-stone-200 pt-3">
            <p className="text-[11px] font-medium text-stone-500">
              Clique para adicionar rapidamente ou digite uma opção personalizada:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CONTINUOUS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => addSlot(opt)}
                  className="rounded-lg border border-dashed border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-stone-500 hover:bg-stone-100"
                >
                  + {opt}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                placeholder="Outra opção (ex: Sábados até 12h)"
                className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-stone-900"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Slots Ativos */}
      {value.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Datas / Turnos ativos ({value.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {value.map((slot) => (
              <span
                key={slot}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${theme.softBg} ${theme.softText} border-black/5`}
              >
                {slot}
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(slot)}
                  aria-label={`Remover ${slot}`}
                  className="rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-400">
          Nenhuma data fixa cadastrada — o cliente poderá informar uma preferência de horário livremente no pedido.
        </p>
      )}
    </div>
  );
}
