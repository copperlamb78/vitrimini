import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SettingsSectionCardProps {
  title: string;
  subtitle?: ReactNode;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Card recolhível padronizado para seções de configuração da Vitrine e VitriLink.
 */
export function SettingsSectionCard({
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  badge,
  children,
  className = '',
}: SettingsSectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200/80 bg-white shadow-xs overflow-hidden transition-shadow ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full min-h-[56px] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-zinc-50/80 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 leading-tight">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && (
              <div className="text-xs sm:text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-zinc-100 px-4 sm:px-5 py-4 sm:py-5">
          {children}
        </div>
      )}
    </section>
  );
}
