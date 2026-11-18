import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Save,
  Plus,
  Trash2,
  ExternalLink,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Catalog } from '../types/catalog';
import {
  getTheme,
  THEMES,
  type ThemeId,
} from '../constants/themes';
import {
  getManageCatalog,
  getSafeErrorMessage,
  updateManageCatalog,
} from '../services/api';
import {
  centsToPriceInput,
  parsePriceToCents,
  resolveImageUrl,
} from '../utils/format';
import { blobToDataUrl, compressImage } from '../utils/compressImage';
import { LogoUploader } from '../components/LogoUploader';
import { ThemeSelector } from '../components/ThemeSelector';
import { DeliveryDateBuilder } from '../components/DeliveryDateBuilder';
import logoVitriMini from '../assets/logo-vitrimini.png';

interface EditableProduct {
  id?: string;
  localId: string;
  name: string;
  description: string;
  priceInput: string;
  available: boolean;
  imageUrl: string | null;
  previewDataUrl?: string;
  blob?: Blob;
}

export function ManagePage() {
  const { editToken } = useParams<{ editToken: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const [catalogMeta, setCatalogMeta] = useState<Pick<
    Catalog,
    'id' | 'slug' | 'status'
  > | null>(null);

  const [storeName, setStoreName] = useState('');
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | null>(
    null
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeId>('rose');

  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [depositPct, setDepositPct] = useState(50);
  const [deliveryDates, setDeliveryDates] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<EditableProduct[]>([]);

  const activeTheme = getTheme(themeColor);

  useEffect(() => {
    if (!editToken) return;
    setLoading(true);
    setError(null);

    getManageCatalog(editToken)
      .then((data) => {
        setCatalogMeta({ id: data.id, slug: data.slug, status: data.status });
        setStoreName(data.storeName);
        setExistingLogoUrl(data.logoUrl);
        setThemeColor(
          data.themeColor && data.themeColor in THEMES
            ? (data.themeColor as ThemeId)
            : 'rose'
        );
        setWhatsapp(data.whatsapp);
        setPixKey(data.pixKey || '');
        setDepositPct(data.depositPct);
        setDeliveryDates(data.deliveryDates);
        setNotes(data.notes || '');
        setProducts(
          data.products.map((p) => ({
            id: p.id,
            localId: p.id,
            name: p.name,
            description: p.description || '',
            priceInput: centsToPriceInput(p.priceCents),
            available: p.available,
            imageUrl: p.imageUrl,
          }))
        );
      })
      .catch((err) => {
        setError(
          getSafeErrorMessage(
            err,
            'Não foi possível carregar o painel de edição agora. Verifique sua conexão.'
          )
        );
      })
      .finally(() => setLoading(false));
  }, [editToken]);

  async function handleLogoSelect(file: File) {
    setError(null);
    try {
      const compressed = await compressImage(file, 400);
      const dataUrl = await blobToDataUrl(compressed);
      setLogoBlob(compressed);
      setLogoPreviewDataUrl(dataUrl);
      setRemoveLogo(false);
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
    setExistingLogoUrl(null);
    setRemoveLogo(true);
  }

  function handleAddProduct() {
    setProducts((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        name: '',
        description: '',
        priceInput: '',
        available: true,
        imageUrl: null,
      },
    ]);
  }

  function handleRemoveProduct(localId: string) {
    setProducts((prev) =>
      prev.length > 1 ? prev.filter((p) => p.localId !== localId) : prev
    );
  }

  function handleUpdateProduct(
    localId: string,
    patch: Partial<EditableProduct>
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editToken) return;

    setSaving(true);
    setError(null);
    setSavedNotice(false);

    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('themeColor', themeColor);
      formData.append('whatsapp', whatsapp.replace(/\D/g, ''));
      formData.append('pixKey', pixKey.trim());
      formData.append('depositPct', String(depositPct));
      formData.append('deliveryDates', JSON.stringify(deliveryDates));
      formData.append('notes', notes.trim());

      if (logoBlob) {
        formData.append('logo', logoBlob, 'logo.webp');
      } else if (removeLogo) {
        formData.append('removeLogo', 'true');
      }

      const validProducts = products.filter((p) => p.name.trim());
      const serialized = validProducts.map((p, idx) => {
        const fieldName = `image_${idx}`;
        if (p.blob) {
          formData.append(fieldName, p.blob, `product_${idx}.webp`);
        }
        return {
          id: p.id,
          name: p.name.trim(),
          description: p.description.trim() || null,
          priceCents: parsePriceToCents(p.priceInput),
          available: p.available,
          orderIndex: idx,
          imageUrl: p.imageUrl,
          imageField: p.blob ? fieldName : undefined,
        };
      });

      formData.append('products', JSON.stringify(serialized));

      const updated = await updateManageCatalog(editToken, formData);
      setExistingLogoUrl(updated.logoUrl);
      setLogoBlob(null);
      setLogoPreviewDataUrl(null);
      setRemoveLogo(false);
      setProducts(
        updated.products.map((p) => ({
          id: p.id,
          localId: p.id,
          name: p.name,
          description: p.description || '',
          priceInput: centsToPriceInput(p.priceCents),
          available: p.available,
          imageUrl: p.imageUrl,
        }))
      );
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-700" />
      </div>
    );
  }

  if (error && !catalogMeta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-stone-900">
          Link de edição inválido
        </h1>
        <p className="mt-1 max-w-sm text-sm text-stone-500">{error}</p>
        <Link
          to="/"
          className="mt-5 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Ir para o VitriMini
        </Link>
      </div>
    );
  }

  const publicLink = catalogMeta
    ? `/c/${catalogMeta.slug}${catalogMeta.status !== 'ACTIVE' ? '?preview=true' : ''}`
    : '/';

  const displayedLogo =
    logoPreviewDataUrl ||
    (!removeLogo ? resolveImageUrl(existingLogoUrl) : null);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="shrink-0">
              <img
                src={logoVitriMini}
                alt="VitriMini"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <div className="min-w-0 border-l border-stone-200 pl-3">
              <span
                className={`block text-[10px] font-bold uppercase tracking-wider ${activeTheme.primaryText}`}
              >
                Painel de Edição Rápida
              </span>
              <h1 className="truncate text-sm font-extrabold text-stone-900 sm:text-base">
                {storeName || 'Minha Vitrine'}
              </h1>
            </div>
          </div>
          <a
            href={publicLink}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            Ver Vitrine
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-3xl px-4">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Produtos - Foco em pausar/reativar e editar preço rapidamente */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Produtos ({products.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Pause itens esgotados ou adicione novos produtos sem limites.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddProduct}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${activeTheme.softBg} ${activeTheme.softText}`}
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {products.map((product) => {
                const displayImg =
                  product.previewDataUrl || resolveImageUrl(product.imageUrl);

                return (
                  <div
                    key={product.localId}
                    className={`rounded-xl border p-3.5 transition ${
                      product.available
                        ? 'border-stone-200 bg-white'
                        : 'border-stone-200 bg-stone-100/70'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2.5">
                      {/* Switch Pausar / Disponível */}
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.available}
                          onClick={() =>
                            handleUpdateProduct(product.localId, {
                              available: !product.available,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            product.available ? 'bg-emerald-600' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-xs transition-transform ${
                              product.available
                                ? 'translate-x-5.5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-bold ${
                            product.available
                              ? 'text-emerald-700'
                              : 'text-stone-500'
                          }`}
                        >
                          {product.available
                            ? 'Disponível'
                            : 'Pausado (Esgotado)'}
                        </span>
                      </label>

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
                      <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:border-stone-500">
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlus className="h-5 w-5 text-stone-400" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(product.localId, e)}
                          className="hidden"
                        />
                      </label>

                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Nome do produto"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={product.priceInput}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                priceInput: e.target.value,
                              })
                            }
                            placeholder="Preço"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={product.description}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Descrição"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Identidade Visual, Loja & Datas */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Identidade, Loja e Datas Disponíveis
            </h2>

            <LogoUploader
              storeName={storeName}
              imageSrc={displayedLogo}
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
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Sinal (%)
                </label>
                <select
                  value={depositPct}
                  onChange={(e) => setDepositPct(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                >
                  <option value={0}>0% (Sem sinal)</option>
                  <option value={50}>50% de sinal</option>
                  <option value={100}>100% antecipado</option>
                </select>
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
                  Avisos / Regras
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {savedNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Alterações salvas com sucesso! Sua VitriMini já foi atualizada.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold shadow-lg transition disabled:opacity-60 ${activeTheme.primaryBg} ${activeTheme.primaryHover} ${activeTheme.buttonText} ${activeTheme.shadowColor}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando alterações...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Salvar Alterações
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
