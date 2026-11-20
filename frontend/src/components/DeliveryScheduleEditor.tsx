import { useState } from 'react';
import {
  CalendarPlus,
  Zap,
  Repeat,
  CalendarDays,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import type { ThemePalette } from '../constants/themes';
import {
  addDaysIso,
  getNextSaturdayIso,
  getSaoPauloTodayIso,
  isDeliverySlotExpired,
  sortDeliverySlots,
} from '../utils/deliverySchedule';

type EditorMode = 'quick' | 'recurring' | 'specific';

const QUICK_OPTIONS = [
  'Pronta entrega (envio imediato)',
  'Sob encomenda (consultar agenda)',
  'A combinar no WhatsApp',
  'Retirada imediata na loja',
] as const;

const WEEKDAYS = [
  { short: 'Seg', full: 'Segunda', prefix: 'Toda' },
  { short: 'Ter', full: 'Terça', prefix: 'Toda' },
  { short: 'Qua', full: 'Quarta', prefix: 'Toda' },
  { short: 'Qui', full: 'Quinta', prefix: 'Toda' },
  { short: 'Sex', full: 'Sexta', prefix: 'Toda' },
  { short: 'Sáb', full: 'Sábado', prefix: 'Todo' },
  { short: 'Dom', full: 'Domingo', prefix: 'Todo' },
] as const;

const WEEKDAYS_JS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const SHIFT_OPTIONS = [
  'Manhã',
  'Tarde',
  'Noite',
  'Horário Comercial',
  'Sem turno específico',
] as const;

interface DeliveryScheduleEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  theme: ThemePalette;
}

