import { Loader2 } from 'lucide-react';

interface ToggleSwitchProps {
  checked: boolean;
  loading?: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  onToggle: () => void;
}

export function ToggleSwitch({
  checked,
  loading = false,
  disabled = false,
  label,
  description,
  onToggle,
}: ToggleSwitchProps) {
  const isBlocked = loading || disabled;

  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
      <div className="min-w-0">
        <span className="block text-xs font-bold text-zinc-900">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
            {description}
          </span>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-busy={loading}
        aria-label={label}
        disabled={isBlocked}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none ${
          isBlocked
            ? 'cursor-wait opacity-70'
            : 'cursor-pointer active:scale-[0.98]'
        } ${
          checked
            ? 'bg-emerald-600'
            : 'border border-zinc-300 bg-zinc-200 hover:bg-zinc-300/80'
        }`}
      >
        <span
          className={`inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white shadow-xs transition-transform ${
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        >
          {loading && <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-600" />}
        </span>
      </button>
    </div>
  );
}
