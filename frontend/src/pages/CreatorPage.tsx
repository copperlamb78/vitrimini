import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  ImagePlus,
  Sparkles,
  Smartphone,
  PenLine,
  Loader2,
  Infinity as InfinityIcon,
  Store,
  KeyRound,
} from 'lucide-react';
import type {
  CreateCatalogResponse,
  DraftProductItem,
  RecoveredCatalogItem,
  SavedCatalogEntry,
} from '../types/catalog';
import { getTheme, THEMES, type ThemeId } from '../constants/themes';
import {
  blobToDataUrl,
  compressImage,
  dataUrlToBlob,
} from '../utils/compressImage';
import { parsePriceToCents } from '../utils/format';
import {
  createCatalog,
  getCatalogStatus,
  getSafeErrorMessage,
} from '../services/api';
import {
  dismissDraftCatalog,
  getRecentDraftsToCheck,
  getResumableDraftCatalog,
  getSavedCatalogs,
  markCatalogActive,
  mergeRecoveredCatalogs,
  saveDraftCatalog,
} from '../utils/savedCatalogs';
import { PhoneMockupPreview } from '../components/PhoneMockupPreview';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { MyCatalogsModal } from '../components/MyCatalogsModal';
import { RecoverLinksModal } from '../components/RecoverLinksModal';
import { LogoUploader } from '../components/LogoUploader';
import { ThemeSelector } from '../components/ThemeSelector';
import { DeliveryDateBuilder } from '../components/DeliveryDateBuilder';
import logoVitriMini from '../assets/logo-vitrimini.png';

const DRAFT_STORAGE_KEY = 'vitrimini_draft_v1';

interface SavedDraft {
  storeName: string;
  logoPreviewDataUrl?: string | null;
  themeColor: ThemeId;
  whatsapp: string;
  pixKey: string;
  depositPct: number;
  deliveryDates: string[];
  notes: string;
  products: Array<{
    localId: string;
    name: string;
    description: string;
    priceInput: string;
    available: boolean;
    previewDataUrl?: string;
  }>;
}

function createEmptyProduct(): DraftProductItem {
  return {
    localId: crypto.randomUUID(),
    name: '',
    description: '',
    priceInput: '',
    available: true,
  };
}

