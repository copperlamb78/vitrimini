import { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BioLinkIcon,
  BioLinkItem,
  BioLinksButtonStyle,
  BioLinksConfig,
  BioLinksTheme,
  Product,
} from '../types/catalog';
import { getTheme } from '../constants/themes';
import { getSafeErrorMessage, updateCatalogById } from '../services/api';
import { isSafeHttpUrl } from '../utils/bioLinks';
import { BioLinksView } from './BioLinksView';

interface BioLinksTabProps {
  catalogId: string;
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  themeColor: string;
  notes?: string | null;
  hasProAccess: boolean;
  initialConfig: BioLinksConfig;
  products: Array<Pick<Product, 'id' | 'name' | 'priceCents' | 'imageUrl' | 'available'>>;
  onConfigSaved: (config: BioLinksConfig) => void;
  onRequestUpgrade: () => void;
}

const ICON_OPTIONS: Array<{ value: BioLinkIcon; label: string }> = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'maps', label: 'Localização / Mapa' },
  { value: 'catalog', label: 'Catálogo / Cardápio' },
  { value: 'vip', label: 'Grupo VIP / Oferta' },
  { value: 'link', label: 'Link genérico' },
];

const THEME_OPTIONS: Array<{
  value: BioLinksTheme;
  label: string;
  desc: string;
}> = [
  { value: 'minimal', label: 'Minimalista', desc: 'Fundo claro e limpo' },
  { value: 'brand-soft', label: 'Marca Suave', desc: 'Degradê da sua cor' },
  { value: 'dark-glass', label: 'Dark Glass', desc: 'Escuro translúcido' },
];

const BUTTON_STYLE_OPTIONS: Array<{
  value: BioLinksButtonStyle;
  label: string;
}> = [
  { value: 'card', label: 'Cartão' },
  { value: 'pill', label: 'Pílula' },
  { value: 'outline', label: 'Contorno' },
];

