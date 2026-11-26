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
  ImagePlus,
  LayoutGrid,
  Link2,
  Loader2,
  Palette,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BioLinkIcon,
  BioLinkItem,
  BioLinksBannerStyle,
  BioLinksConfig,
  ButtonFill,
  ButtonShape,
  NichePreset,
  Product,
  StoreAppearanceConfig,
} from '../types/catalog';
import { getSafeErrorMessage, updateCatalogById } from '../services/api';
import {
  hexToRgba,
  isSafeHttpUrl,
  normalizeBioLinksConfig,
} from '../utils/bioLinks';
import {
  resolveStoreTheme,
  resolveVitriLinkAppearance,
} from '../utils/storeTheme';
import { blobToDataUrl, compressImage } from '../utils/compressImage';
import { resolveImageUrl } from '../utils/format';
import { SettingsSectionCard } from './SettingsSectionCard';
import { AppearanceControls } from './AppearanceControls';
import { VitriLinkRenderer } from './VitriLinkRenderer';

interface BioLinksTabProps {
  catalogId: string;
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  themeColor: string;
  storeAppearance?: StoreAppearanceConfig | null;
  notes?: string | null;
  hasProAccess: boolean;
  initialConfig: BioLinksConfig;
  products: Array<
    Pick<Product, 'id' | 'name' | 'priceCents' | 'imageUrl' | 'available'>
  >;
  onConfigSaved: (config: BioLinksConfig) => void;
  onRequestUpgrade: () => void;
}

type AccordionSection = 'appearance' | 'storefront' | 'links';

const ICON_OPTIONS: Array<{ value: BioLinkIcon; label: string }> = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'maps', label: 'Localização / Mapa' },
  { value: 'catalog', label: 'Vitrine / Cardápio' },
  { value: 'vip', label: 'Grupo VIP / Oferta' },
  { value: 'link', label: 'Link genérico' },
];

const BANNER_STYLE_OPTIONS: Array<{
  value: BioLinksBannerStyle;
  label: string;
  desc: string;
}> = [
  { value: 'none', label: 'Sem banner', desc: 'Logo centralizada' },
  {
    value: 'brand-gradient',
    label: 'Degradê da loja',
    desc: 'Usa a cor da vitrine',
  },
  { value: 'image', label: 'Imagem', desc: 'Foto de capa' },
];

const SHAPE_LABELS: Record<ButtonShape, string> = {
  professional: 'Profissional',
  modern: 'Moderno',
  relaxed: 'Descontraído',
};

const FILL_LABELS: Record<ButtonFill, string> = {
  solid: 'Sólido',
  outline: 'Contorno',
};

const NICHE_LABELS: Record<NichePreset, string> = {
  default: 'Padrão',
  bakery: 'Confeitaria',
  petshop: 'Petshop',
  fashion: 'Moda',
  delivery: 'Delivery',
};