export function CreatorPage() {
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  const [storeName, setStoreName] = useState('');
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | null>(
    null
  );
  const [themeColor, setThemeColor] = useState<ThemeId>('rose');

  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [depositPct, setDepositPct] = useState<number>(50);
  const [deliveryDates, setDeliveryDates] = useState<string[]>([
    '23/12 (Qua) • Tarde',
    '24/12 (Qui) • Manhã',
  ]);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<DraftProductItem[]>([
    createEmptyProduct(),
  ]);

  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedCatalogs, setSavedCatalogs] = useState<SavedCatalogEntry[]>([]);
  const [paymentModalData, setPaymentModalData] =
    useState<CreateCatalogResponse | null>(null);
  const [paymentModalInitialPaid, setPaymentModalInitialPaid] = useState(false);
  const [myCatalogsOpen, setMyCatalogsOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);

  const activeTheme = getTheme(themeColor);

  const activeCatalogs = useMemo(
    () => savedCatalogs.filter((item) => item.status === 'ACTIVE'),
    [savedCatalogs]
  );

  // 1. Carrega rascunho de formulário + vitrines salvas e retoma cobrança pendente (< 2h)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDraft;
        if (parsed.storeName) setStoreName(parsed.storeName);
        if (parsed.logoPreviewDataUrl) {
          setLogoPreviewDataUrl(parsed.logoPreviewDataUrl);
        }
        if (parsed.themeColor && parsed.themeColor in THEMES) {
          setThemeColor(parsed.themeColor);
        }
        if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
        if (parsed.pixKey) setPixKey(parsed.pixKey);
        if (parsed.depositPct !== undefined) setDepositPct(parsed.depositPct);
        if (Array.isArray(parsed.deliveryDates)) {
          setDeliveryDates(parsed.deliveryDates);
        }
        if (parsed.notes) setNotes(parsed.notes);
        if (Array.isArray(parsed.products) && parsed.products.length > 0) {
          setProducts(parsed.products);
        }
      }
    } catch {
      // Ignora rascunho corrompido
    } finally {
      setHydrated(true);
    }

    const storedCatalogs = getSavedCatalogs();
    setSavedCatalogs(storedCatalogs);

    // Se existir cobrança Pix DRAFT nas últimas 2h não cancelada, reabre o modal automaticamente
    const resumable = getResumableDraftCatalog(storedCatalogs);
    if (resumable) {
      setPaymentModalInitialPaid(false);
      setPaymentModalData({
        catalogId: resumable.catalogId,
        slug: resumable.slug,
        editToken: resumable.editToken,
        qrCodeBase64: resumable.qrCodeBase64,
        pixCopyPaste: resumable.pixCopyPaste,
        mockMode: resumable.mockMode,
      });
      return;
    }

    // Mesmo para rascunhos fechados manualmente nas últimas 2h, verifica em background se foram pagos
    const recentDrafts = getRecentDraftsToCheck(storedCatalogs);
    for (const draft of recentDrafts) {
      void getCatalogStatus(draft.catalogId)
        .then((res) => {
          if (res.status === 'ACTIVE') {
            const updated = markCatalogActive(draft.catalogId, {
              slug: res.slug,
              editToken: res.editToken,
            });
            setSavedCatalogs(updated);
            setPaymentModalInitialPaid(true);
            setPaymentModalData({
              catalogId: draft.catalogId,
              slug: res.slug,
              editToken: res.editToken,
              qrCodeBase64: draft.qrCodeBase64,
              pixCopyPaste: draft.pixCopyPaste,
              mockMode: draft.mockMode,
            });
          }
        })
        .catch(() => {
          // Ignora falha silenciosa de rede
        });
    }
  }, []);

  // 2. Salva rascunho do formulário automaticamente no localStorage
  useEffect(() => {
    if (!hydrated) return;
    const draft: SavedDraft = {
      storeName,
      logoPreviewDataUrl,
      themeColor,
      whatsapp,
      pixKey,
      depositPct,
      deliveryDates,
      notes,
      products: products.map((p) => ({
        localId: p.localId,
        name: p.name,
        description: p.description,
        priceInput: p.priceInput,
        available: p.available,
        previewDataUrl: p.previewDataUrl,
      })),
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            ...draft,
            logoPreviewDataUrl: null,
            products: draft.products.map((p) => ({
              ...p,
              previewDataUrl: undefined,
            })),
          })
        );
      } catch {
        // Ignora
      }
    }
  }, [
    hydrated,
    storeName,
    logoPreviewDataUrl,
    themeColor,
    whatsapp,
    pixKey,
    depositPct,
    deliveryDates,
    notes,
    products,
  ]);

  async function handleLogoSelect(file: File) {
    setError(null);
    try {
      const compressed = await compressImage(file, 400);
      const dataUrl = await blobToDataUrl(compressed);
      setLogoBlob(compressed);
      setLogoPreviewDataUrl(dataUrl);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível processar a imagem selecionada. Tente outra foto.'
        )
      );
    }
  }

  function handleLogoRemove() {
    setLogoBlob(null);
    setLogoPreviewDataUrl(null);
  }

  function handleAddProduct() {
    setProducts((prev) => [...prev, createEmptyProduct()]);
  }

  function handleRemoveProduct(localId: string) {
    setProducts((prev) =>
      prev.length > 1 ? prev.filter((p) => p.localId !== localId) : prev
    );
  }

  function handleUpdateProduct(
    localId: string,
    patch: Partial<DraftProductItem>
  ) {
    setProducts((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p))
    );
  }

  async function handleImageSelect(
    localId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const compressedBlob = await compressImage(file, 800);
      const previewDataUrl = await blobToDataUrl(compressedBlob);
      handleUpdateProduct(localId, {
        blob: compressedBlob,
        previewDataUrl,
      });
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível processar a imagem selecionada. Tente outra foto.'
        )
      );
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError('Informe o nome do seu estabelecimento.');
      return;
    }

    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Informe um número de WhatsApp válido (ex: 5575999999999).');
      return;
    }

    const validProducts = products.filter((p) => p.name.trim());
    if (validProducts.length === 0) {
      setError('Adicione pelo menos 1 produto com nome e preço.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('themeColor', themeColor);
      formData.append('whatsapp', digits);
      formData.append('pixKey', pixKey.trim());
      formData.append('depositPct', String(depositPct));
      formData.append('deliveryDates', JSON.stringify(deliveryDates));
      formData.append('notes', notes.trim());

      let finalLogoBlob = logoBlob;
      if (!finalLogoBlob && logoPreviewDataUrl) {
        finalLogoBlob = await dataUrlToBlob(logoPreviewDataUrl);
      }
      if (finalLogoBlob) {
        formData.append('logo', finalLogoBlob, 'logo.webp');
      }

      const serializedProducts = [];
      for (let i = 0; i < validProducts.length; i++) {
        const p = validProducts[i];
        const fieldName = `image_${i}`;
        let imageBlob = p.blob;

        if (!imageBlob && p.previewDataUrl) {
          imageBlob = await dataUrlToBlob(p.previewDataUrl);
        }

        if (imageBlob) {
          formData.append(fieldName, imageBlob, `product_${i}.webp`);
        }

        serializedProducts.push({
          name: p.name.trim(),
          description: p.description.trim() || null,
          priceCents: parsePriceToCents(p.priceInput),
          orderIndex: i,
          available: p.available,
          imageField: imageBlob ? fieldName : undefined,
        });
      }

      formData.append('products', JSON.stringify(serializedProducts));

      const response = await createCatalog(formData);

      // Persiste imediatamente como DRAFT no localStorage antes mesmo de abrir o modal
      const updatedList = saveDraftCatalog({
        catalogId: response.catalogId,
        storeName: storeName.trim(),
        slug: response.slug,
        editToken: response.editToken,
        qrCodeBase64: response.qrCodeBase64,
        pixCopyPaste: response.pixCopyPaste,
        mockMode: response.mockMode,
      });
      setSavedCatalogs(updatedList);

      setPaymentModalInitialPaid(false);
      setPaymentModalData(response);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível publicar sua vitrine agora. Verifique sua conexão e tente novamente.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const handlePaymentConfirmed = useCallback(
    (info: { catalogId: string; slug: string; editToken: string }) => {
      const updated = markCatalogActive(info.catalogId, {
        slug: info.slug,
        editToken: info.editToken,
      });
      setSavedCatalogs(updated);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    },
    []
  );

  function handleCancelDraft(catalogId: string) {
    const updated = dismissDraftCatalog(catalogId);
    setSavedCatalogs(updated);
    setPaymentModalData(null);
  }

  function handleRecoveredCatalogs(items: RecoveredCatalogItem[]) {
    const updated = mergeRecoveredCatalogs(items);
    setSavedCatalogs(updated);
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Top Navbar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <img
              src={logoVitriMini}
              alt="VitriMini"
              className="h-9 w-auto object-contain sm:h-10"
            />
            <span className="hidden border-l border-stone-200 pl-3 text-xs text-stone-500 sm:inline">
              Sua vitrine de encomendas em 2 minutos
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1 mr-2 text-xs font-semibold text-stone-700 xl:flex">
              <InfinityIcon className="h-4 w-4 text-emerald-600" />
              Produtos ilimitados • Pagamento único de R$ 24,90
            </span>

            {activeCatalogs.length > 0 && (
              <button
                type="button"
                onClick={() => setMyCatalogsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                <Store className="h-3.5 w-3.5" />
                Minhas Vitrines ({activeCatalogs.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setRecoverOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              <KeyRound className="h-3.5 w-3.5 text-stone-500" />
              Já paguei / Recuperar meus links
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Proposta de Valor */}
      <div className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-2 text-center text-xs font-semibold text-emerald-900 xl:hidden">
        Produtos ilimitados • Pagamento único de R$ 24,90 • Sem mensalidade
      </div>

      {/* Mobile Tabs */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white px-4 py-2 lg:hidden">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              mobileTab === 'edit'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500'
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              mobileTab === 'preview'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Ver Prévia
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Form */}
          <form
            onSubmit={handlePublish}
            className={`space-y-6 lg:col-span-7 ${
              mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* 1. Identidade e Dados da Loja */}
            <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  1. Identidade e Dados da Vitrine
                </h2>
                <p className="text-xs text-stone-500">
                  Personalize com sua foto, cor da marca e dados para receber os pedidos.
                </p>
              </div>

              <LogoUploader
                storeName={storeName}
                imageSrc={logoPreviewDataUrl}
                theme={activeTheme}
                onSelectFile={handleLogoSelect}
                onRemove={handleLogoRemove}
              />

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Cor do Tema da Vitrine
                </label>
                <ThemeSelector value={themeColor} onChange={setThemeColor} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Nome da Loja / Confeitaria *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Doces da Maria"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    WhatsApp para Pedidos *
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="5575999999999"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                  <p className="mt-1 text-[11px] text-stone-400">
                    DDI + DDD + número (somente números)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Sua Chave Pix (para receber sinal)
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, E-mail, Celular ou Aleatória"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Porcentagem de Sinal na Encomenda
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {[
                      { value: 0, label: '0% (Sem sinal)' },
                      { value: 50, label: '50% de sinal' },
                      { value: 100, label: '100% antecipado' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDepositPct(opt.value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          depositPct === opt.value
                            ? `${activeTheme.softBorder} ${activeTheme.softBg} ${activeTheme.softText}`
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Datas e Turnos de Entrega / Retirada
                  </label>
                  <DeliveryDateBuilder
                    value={deliveryDates}
                    onChange={setDeliveryDates}
                    theme={activeTheme}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Regras / Avisos da Loja (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Encomendas até dia 20/12. Retirada no Centro ou taxa de entrega sob consulta."
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              </div>
            </section>

            {/* 2. Produtos Ilimitados */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    2. Produtos da Vitrine ({products.length})
                  </h2>
                  <p className="text-xs text-stone-500">
                    Cadastre quantos itens quiser — produtos ilimitados no seu VitriMini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition ${activeTheme.softBg} ${activeTheme.softText}`}
                >
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {products.map((product, index) => (
                  <div
                    key={product.localId}
                    className="rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
                        Produto #{index + 1}
                      </span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.localId)}
                          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-white text-center transition hover:border-stone-500">
                        {product.previewDataUrl ? (
                          <img
                            src={product.previewDataUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5 text-stone-400 group-hover:text-stone-700" />
                            <span className="mt-1 text-[10px] font-medium text-stone-500">
                              Foto
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(product.localId, e)}
                          className="hidden"
                        />
                      </label>

                      <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Nome do produto *"
                            value={product.name}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                name: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Preço (ex: 89,90)"
                            value={product.priceInput}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                priceInput: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Descrição curta (ex: Serve 10 pessoas, massa de chocolate...)"
                            value={product.description}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                description: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddProduct}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-xs font-bold text-stone-600 hover:border-stone-500 hover:bg-stone-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar mais um produto (sem limite)
              </button>
            </section>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold shadow-lg transition disabled:opacity-60 ${activeTheme.primaryBg} ${activeTheme.primaryHover} ${activeTheme.buttonText} ${activeTheme.shadowColor}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando sua vitrine e Pix...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Publicar Vitrine (R$ 24,90 único)
                  </>
                )}
              </button>
              <p className="text-center text-xs text-stone-500">
                Produtos ilimitados • Pagamento único de R$ 24,90 • Válida por 90 dias
              </p>
            </div>
          </form>

          {/* Right Column: Live Phone Mockup */}
          <div
            className={`lg:col-span-5 ${
              mobileTab === 'edit' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="lg:sticky lg:top-6">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
                Prévia ao vivo • VitriMini
              </p>
              <PhoneMockupPreview
                storeName={storeName}
                logoPreviewUrl={logoPreviewDataUrl}
                themeColor={themeColor}
                notes={notes}
                deliveryDates={deliveryDates}
                depositPct={depositPct}
                products={products}
              />
            </div>
          </div>
        </div>

        {/* Rodapé com marca e atalho discreto para recuperação */}
        <footer className="mt-12 flex flex-col items-center gap-3 border-t border-stone-200 pt-6 text-center">
          <img
            src={logoVitriMini}
            alt="VitriMini"
            className="h-6 w-auto object-contain opacity-75"
          />
          <button
            type="button"
            onClick={() => setRecoverOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Já paguei / Recuperar meus links da VitriMini
          </button>
        </footer>
      </main>

      {paymentModalData && (
        <PixPaymentModal
          paymentData={paymentModalData}
          initialPaid={paymentModalInitialPaid}
          onCancelDraft={handleCancelDraft}
          onCloseAfterPaid={() => setPaymentModalData(null)}
          onConfirmed={handlePaymentConfirmed}
        />
      )}

      {myCatalogsOpen && (
        <MyCatalogsModal
          catalogs={activeCatalogs}
          onClose={() => setMyCatalogsOpen(false)}
        />
      )}

      {recoverOpen && (
        <RecoverLinksModal
          onClose={() => setRecoverOpen(false)}
          onRecovered={handleRecoveredCatalogs}
        />
      )}
    </div>
  );
}