export function BioLinksTab({
  catalogId,
  slug,
  storeName,
  logoUrl,
  themeColor,
  notes,
  hasProAccess,
  initialConfig,
  products,
  onConfigSaved,
  onRequestUpgrade,
}: BioLinksTabProps) {
  const palette = getTheme(themeColor);
  const [config, setConfig] = useState<BioLinksConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const publicLinksUrl = `https://vitrimini.com.br/${slug}/links`;

  function handleCopyPublicUrl() {
    navigator.clipboard.writeText(publicLinksUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  function handleToggleEnabled() {
    if (!config.enabled && !hasProAccess) {
      setUpgradeModalOpen(true);
      return;
    }
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }

  function handleAddLink() {
    if (config.links.length >= 8) return;
    const newItem: BioLinkItem = {
      id: crypto.randomUUID(),
      title: '',
      subtitle: '',
      url: 'https://',
      icon: 'link',
      highlighted: false,
    };
    setConfig((prev) => ({ ...prev, links: [...prev.links, newItem] }));
  }

  function handleUpdateLink(id: string, patch: Partial<BioLinkItem>) {
    setConfig((prev) => ({
      ...prev,
      links: prev.links.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function handleRemoveLink(id: string) {
    setConfig((prev) => ({
      ...prev,
      links: prev.links.filter((item) => item.id !== id),
    }));
  }

  function handleMoveLink(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= config.links.length) return;
    setConfig((prev) => {
      const next = [...prev.links];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return { ...prev, links: next };
    });
  }

  async function handleSave() {
    setError(null);
    setSavedNotice(false);

    if (config.enabled && !hasProAccess) {
      setUpgradeModalOpen(true);
      return;
    }

    for (let i = 0; i < config.links.length; i++) {
      const item = config.links[i];
      if (!item.title.trim()) {
        setError(`Preencha o título do link #${i + 1}.`);
        return;
      }
      if (!isSafeHttpUrl(item.url)) {
        setError(
          `A URL do link "${item.title.trim()}" deve começar com https:// ou http://.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload: BioLinksConfig = {
        ...config,
        enabled: hasProAccess ? config.enabled : false,
        links: config.links.map((l) => ({
          ...l,
          title: l.title.trim().slice(0, 40),
          subtitle: l.subtitle?.trim() ? l.subtitle.trim().slice(0, 60) : undefined,
          url: l.url.trim(),
        })),
      };

      const formData = new FormData();
      formData.append('bioLinksConfig', JSON.stringify(payload));
      await updateCatalogById(catalogId, formData);

      setConfig(payload);
      onConfigSaved(payload);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível salvar as configurações do Link da Bio.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const phonePreviewNode = (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.5rem] border-[8px] border-zinc-900 bg-zinc-50 shadow-2xl">
      <div className="flex justify-center bg-zinc-900 pb-2 pt-1">
        <div className="h-4 w-24 rounded-full bg-zinc-800" />
      </div>
      <div className="h-[560px] overflow-y-auto">
        <BioLinksView
          slug={slug}
          storeName={storeName}
          logoUrl={logoUrl}
          themeColor={themeColor}
          notes={notes}
          config={config}
          products={products}
          isPreview
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-5 lg:col-span-7">
          {/* Botão preview mobile */}
          <div className="flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition hover:bg-zinc-50"
            >
              <Eye className="h-4 w-4" />
              Prévia no celular
            </button>
          </div>

          {!hasProAccess && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-start gap-2.5">
                <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Recurso exclusivo do Plano Pro</p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Você pode montar e testar o visual aqui no preview livremente. Para
                    publicar o endereço na sua bio, faça o upgrade para o Plano Pro.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestUpgrade}
                className="cursor-pointer rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                Conhecer Plano Pro
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {savedNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Links da Bio salvos com sucesso!</span>
            </div>
          )}

          {/* Card Link Público + Ativação */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-zinc-900">
                  Página de Links da Bio
                </h2>
                <p className="text-xs text-zinc-500">
                  Substitua o Linktree por uma página conectada à sua vitrine.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition ${
                  config.enabled ? palette.primaryBg : 'bg-zinc-300'
                }`}
                aria-label="Ativar página de Links da Bio"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-zinc-700">
                <Link2 className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="truncate">{publicLinksUrl}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPublicUrl}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar Link
                    </>
                  )}
                </button>
                {config.enabled && hasProAccess && (
                  <a
                    href={`/${slug}/links`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Aparência e Produtos em Destaque */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900">Tema visual</h3>
              <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                {THEME_OPTIONS.map((opt) => {
                  const selected = config.theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, theme: opt.value }))
                      }
                      className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                        selected
                          ? `${palette.softBorder} ${palette.softBg}`
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-900">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-zinc-900">
                Estilo dos botões
              </h3>
              <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                {BUTTON_STYLE_OPTIONS.map((opt) => {
                  const selected = config.buttonStyle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, buttonStyle: opt.value }))
                      }
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-xs font-bold transition ${
                        selected
                          ? `${palette.softBorder} ${palette.softBg} text-zinc-900`
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
              <div>
                <p className="text-xs font-bold text-zinc-900">
                  Exibir até 3 produtos em destaque no card da vitrine
                </p>
                <p className="text-[11px] text-zinc-500">
                  Mostra miniaturas com preço dentro do botão principal do catálogo.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.showFeaturedProducts}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    showFeaturedProducts: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-zinc-900"
              />
            </label>
          </div>

          {/* Redes Sociais */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-extrabold text-zinc-900">
              Barra de redes sociais (opcional)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600">
                  Instagram (@ ou URL)
                </label>
                <input
                  type="text"
                  value={config.socials.instagram || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      socials: { ...prev.socials, instagram: e.target.value },
                    }))
                  }
                  placeholder="@sualoja"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600">
                  TikTok (@ ou URL)
                </label>
                <input
                  type="text"
                  value={config.socials.tiktok || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      socials: { ...prev.socials, tiktok: e.target.value },
                    }))
                  }
                  placeholder="@sualoja"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600">
                  WhatsApp (DDD + número)
                </label>
                <input
                  type="text"
                  value={config.socials.whatsapp || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      socials: { ...prev.socials, whatsapp: e.target.value },
                    }))
                  }
                  placeholder="75999999999"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Lista de Links */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">
                  Botões personalizados ({config.links.length}/8)
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Adicione links para WhatsApp, grupo VIP, localização ou redes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLink}
                disabled={config.links.length >= 8}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar link
              </button>
            </div>

            {config.links.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-xs text-zinc-500">
                Nenhum link extra adicionado ainda. Seu cartão principal da vitrine já
                aparece automaticamente no topo!
              </div>
            ) : (
              <div className="space-y-3">
                {config.links.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-zinc-500">
                        Link #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveLink(idx, -1)}
                          disabled={idx === 0}
                          className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                          title="Subir"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveLink(idx, 1)}
                          disabled={idx === config.links.length - 1}
                          className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                          title="Descer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(item.id)}
                          className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <input
                        type="text"
                        maxLength={40}
                        value={item.title}
                        onChange={(e) =>
                          handleUpdateLink(item.id, { title: e.target.value })
                        }
                        placeholder="Título (máx. 40 caracteres)"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        maxLength={60}
                        value={item.subtitle || ''}
                        onChange={(e) =>
                          handleUpdateLink(item.id, { subtitle: e.target.value })
                        }
                        placeholder="Subtítulo opcional (máx. 60)"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) =>
                          handleUpdateLink(item.id, { url: e.target.value })
                        }
                        placeholder="https://..."
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none sm:col-span-7"
                      />
                      <select
                        value={item.icon}
                        onChange={(e) =>
                          handleUpdateLink(item.id, {
                            icon: e.target.value as BioLinkIcon,
                          })
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none sm:col-span-5"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(item.highlighted)}
                        onChange={(e) =>
                          handleUpdateLink(item.id, {
                            highlighted: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 accent-zinc-900"
                      />
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Destacar botão com a cor da loja
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${palette.primaryBg} ${palette.buttonText} ${palette.primaryHover}`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Links da Bio
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Desktop */}
        <div className="hidden lg:sticky lg:top-20 lg:col-span-5 lg:block">
          {phonePreviewNode}
        </div>
      </div>

      {/* Modal Preview Mobile */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs lg:hidden">
          <div className="relative w-full max-w-[360px]">
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="absolute -top-3 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md"
              aria-label="Fechar prévia"
            >
              <X className="h-4 w-4" />
            </button>
            {phonePreviewNode}
          </div>
        </div>
      )}

      {/* Modal Upgrade Plano Pro */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Publicação exclusiva do Plano Pro
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Ative o Link da Bio em vitrimini.com.br/{slug}/links
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              No Plano Essencial você pode montar e visualizar sua página de links no
              simulador à vontade. Para deixá-la pública no ar, faça o upgrade para o{' '}
              <strong>Plano Pro</strong> (a partir de R$ 39,90 por 90 dias).
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalOpen(false);
                  onRequestUpgrade();
                }}
                className="cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                Fazer upgrade para o Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