export function DeliveryScheduleEditor({
  value,
  onChange,
  theme,
}: DeliveryScheduleEditorProps) {
  const [mode, setMode] = useState<EditorMode>('specific');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modo 2: Recorrente
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [recurringShifts, setRecurringShifts] = useState<string[]>(['Manhã']);
  const [recurringCustomEnabled, setRecurringCustomEnabled] = useState(false);
  const [recurringCustomShift, setRecurringCustomShift] = useState('');

  // Modo 3: Datas específicas
  const todayIso = getSaoPauloTodayIso();
  const [dateInput, setDateInput] = useState('');
  const [specificShifts, setSpecificShifts] = useState<string[]>(['Manhã']);
  const [specificCustomEnabled, setSpecificCustomEnabled] = useState(false);
  const [specificCustomShift, setSpecificCustomShift] = useState('');

  const expiredSlots = value.filter((s) => isDeliverySlotExpired(s, todayIso));

  function showDuplicateFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2600);
  }

  function addSlots(candidates: string[]) {
    const uniqueNew: string[] = [];
    let hadDuplicate = false;

    for (const raw of candidates) {
      const cleaned = raw.trim();
      if (!cleaned) continue;
      if (value.includes(cleaned) || uniqueNew.includes(cleaned)) {
        hadDuplicate = true;
        continue;
      }
      uniqueNew.push(cleaned);
    }

    if (uniqueNew.length > 0) {
      onChange(sortDeliverySlots([...value, ...uniqueNew]));
      setFeedback(null);
    } else if (hadDuplicate) {
      showDuplicateFeedback('Essa opção já está na lista.');
    }
  }

  function toggleQuickOption(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((item) => item !== opt));
    } else {
      addSlots([opt]);
    }
  }

  function toggleShift(
    shift: string,
    current: string[],
    setter: (next: string[]) => void
  ) {
    if (shift === 'Sem turno específico') {
      setter(current.includes(shift) ? [] : ['Sem turno específico']);
      return;
    }
    const withoutNoShift = current.filter((s) => s !== 'Sem turno específico');
    if (withoutNoShift.includes(shift)) {
      setter(withoutNoShift.filter((s) => s !== shift));
    } else {
      setter([...withoutNoShift, shift]);
    }
  }

  function toggleWeekday(dayShort: string) {
    setSelectedDays((prev) =>
      prev.includes(dayShort)
        ? prev.filter((d) => d !== dayShort)
        : [...prev, dayShort]
    );
  }

  function resolveShiftLabels(
    selected: string[],
    customEnabled: boolean,
    customText: string
  ): string[] {
    const labels = [...selected];
    if (customEnabled && customText.trim()) {
      labels.push(customText.trim());
    }
    return labels;
  }

  function handleAddRecurring() {
    if (selectedDays.length === 0) return;

    const orderedDays = WEEKDAYS.filter((w) => selectedDays.includes(w.short));
    let daysLabel = '';
    if (orderedDays.length === 1) {
      daysLabel = `${orderedDays[0].prefix} ${orderedDays[0].full}`;
    } else if (orderedDays.length === 2) {
      daysLabel = `${orderedDays[0].short} e ${orderedDays[1].short}`;
    } else {
      const head = orderedDays
        .slice(0, -1)
        .map((d) => d.short)
        .join(', ');
      daysLabel = `${head} e ${orderedDays[orderedDays.length - 1].short}`;
    }

    const shifts = resolveShiftLabels(
      recurringShifts,
      recurringCustomEnabled,
      recurringCustomShift
    );
    const effectiveShifts = shifts.length > 0 ? shifts : ['Sem turno específico'];

    const entries = effectiveShifts.map((shift) =>
      shift === 'Sem turno específico' ? daysLabel : `${daysLabel} • ${shift}`
    );

    addSlots(entries);
  }

  function handleAddSpecificDate() {
    if (!dateInput) return;
    const parts = dateInput.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return;

    const [year, month, day] = parts;
    const dateObj = new Date(year, month - 1, day, 12, 0, 0);
    if (Number.isNaN(dateObj.getTime())) return;

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const weekday = WEEKDAYS_JS[dateObj.getDay()];
    const baseDate = `${dd}/${mm}/${year} (${weekday})`;

    const shifts = resolveShiftLabels(
      specificShifts,
      specificCustomEnabled,
      specificCustomShift
    );
    const effectiveShifts = shifts.length > 0 ? shifts : ['Sem turno específico'];

    const entries = effectiveShifts.map((shift) =>
      shift === 'Sem turno específico' ? baseDate : `${baseDate} • ${shift}`
    );

    addSlots(entries);
  }

  function handleRemoveSlot(target: string) {
    onChange(value.filter((item) => item !== target));
  }

  function handleClearExpired() {
    onChange(value.filter((item) => !isDeliverySlotExpired(item, todayIso)));
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 space-y-3.5">
        {/* Seletor de 3 Modos */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-white p-1">
          {[
            { id: 'quick' as const, label: 'Rápido', icon: Zap },
            { id: 'recurring' as const, label: 'Semanal', icon: Repeat },
            { id: 'specific' as const, label: 'Data fixa', icon: CalendarDays },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                  active
                    ? `${theme.primaryBg} ${theme.buttonText} shadow-2xs`
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modo 1 — Sem data fixa / Rápido */}
        {mode === 'quick' && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-stone-500">
              Ative ou desative com 1 clique as opções de atendimento rápido:
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {QUICK_OPTIONS.map((opt) => {
                const active = value.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleQuickOption(opt)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modo 2 — Dias da semana (Recorrente) */}
        {mode === 'recurring' && (
          <div className="space-y-3">
            <div>
              <span className="block text-[11px] font-semibold text-stone-600">
                Dias da semana (não expira)
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = selectedDays.includes(day.short);
                  return (
                    <button
                      key={day.short}
                      type="button"
                      onClick={() => toggleWeekday(day.short)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                        active
                          ? `${theme.primaryBg} ${theme.buttonText} border-transparent`
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-stone-600">
                Turnos (selecione um ou mais)
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SHIFT_OPTIONS.map((shift) => {
                  const active = recurringShifts.includes(shift);
                  return (
                    <button
                      key={shift}
                      type="button"
                      onClick={() =>
                        toggleShift(shift, recurringShifts, setRecurringShifts)
                      }
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
                <button
                  type="button"
                  onClick={() => setRecurringCustomEnabled((v) => !v)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    recurringCustomEnabled
                      ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {recurringCustomEnabled && (
                <input
                  type="text"
                  maxLength={35}
                  value={recurringCustomShift}
                  onChange={(e) => setRecurringCustomShift(e.target.value)}
                  placeholder="Ex: 18h às 22h"
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-stone-900"
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleAddRecurring}
              disabled={selectedDays.length === 0}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-45 ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText}`}
            >
              <Repeat className="h-3.5 w-3.5" />
              + Adicionar recorrência
            </button>
          </div>
        )}

        {/* Modo 3 — Datas específicas (Fornadas / Eventos) */}
        {mode === 'specific' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-stone-600">
                Escolha a data (somente futuras)
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Hoje', iso: todayIso },
                  { label: 'Amanhã', iso: addDaysIso(todayIso, 1) },
                  { label: 'Próx. Sábado', iso: getNextSaturdayIso(todayIso) },
                ].map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() => setDateInput(shortcut.iso)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                      dateInput === shortcut.iso
                        ? `${theme.primaryBg} ${theme.buttonText} border-transparent`
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-start">
              <div className="sm:col-span-5">
                <input
                  type="date"
                  min={todayIso}
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-900"
                />
              </div>

              <div className="sm:col-span-7">
                <div className="flex flex-wrap gap-1.5">
                  {SHIFT_OPTIONS.map((shift) => {
                    const active = specificShifts.includes(shift);
                    return (
                      <button
                        key={shift}
                        type="button"
                        onClick={() =>
                          toggleShift(shift, specificShifts, setSpecificShifts)
                        }
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
                  <button
                    type="button"
                    onClick={() => setSpecificCustomEnabled((v) => !v)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      specificCustomEnabled
                        ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {specificCustomEnabled && (
                  <input
                    type="text"
                    maxLength={35}
                    value={specificCustomShift}
                    onChange={(e) => setSpecificCustomShift(e.target.value)}
                    placeholder="Ex: 18h às 22h"
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-stone-900"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddSpecificDate}
              disabled={!dateInput}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-45 ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText}`}
            >
              <CalendarPlus className="h-4 w-4" />
              + Adicionar data
            </button>
          </div>
        )}

        {feedback && (
          <p className="text-[11px] font-semibold text-amber-700">{feedback}</p>
        )}
      </div>

      {/* Lista de Datas / Turnos Ativos */}
      {value.length > 0 ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Datas / Turnos ativos ({value.length})
            </p>
            {expiredSlots.length > 0 && (
              <button
                type="button"
                onClick={handleClearExpired}
                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" />
                Limpar vencidas ({expiredSlots.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {value.map((slot) => {
              const expired = isDeliverySlotExpired(slot, todayIso);
              return (
                <span
                  key={slot}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    expired
                      ? 'border-red-200 bg-red-50/70 text-red-700'
                      : `${theme.softBg} ${theme.softText} border-black/5`
                  }`}
                >
                  <span className={expired ? 'line-through opacity-80' : ''}>
                    {slot}
                  </span>
                  {expired && (
                    <span className="rounded bg-red-200/80 px-1 py-0.5 text-[9px] font-extrabold uppercase text-red-800">
                      Expirada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slot)}
                    aria-label={`Remover ${slot}`}
                    className="rounded-full p-0.5 hover:bg-black/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
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
