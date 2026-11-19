import { Check } from 'lucide-react';
import { THEME_LIST, type ThemeId } from '../constants/themes';

interface ThemeSelectorProps {
  value: ThemeId;
  onChange: (themeId: ThemeId) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {THEME_LIST.map((palette) => {
        const selected = value === palette.id;
        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => onChange(palette.id)}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
              selected
                ? `${palette.softBorder} ${palette.softBg} ${palette.softText}`
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span
              style={{ backgroundColor: palette.hex }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
            >
              {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </span>
            <span
              className={`truncate text-xs font-semibold ${
                selected ? palette.softText : 'text-stone-800'
              }`}
            >
              {palette.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
