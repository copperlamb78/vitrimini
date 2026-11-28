import { Loader2 } from 'lucide-react';

interface AdminToggleSwitchProps {
  checked: boolean;
  loading?: boolean;
  disabled?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  ariaLabel?: string;
  onToggle: () => void;
}

export function AdminToggleSwitch({
  checked,
  loading = false,
  disabled = false,
  activeLabel = 'Ativo',
  inactiveLabel = 'Desativado',
  ariaLabel,
  onToggle,
}: AdminToggleSwitchProps) {
  const isBlocked = loading || disabled;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading}
      aria-label={ariaLabel || (checked ? activeLabel : inactiveLabel)}
      title={checked ? 'Clique para desativar' : 'Clique para ativar'}
      disabled={isBlocked}
      onClick={onToggle}
      className={`group inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none ${
        isBlocked
          ? 'cursor-wait opacity-70'
          : 'cursor-pointer active:scale-[0.98]'
      } ${
        checked
          ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70'
          : 'border-zinc-300 bg-white hover:bg-zinc-50'
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked
            ? 'bg-emerald-600'
            : 'border border-zinc-300 bg-zinc-200 group-hover:bg-zinc-300/80'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </span>

      <span
        className={`inline-flex items-center gap-1 text-xs ${
          checked ? 'font-semibold text-emerald-700' : 'font-medium text-zinc-600'
        }`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {checked ? activeLabel : inactiveLabel}
      </span>
    </button>
  );
}