export function BioLinksTab({
  catalogId,
  slug,
  storeName,
  logoUrl,
  themeColor,
  storeAppearance,
  notes,
  hasProAccess,
  initialConfig,
  products,
  onConfigSaved,
  onRequestUpgrade,
}: BioLinksTabProps) {
  const [config, setConfig] = useState<BioLinksConfig>(() =>
    normalizeBioLinksConfig(initialConfig)
  );
  const [openSections, setOpenSections] = useState<
    Record<AccordionSection, boolean>
  >({
    appearance: true,
    storefront: false,
    links: false,
  });

  const [bannerFile, setBannerFile] = useState<Blob | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [linkImageFiles, setLinkImageFiles] = useState<Record<string, Blob>>(
    {}
  );
  const [linkPreviewUrls, setLinkPreviewUrls] = useState<
    Record<string, string>
  >({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const publicLinksUrl = `https://vitrimini.com.br/${slug}/links`;

  const resolvedStore = resolveStoreTheme(themeColor, storeAppearance);
  const resolvedVitriLink = resolveVitriLinkAppearance(
    themeColor,
    storeAppearance,
    config
  );
  const accentColor = resolvedVitriLink.primaryColor;
  const accentTextColor = resolvedVitriLink.textOnPrimary;

  const inheritStoreTheme = config.inheritStoreTheme !== false;

  const customAppearanceValue: StoreAppearanceConfig = {
    bgColor: config.bgColor || resolvedStore.bgColor,
    primaryColor: config.primaryColor || resolvedStore.primaryColor,
    buttonShape: config.buttonShape || resolvedStore.buttonShape,
    buttonFill: config.buttonFill || resolvedStore.buttonFill,
    nichePreset: config.nichePreset || resolvedStore.nichePreset,
  };

  function toggleSection(section: AccordionSection) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function getActiveCardStyle(selected: boolean): React.CSSProperties | undefined {
    if (!selected) return undefined;
    return {
      borderColor: accentColor,
      backgroundColor: hexToRgba(accentColor, 0.08),
    };
  }

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

  async function handleBannerFileChange(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImage(file, 1200);
      const preview = await blobToDataUrl(compressed);
      setBannerFile(compressed);
      setBannerPreviewUrl(preview);
      setConfig((prev) => ({ ...prev, bannerStyle: 'image' }));
    } catch {
      setError('Não foi possível processar a imagem de capa selecionada.');
    }
  }

  function handleRemoveBannerImage() {
    setBannerFile(null);
    setBannerPreviewUrl(null);
    setConfig((prev) => ({
      ...prev,
      bannerUrl: undefined,
      bannerStyle:
        prev.bannerStyle === 'image' ? 'brand-gradient' : prev.bannerStyle,
    }));
  }

  async function handleLinkImageChange(linkId: string, file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImage(file, 400);
      const preview = await blobToDataUrl(compressed);
      setLinkImageFiles((prev) => ({ ...prev, [linkId]: compressed }));
      setLinkPreviewUrls((prev) => ({ ...prev, [linkId]: preview }));
    } catch {
      setError('Não foi possível processar a miniatura selecionada.');
    }
  }

  function handleRemoveLinkImage(linkId: string) {
    setLinkImageFiles((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
    setLinkPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
    handleUpdateLink(linkId, { imageUrl: undefined });
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
      layout: 'compact',
    };
    setConfig((prev) => ({ ...prev, links: [...prev.links, newItem] }));
    setOpenSections((prev) => ({ ...prev, links: true }));
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
    setLinkImageFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLinkPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
          `O endereço do link "${item.title.trim()}" deve começar com https:// ou http://.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload: BioLinksConfig = {
        ...config,
        enabled: hasProAccess ? config.enabled : false,
        inheritStoreTheme: config.inheritStoreTheme !== false,
        nichePreset: config.nichePreset || 'default',
        bannerStyle: config.bannerStyle || 'none',
        bannerUrl:
          config.bannerStyle === 'image' ? config.bannerUrl : undefined,
        links: config.links.map((l) => ({
          ...l,
          title: l.title.trim().slice(0, 40),
          subtitle: l.subtitle?.trim()
            ? l.subtitle.trim().slice(0, 60)
            : undefined,
          url: l.url.trim(),
          layout: l.layout === 'featured-card' ? 'featured-card' : 'compact',
          imageUrl: l.layout === 'featured-card' ? l.imageUrl : undefined,
        })),
      };

      const formData = new FormData();
      formData.append('bioLinksConfig', JSON.stringify(payload));

      if (bannerFile && payload.bannerStyle === 'image') {
        formData.append('bioBanner', bannerFile, 'bio-banner.webp');
      }

      for (const link of payload.links) {
        const file = linkImageFiles[link.id];
        if (file && link.layout === 'featured-card') {
          formData.append(
            `bioLinkImage_${link.id}`,
            file,
            `bio-link-${link.id}.webp`
          );
        }
      }

      const updatedCatalog = await updateCatalogById(catalogId, formData);
      const savedConfig = normalizeBioLinksConfig(
        updatedCatalog?.bioLinksConfig || payload
      );

      setConfig(savedConfig);
      setBannerFile(null);
      setBannerPreviewUrl(null);
      setLinkImageFiles({});
      setLinkPreviewUrls({});
      onConfigSaved(savedConfig);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível salvar as configurações do VitriLink.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const currentBannerPreview =
    bannerPreviewUrl || resolveImageUrl(config.bannerUrl) || null;

  const phonePreviewNode = (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.5rem] border-[8px] border-zinc-900 bg-zinc-50 shadow-2xl">
      <div className="flex justify-center bg-zinc-900 pb-2 pt-1">
        <div className="h-4 w-24 rounded-full bg-zinc-800" />
      </div>
      <div className="h-[560px] overflow-y-auto">
        <VitriLinkRenderer
          slug={slug}
          storeName={storeName}
          logoUrl={logoUrl}
          themeColor={themeColor}
          storeAppearance={storeAppearance}
          notes={notes}
          config={config}
          products={products}
          isPreview
          bannerPreviewUrl={bannerPreviewUrl}
          linkPreviewUrls={linkPreviewUrls}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          {/* Botão preview mobile */}
          <div className="flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(true)}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition hover:bg-zinc-50"
            >
              <Eye className="h-4 w-4" />
              Prévia do VitriLink
            </button>
          </div>

          {!hasProAccess && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-start gap-2.5">
                <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Recurso exclusivo do Plano Pro</p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Você pode montar e testar o visual do seu VitriLink aqui no
                    simulador livremente. Para publicar o endereço na sua bio,
                    faça o upgrade para o Plano Pro.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestUpgrade}
                className="min-h-[44px] cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
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
              <span>VitriLink salvo com sucesso!</span>
            </div>
          )}

          {/* Card Link Público + Ativação */}
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-zinc-900">
                  VitriLink
                </h2>
                <p className="text-xs text-zinc-500">
                  Sua página de links conectada diretamente à sua vitrine.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.enabled}
                onClick={handleToggleEnabled}
                style={{
                  backgroundColor: config.enabled ? accentColor : undefined,
                }}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition ${
                  config.enabled ? '' : 'bg-zinc-300'
                }`}
                aria-label="Ativar VitriLink"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xs transition ${
                    config.enabled ? 'translate-x-7' : 'translate-x-1'
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
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
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
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bloco 1: Aparência & Capa */}
          <SettingsSectionCard
            title="Aparência & Capa"
            subtitle={
              inheritStoreTheme
                ? 'Herdando visual da Vitrine'
                : 'Visual personalizado do VitriLink'
            }
            icon={<Palette className="h-5 w-5" />}
            isOpen={openSections.appearance}
            onToggle={() => toggleSection('appearance')}
          >
            <div className="space-y-5">
              {/* Toggle Usar visual da Vitrine */}
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <div>
                  <p className="text-xs font-bold text-zinc-900">
                    Usar visual da Vitrine
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Mantém fundo, botões e estilo iguais aos da sua vitrine
                    automaticamente.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={inheritStoreTheme}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      inheritStoreTheme: e.target.checked,
                    }))
                  }
                  style={{ accentColor }}
                  className="h-5 w-5 shrink-0 cursor-pointer"
                />
              </label>

              {inheritStoreTheme ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Visual herdado da Vitrine
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-zinc-700">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 font-medium">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-zinc-300"
                        style={{ backgroundColor: resolvedStore.bgColor }}
                      />
                      Fundo
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 font-medium">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: resolvedStore.primaryColor }}
                      />
                      Botões: {SHAPE_LABELS[resolvedStore.buttonShape]} ·{' '}
                      {FILL_LABELS[resolvedStore.buttonFill]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 font-medium">
                      Estilo: {NICHE_LABELS[resolvedStore.nichePreset]}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <AppearanceControls
                    value={customAppearanceValue}
                    onChange={(next) =>
                      setConfig((prev) => ({
                        ...prev,
                        bgColor: next.bgColor,
                        primaryColor: next.primaryColor,
                        buttonShape: next.buttonShape,
                        buttonFill: next.buttonFill,
                        nichePreset: next.nichePreset,
                      }))
                    }
                  />
                </div>
              )}

              {/* Banner de Capa */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-zinc-900">
                  Banner de Capa
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {BANNER_STYLE_OPTIONS.map((opt) => {
                    const selected =
                      (config.bannerStyle || 'none') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            bannerStyle: opt.value,
                          }))
                        }
                        style={getActiveCardStyle(selected)}
                        className={`min-h-[44px] cursor-pointer rounded-xl border p-3 text-left transition ${
                          selected
                            ? 'shadow-2xs'
                            : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-900">
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {(config.bannerStyle || 'none') === 'image' && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                    {currentBannerPreview ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={currentBannerPreview}
                            alt="Prévia da capa"
                            className="h-14 w-24 rounded-lg border border-zinc-200 object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-800">
                              Imagem de capa selecionada
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              Otimizada automaticamente para carregar rápido.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100">
                            <ImagePlus className="h-3.5 w-3.5" />
                            Trocar imagem
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                handleBannerFileChange(
                                  e.target.files?.[0] || null
                                );
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveBannerImage}
                            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center transition hover:border-zinc-400">
                        <ImagePlus className="h-5 w-5 text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-800">
                          Enviar imagem de capa
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Recomendado: foto horizontal da sua loja ou produtos
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handleBannerFileChange(e.target.files?.[0] || null);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SettingsSectionCard>

          {/* Bloco 2: Vitrine & Redes */}
          <SettingsSectionCard
            title="Vitrine & Redes"
            subtitle={
              config.showFeaturedProducts
                ? 'Produtos em destaque visíveis • Redes sociais'
                : 'Destaques ocultos • Redes sociais'
            }
            icon={<Share2 className="h-5 w-5" />}
            isOpen={openSections.storefront}
            onToggle={() => toggleSection('storefront')}
          >
            <div className="space-y-4">
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <div>
                  <p className="text-xs font-bold text-zinc-900">
                    Exibir até 3 produtos em destaque no card da vitrine
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Mostra miniaturas com preço dentro do botão principal da
                    vitrine.
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
                  style={{ accentColor }}
                  className="h-5 w-5 shrink-0 cursor-pointer"
                />
              </label>

              <div>
                <h4 className="mb-2 text-xs font-extrabold text-zinc-900">
                  Barra de redes sociais (opcional)
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">
                      Instagram (@ ou link)
                    </label>
                    <input
                      type="text"
                      value={config.socials.instagram || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          socials: {
                            ...prev.socials,
                            instagram: e.target.value,
                          },
                        }))
                      }
                      placeholder="@sualoja"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">
                      TikTok (@ ou link)
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
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
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
                          socials: {
                            ...prev.socials,
                            whatsapp: e.target.value,
                          },
                        }))
                      }
                      placeholder="75999999999"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </SettingsSectionCard>

          {/* Bloco 3: Meus Links */}
          <SettingsSectionCard
            title={`Meus Links (${config.links.length}/8)`}
            subtitle="Botões personalizados, cartões com foto e ordem"
            icon={<LayoutGrid className="h-5 w-5" />}
            isOpen={openSections.links}
            onToggle={() => toggleSection('links')}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-zinc-500">
                  Adicione links para WhatsApp, grupo VIP, localização ou redes.
                </p>
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={config.links.length >= 8}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar link
                </button>
              </div>

              {config.links.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-xs text-zinc-500">
                  Nenhum link extra adicionado ainda. Seu cartão principal da
                  vitrine já aparece automaticamente no topo!
                </div>
              ) : (
                <div className="space-y-3">
                  {config.links.map((item, idx) => {
                    const isFeaturedCard = item.layout === 'featured-card';
                    const currentLinkThumb =
                      linkPreviewUrls[item.id] || resolveImageUrl(item.imageUrl);

                    return (
                      <div
                        key={item.id}
                        className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5"
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
                              className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                              title="Subir"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveLink(idx, 1)}
                              disabled={idx === config.links.length - 1}
                              className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                              title="Descer"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(item.id)}
                              className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg p-1.5 text-red-500 hover:bg-red-50"
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
                              handleUpdateLink(item.id, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Título (máx. 40 caracteres)"
                            className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                          />
                          <input
                            type="text"
                            maxLength={60}
                            value={item.subtitle || ''}
                            onChange={(e) =>
                              handleUpdateLink(item.id, {
                                subtitle: e.target.value,
                              })
                            }
                            placeholder="Subtítulo opcional (máx. 60)"
                            className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
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
                            className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none sm:col-span-7"
                          />
                          <select
                            value={item.icon}
                            onChange={(e) =>
                              handleUpdateLink(item.id, {
                                icon: e.target.value as BioLinkIcon,
                              })
                            }
                            className="min-h-[44px] cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none sm:col-span-5"
                          >
                            {ICON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700">
                            <input
                              type="checkbox"
                              checked={Boolean(item.highlighted)}
                              onChange={(e) =>
                                handleUpdateLink(item.id, {
                                  highlighted: e.target.checked,
                                })
                              }
                              style={{ accentColor }}
                              className="h-4 w-4 cursor-pointer"
                            />
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Destacar botão com a cor da loja
                          </label>

                          <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700">
                            <input
                              type="checkbox"
                              checked={isFeaturedCard}
                              onChange={(e) =>
                                handleUpdateLink(item.id, {
                                  layout: e.target.checked
                                    ? 'featured-card'
                                    : 'compact',
                                })
                              }
                              style={{ accentColor }}
                              className="h-4 w-4 cursor-pointer"
                            />
                            Cartão com foto
                          </label>
                        </div>

                        {isFeaturedCard && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                            <div className="flex items-center gap-2.5">
                              {currentLinkThumb ? (
                                <img
                                  src={currentLinkThumb}
                                  alt={item.title || 'Miniatura'}
                                  className="h-11 w-11 rounded-lg border border-zinc-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                                  <ImagePlus className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-zinc-800">
                                  Foto do cartão (opcional)
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  Sem foto, usamos o ícone escolhido acima.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-[11px] font-bold text-zinc-800 transition hover:bg-zinc-100">
                                <ImagePlus className="h-3.5 w-3.5" />
                                {currentLinkThumb
                                  ? 'Trocar foto'
                                  : 'Enviar foto'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    handleLinkImageChange(
                                      item.id,
                                      e.target.files?.[0] || null
                                    );
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              {currentLinkThumb && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLinkImage(item.id)}
                                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SettingsSectionCard>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: accentColor,
                color: accentTextColor,
              }}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar VitriLink
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
              className="absolute -top-3 right-0 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-zinc-900 shadow-md"
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
                    Ative seu VitriLink em vitrimini.com.br/{slug}/links
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              No Plano Essencial você pode montar e visualizar seu VitriLink no
              simulador à vontade. Para deixá-lo público no ar, faça o upgrade
              para o <strong>Plano Pro</strong> (a partir de R$ 14,90/mês).
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="min-h-[44px] cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalOpen(false);
                  onRequestUpgrade();
                }}
                className="min-h-[44px] cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
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
