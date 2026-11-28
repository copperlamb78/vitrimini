import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';
import { getActiveAnnouncement } from '../services/adminApi';
import type { GlobalAnnouncementItem } from '../types/admin';

const VARIANT_STYLES: Record<
  GlobalAnnouncementItem['variant'],
  { box: string; icon: typeof Info }
> = {
  INFO: {
    box: 'border-sky-200 bg-sky-50 text-sky-950',
    icon: Info,
  },
  WARNING: {
    box: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: AlertTriangle,
  },
  SUCCESS: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: CheckCircle2,
  },
  PROMO: {
    box: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: Sparkles,
  },
};

export function GlobalAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<GlobalAnnouncementItem | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getActiveAnnouncement().then((item) => {
      if (cancelled || !item) return;
      try {
        if (
          item.dismissible &&
          localStorage.getItem(`vitrimini_announcement_dismissed_${item.id}`) === '1'
        ) {
          return;
        }
      } catch {
        // Ignora erro de storage
      }
      setAnnouncement(item);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!announcement || dismissed) {
    return null;
  }

  const style = VARIANT_STYLES[announcement.variant] || VARIANT_STYLES.INFO;
  const Icon = style.icon;

  function handleDismiss() {
    if (!announcement) return;
    setDismissed(true);
    try {
      localStorage.setItem(
        `vitrimini_announcement_dismissed_${announcement.id}`,
        '1'
      );
    } catch {
      // Ignora
    }
  }

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xs ${style.box}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">{announcement.title}</p>
          <p className="mt-0.5 text-xs opacity-90">{announcement.message}</p>
          {announcement.ctaLabel &&
            announcement.ctaUrl &&
            ((announcement.ctaUrl.startsWith('/') &&
              !announcement.ctaUrl.startsWith('//')) ||
              announcement.ctaUrl.startsWith('https://')) && (
            <div className="mt-2">
              {announcement.ctaUrl.startsWith('/') ? (
                <Link
                  to={announcement.ctaUrl}
                  className="inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  {announcement.ctaLabel}
                </Link>
              ) : (
                <a
                  href={announcement.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  {announcement.ctaLabel}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {announcement.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso"
          className="cursor-pointer rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
