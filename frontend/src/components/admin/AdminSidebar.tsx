import { useEffect } from 'react';
import {
  ShieldCheck,
  LogOut,
  X,
  LayoutDashboard,
  Store,
  Users,
  Clock,
  Wallet,
  Bug,
  Rocket,
} from 'lucide-react';
import logoVitriMini from '../../assets/logo-vitrimini.png';

export type AdminTab =
  | 'overview'
  | 'catalogs'
  | 'users'
  | 'radar'
  | 'finance'
  | 'errors'
  | 'growth';

export const ADMIN_TABS: Array<{
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'catalogs', label: 'Vitrines', icon: Store },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'radar', label: 'Radar', icon: Clock },
  { id: 'finance', label: 'Financeiro & Webhooks', icon: Wallet },
  { id: 'errors', label: 'Central de Erros', icon: Bug },
  { id: 'growth', label: 'Crescimento & Auditoria', icon: Rocket },
];

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  userEmail: string;
  openErrorsCount: number;
  hasData: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  userEmail,
  openErrorsCount,
  hasData,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: AdminSidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  const renderNavContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* Topo */}
      <div className="border-b border-zinc-200 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="Logo da VitriMini"
              className="h-6 w-auto object-contain"
            />
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">
              <ShieldCheck className="h-3 w-3 text-rose-400" />
              Super Admin
            </span>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="cursor-pointer rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="mt-2 truncate text-xs text-zinc-500" title={userEmail}>
          {userEmail}
        </p>
      </div>

      {/* Meio: Navegação */}
      <nav
        aria-label="Navegação Super Admin"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {hasData &&
          ADMIN_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            const badge =
              t.id === 'errors' && openErrorsCount > 0
                ? openErrorsCount
                : undefined;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelectTab(t.id);
                  if (isMobile) onCloseMobile();
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </span>
                {badge !== undefined && (
                  <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none font-extrabold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Rodapé */}
      <div className="border-t border-zinc-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop Fixa */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-zinc-200 lg:bg-white">
        {renderNavContent(false)}
      </aside>

      {/* Drawer Mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={`fixed inset-0 bg-black/40 transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu do painel Super Admin"
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderNavContent(true)}
        </div>
      </div>
    </>
  );
}
