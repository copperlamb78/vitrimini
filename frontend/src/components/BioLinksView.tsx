import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ExternalLink,
  Instagram,
  Link2,
  MapPin,
  MessageCircle,
  Music2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { BioLinkIcon, BioLinksConfig, Product } from '../types/catalog';
import { getStoreInitials, getTheme } from '../constants/themes';
import { formatCurrency, resolveImageUrl } from '../utils/format';
import {
  getContrastTextColor,
  isSafeHttpUrl,
  resolveSocialUrl,
} from '../utils/bioLinks';

interface BioLinksViewProps {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  themeColor?: string | null;
  notes?: string | null;
  config: BioLinksConfig;
  products?: Array<Pick<Product, 'id' | 'name' | 'priceCents' | 'imageUrl' | 'available'>>;
  isPreview?: boolean;
}

function renderLinkIcon(icon: BioLinkIcon, className: string) {
  switch (icon) {
    case 'whatsapp':
      return <MessageCircle className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <Music2 className={className} />;
    case 'maps':
      return <MapPin className={className} />;
    case 'catalog':
      return <ShoppingBag className={className} />;
    case 'vip':
      return <Sparkles className={className} />;
    case 'link':
    default:
      return <Link2 className={className} />;
  }
}

export function BioLinksView({
  slug,
  storeName,
  logoUrl,
  themeColor,
  notes,
  config,
  products = [],
  isPreview = false,
}: BioLinksViewProps) {
  const palette = getTheme(themeColor);
  const contrastText = getContrastTextColor(palette.hex);
  const initials = getStoreInitials(storeName || 'VitriMini');
  const resolvedLogo = resolveImageUrl(logoUrl);
  const isDark = config.theme === 'dark-glass';

  const featuredProducts = config.showFeaturedProducts
    ? products.filter((p) => p.available !== false).slice(0, 3)
    : [];

  const instagramHref = resolveSocialUrl('instagram', config.socials?.instagram);
  const tiktokHref = resolveSocialUrl('tiktok', config.socials?.tiktok);
  const whatsappHref = resolveSocialUrl('whatsapp', config.socials?.whatsapp);
  const hasSocials = Boolean(instagramHref || tiktokHref || whatsappHref);

  const containerBgStyle =
    config.theme === 'brand-soft'
      ? {
          backgroundColor: '#FAFAFA',
          backgroundImage: `radial-gradient(circle at 50% 0%, ${palette.hex}22 0%, rgba(250,250,250,0) 62%)`,
        }
      : config.theme === 'dark-glass'
        ? { backgroundColor: '#09090B' }
        : { backgroundColor: '#FAFAFA' };

  const buttonRadiusClass =
    config.buttonStyle === 'pill'
      ? 'rounded-full'
      : config.buttonStyle === 'outline'
        ? 'rounded-xl'
        : 'rounded-2xl';

  const shortDescription = notes?.trim()
    ? notes.trim().slice(0, 140) + (notes.trim().length > 140 ? '...' : '')
    : null;

  return (
    <div
      style={containerBgStyle}
      className={`flex min-h-full w-full flex-col justify-between ${
        isPreview ? 'px-4 py-6' : 'min-h-screen px-4 py-8 sm:py-12'
      } ${isDark ? 'text-zinc-50' : 'text-zinc-900'}`}
    >
      <div className="mx-auto w-full max-w-md space-y-5">
        {/* Cabeçalho */}
        <header className="flex flex-col items-center text-center">
          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt={storeName}
              className={`h-20 w-20 rounded-full object-cover shadow-md ${
                isDark
                  ? 'border-2 border-white/15 bg-zinc-900'
                  : 'border-2 border-white bg-white ring-1 ring-zinc-200/80'
              }`}
            />
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md ${
                isDark
                  ? 'border-2 border-white/15 bg-zinc-800 text-white'
                  : `border-2 border-white ring-1 ring-zinc-200/80 ${palette.avatarFallbackBg} ${palette.avatarFallbackText}`
              }`}
            >
              <span className="text-xl font-black tracking-tight">{initials}</span>
            </div>
          )}

          <h1
            className={`mt-3 text-xl font-extrabold tracking-tight ${
              isPreview ? 'text-lg' : 'sm:text-2xl'
            }`}
          >
            {storeName || 'Minha Vitrine'}
          </h1>

          {shortDescription && (
            <p
              className={`mt-1.5 max-w-sm text-xs leading-relaxed sm:text-sm ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              {shortDescription}
            </p>
          )}

          <div
            className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
              isDark
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Pedidos abertos • Atendimento via WhatsApp
          </div>
        </header>

        {/* Card Principal de Conversão */}
        {(() => {
          const cardContent = (
            <div
              style={{ backgroundColor: palette.hex, color: contrastText }}
              className="group relative overflow-hidden rounded-2xl p-4 shadow-lg transition hover:brightness-105"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-extrabold sm:text-base">
                      Ver Catálogo e Fazer Pedido
                    </p>
                    <p className="text-[11px] opacity-90">
                      Escolha os produtos e envie organizado no WhatsApp
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>

              {featuredProducts.length > 0 && (
                <div className="mt-3.5 grid grid-cols-3 gap-2">
                  {featuredProducts.map((product) => {
                    const thumbUrl = resolveImageUrl(product.imageUrl);
                    return (
                      <div
                        key={product.id}
                        className="overflow-hidden rounded-xl bg-white/95 p-1.5 text-zinc-900 shadow-xs"
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-zinc-100">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={product.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-400">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[10px] font-semibold text-zinc-800">
                          {product.name}
                        </p>
                        <p className="text-[10px] font-extrabold text-zinc-900">
                          {formatCurrency(product.priceCents)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );

          if (isPreview) {
            return <div className="block">{cardContent}</div>;
          }
          return (
            <Link to={`/c/${slug}`} className="block">
              {cardContent}
            </Link>
          );
        })()}

        {/* Lista de Botões Customizados */}
        {config.links.length > 0 && (
          <div className="space-y-2.5">
            {config.links.map((item) => {
              const safeUrl = isSafeHttpUrl(item.url) ? item.url.trim() : null;
              if (!safeUrl && !isPreview) return null;

              const isHighlighted = Boolean(item.highlighted);
              const styleObj = isHighlighted
                ? { backgroundColor: palette.hex, color: contrastText }
                : undefined;

              let variantClasses = '';
              if (isHighlighted) {
                variantClasses = 'border border-transparent shadow-md hover:brightness-105';
              } else if (config.buttonStyle === 'outline') {
                variantClasses = isDark
                  ? 'border-2 border-white/25 bg-transparent text-zinc-100 hover:bg-white/5'
                  : 'border-2 border-zinc-300 bg-transparent text-zinc-900 hover:border-zinc-900 hover:bg-white/60';
              } else if (isDark) {
                variantClasses =
                  'border border-white/10 bg-white/5 text-zinc-100 backdrop-blur-md hover:bg-white/10';
              } else {
                variantClasses =
                  'border border-zinc-200/90 bg-white text-zinc-900 shadow-sm hover:border-zinc-300 hover:shadow-md';
              }

              const inner = (
                <div
                  style={styleObj}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 transition ${buttonRadiusClass} ${variantClasses}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isHighlighted
                          ? 'bg-white/20'
                          : isDark
                            ? 'bg-white/10 text-zinc-200'
                            : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {renderLinkIcon(item.icon, 'h-4 w-4')}
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-bold leading-tight">
                        {item.title || 'Link'}
                      </p>
                      {item.subtitle && (
                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isHighlighted
                              ? 'opacity-90'
                              : isDark
                                ? 'text-zinc-400'
                                : 'text-zinc-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <ExternalLink
                    className={`h-4 w-4 shrink-0 ${
                      isHighlighted
                        ? 'opacity-90'
                        : isDark
                          ? 'text-zinc-400'
                          : 'text-zinc-400'
                    }`}
                  />
                </div>
              );

              if (isPreview || !safeUrl) {
                return (
                  <div key={item.id} className="block">
                    {inner}
                  </div>
                );
              }

              return (
                <a
                  key={item.id}
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {inner}
                </a>
              );
            })}
          </div>
        )}

        {/* Barra de Redes Sociais */}
        {hasSocials && (
          <div className="flex items-center justify-center gap-3 pt-1">
            {instagramHref && (
              <a
                href={isPreview ? undefined : instagramHref}
                target={isPreview ? undefined : '_blank'}
                rel={isPreview ? undefined : 'noopener noreferrer'}
                aria-label="Instagram"
                onClick={isPreview ? (e) => e.preventDefault() : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/15'
                    : 'border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {tiktokHref && (
              <a
                href={isPreview ? undefined : tiktokHref}
                target={isPreview ? undefined : '_blank'}
                rel={isPreview ? undefined : 'noopener noreferrer'}
                aria-label="TikTok"
                onClick={isPreview ? (e) => e.preventDefault() : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/15'
                    : 'border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                <Music2 className="h-4 w-4" />
              </a>
            )}
            {whatsappHref && (
              <a
                href={isPreview ? undefined : whatsappHref}
                target={isPreview ? undefined : '_blank'}
                rel={isPreview ? undefined : 'noopener noreferrer'}
                aria-label="WhatsApp"
                onClick={isPreview ? (e) => e.preventDefault() : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/15'
                    : 'border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Rodapé */}
      <footer className="mt-8 text-center">
        <a
          href="https://vitrimini.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition ${
            isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <span>Criado com</span>
          <span className="font-extrabold">VitriMini</span>
        </a>
      </footer>
    </div>
  );
}
