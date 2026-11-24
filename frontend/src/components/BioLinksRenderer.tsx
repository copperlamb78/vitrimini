import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ExternalLink,
  Instagram,
  Link2,
  MapPin,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type {
  BioLinkIcon,
  BioLinksConfig,
  BioLinksNichePreset,
  Product,
} from '../types/catalog';
import { getStoreInitials, getTheme } from '../constants/themes';
import { formatCurrency, resolveImageUrl } from '../utils/format';
import {
  getContrastTextColor,
  getEffectiveOutlineColor,
  hexToRgba,
  isSafeHttpUrl,
  resolveSocialUrl,
} from '../utils/bioLinks';

export interface BioLinksRendererProps {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  themeColor?: string | null;
  notes?: string | null;
  config: BioLinksConfig;
  products?: Array<Pick<Product, 'id' | 'name' | 'priceCents' | 'imageUrl' | 'available'>>;
  isPreview?: boolean;
  bannerPreviewUrl?: string | null;
  linkPreviewUrls?: Record<string, string>;
}

function WhatsAppIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.84 11.84 0 0 0 5.76 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.44Zm-8.45 18.33h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.28c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.46-4.44 9.91-9.9 9.91Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.08 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.02-.07Z" />
    </svg>
  );
}

function renderLinkIcon(icon: BioLinkIcon, className: string) {
  switch (icon) {
    case 'whatsapp':
      return <WhatsAppIcon className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
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

function getNichePatternStyle(
  niche: BioLinksNichePreset,
  accentHex: string,
  isDark: boolean
): React.CSSProperties | null {
  const strokeHex = isDark ? '#FFFFFF' : accentHex;
  const encodedColor = encodeURIComponent(strokeHex);

  switch (niche) {
    case 'bakery':
      return {
        backgroundImage: `radial-gradient(${hexToRgba(strokeHex, 0.85)} 1.5px, transparent 1.5px), radial-gradient(${hexToRgba(strokeHex, 0.6)} 1.5px, transparent 1.5px)`,
        backgroundSize: '28px 28px',
        backgroundPosition: '0 0, 14px 14px',
        opacity: isDark ? 0.06 : 0.055,
      };
    case 'petshop': {
      const pawSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56' fill='${encodedColor}'><circle cx='18' cy='16' r='3'/><circle cx='28' cy='13' r='3'/><circle cx='38' cy='16' r='3'/><path d='M28 21c-5.5 0-9.5 4.2-9.5 8.5 0 3.2 2.5 5.5 5.5 5.5 1.8 0 2.8-.6 4-.6s2.2.6 4 .6c3 0 5.5-2.3 5.5-5.5 0-4.3-4-8.5-9.5-8.5z'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${pawSvg}")`,
        backgroundSize: '56px 56px',
        opacity: isDark ? 0.055 : 0.045,
      };
    }
    case 'fashion':
      return {
        backgroundImage: `repeating-linear-gradient(-45deg, ${hexToRgba(strokeHex, 0.5)} 0px, ${hexToRgba(strokeHex, 0.5)} 1px, transparent 1px, transparent 18px)`,
        opacity: isDark ? 0.045 : 0.04,
      };
    case 'delivery':
      return {
        backgroundImage: `linear-gradient(to right, ${hexToRgba(strokeHex, 0.45)} 1px, transparent 1px), linear-gradient(to bottom, ${hexToRgba(strokeHex, 0.45)} 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
        opacity: isDark ? 0.055 : 0.045,
      };
    case 'default':
    default:
      return null;
  }
}

export function BioLinksRenderer({
  slug,
  storeName,
  logoUrl,
  themeColor,
  notes,
  config,
  products = [],
  isPreview = false,
  bannerPreviewUrl,
  linkPreviewUrls,
}: BioLinksRendererProps) {
  const palette = getTheme(themeColor);
  const contrastText = getContrastTextColor(palette.hex);
  const initials = getStoreInitials(storeName || 'VitriMini');
  const resolvedLogo = resolveImageUrl(logoUrl);
  const isDark = config.theme === 'dark-glass';
  const niche: BioLinksNichePreset = config.nichePreset || 'default';
  const bannerStyle = config.bannerStyle || 'none';
  const outlineColor = getEffectiveOutlineColor(palette.hex, isDark);

  const resolvedBannerUrl = bannerPreviewUrl || resolveImageUrl(config.bannerUrl);
  const [bannerImageError, setBannerImageError] = useState(false);
  const [brokenLinkImages, setBrokenLinkImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBannerImageError(false);
  }, [resolvedBannerUrl, bannerStyle]);

  const showImageBanner =
    bannerStyle === 'image' && Boolean(resolvedBannerUrl) && !bannerImageError;
  const showGradientBanner =
    bannerStyle === 'brand-gradient' ||
    (bannerStyle === 'image' && (!resolvedBannerUrl || bannerImageError));
  const hasBanner = showImageBanner || showGradientBanner;

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

  const nichePatternStyle = getNichePatternStyle(niche, palette.hex, isDark);

  const cardRadiusClass = niche === 'fashion' ? 'rounded-xl' : 'rounded-2xl';
  const buttonRadiusClass =
    config.buttonStyle === 'pill' ? 'rounded-full' : cardRadiusClass;

  const shortDescription = notes?.trim()
    ? notes.trim().slice(0, 140) + (notes.trim().length > 140 ? '...' : '')
    : null;

  const logoRingClass = isDark
    ? 'ring-4 ring-[#09090B] bg-zinc-900'
    : 'ring-4 ring-[#FAFAFA] bg-white';

  return (
    <div
      style={containerBgStyle}
      className={`relative flex min-h-full w-full flex-col justify-between overflow-x-hidden ${
        isPreview ? 'px-4 py-5' : 'min-h-screen px-4 py-8 sm:py-10'
      } ${isDark ? 'text-zinc-50' : 'text-zinc-900'}`}
    >
      {nichePatternStyle && (
        <div
          aria-hidden="true"
          style={nichePatternStyle}
          className="pointer-events-none absolute inset-0"
        />
      )}

      <div className="relative z-10 mx-auto w-full max-w-md space-y-5">
        {/* Cabeçalho com ou sem Banner */}
        <header className="flex flex-col items-center text-center">
          {hasBanner && (
            <div
              className={`w-full overflow-hidden ${cardRadiusClass} shadow-sm`}
            >
              {showImageBanner && resolvedBannerUrl ? (
                <img
                  src={resolvedBannerUrl}
                  alt={`Capa de ${storeName}`}
                  onError={() => setBannerImageError(true)}
                  className="h-32 w-full object-cover sm:h-36"
                />
              ) : (
                <div
                  style={{
                    background: `linear-gradient(135deg, ${palette.hex} 0%, ${hexToRgba(palette.hex, 0.78)} 58%, ${hexToRgba(palette.hex, 0.45)} 100%)`,
                  }}
                  className="h-32 w-full sm:h-36"
                />
              )}
            </div>
          )}

          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt={storeName}
              className={`relative z-10 h-20 w-20 rounded-full object-cover shadow-md ${
                hasBanner ? '-mt-10' : ''
              } ${
                hasBanner
                  ? logoRingClass
                  : isDark
                    ? 'border-2 border-white/15 bg-zinc-900'
                    : 'border-2 border-white bg-white ring-1 ring-zinc-200/80'
              }`}
            />
          ) : (
            <div
              className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-md ${
                hasBanner ? '-mt-10' : ''
              } ${
                hasBanner
                  ? `${logoRingClass} ${
                      isDark
                        ? 'bg-zinc-800 text-white'
                        : `${palette.avatarFallbackBg} ${palette.avatarFallbackText}`
                    }`
                  : isDark
                    ? 'border-2 border-white/15 bg-zinc-800 text-white'
                    : `border-2 border-white ring-1 ring-zinc-200/80 ${palette.avatarFallbackBg} ${palette.avatarFallbackText}`
              }`}
            >
              <span className="text-xl font-black tracking-tight">{initials}</span>
            </div>
          )}

          <h1
            className={`mt-3 text-xl font-extrabold ${
              niche === 'fashion' ? 'tracking-wide' : 'tracking-tight'
            } ${isPreview ? 'text-lg' : 'sm:text-2xl'}`}
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
                : niche === 'bakery'
                  ? 'border border-emerald-200/70 bg-emerald-50/90 text-emerald-700'
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
              style={{
                backgroundColor: palette.hex,
                color: contrastText,
                boxShadow:
                  niche === 'delivery'
                    ? `0 12px 28px -6px ${hexToRgba(palette.hex, 0.45)}`
                    : undefined,
              }}
              className={`group relative overflow-hidden ${cardRadiusClass} p-4 shadow-lg transition hover:brightness-105 ${
                niche === 'delivery' ? 'ring-1 ring-white/20' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
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
            return <div className="block cursor-pointer">{cardContent}</div>;
          }
          return (
            <Link to={`/c/${slug}`} className="block cursor-pointer">
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
              const isOutline = !isHighlighted && config.buttonStyle === 'outline';
              const isFeaturedCard = item.layout === 'featured-card';

              const linkThumbUrl =
                linkPreviewUrls?.[item.id] || resolveImageUrl(item.imageUrl);
              const showThumb =
                isFeaturedCard &&
                Boolean(linkThumbUrl) &&
                !brokenLinkImages[linkThumbUrl || ''];

              const styleObj: React.CSSProperties | undefined = isHighlighted
                ? {
                    backgroundColor: palette.hex,
                    color: contrastText,
                    border: '2px solid transparent',
                  }
                : isOutline
                  ? {
                      backgroundColor: 'transparent',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: outlineColor,
                      color: outlineColor,
                    }
                  : undefined;

              let variantClasses = '';
              if (isHighlighted) {
                variantClasses = 'shadow-md hover:brightness-105';
              } else if (isOutline) {
                variantClasses = 'transition-colors';
              } else if (isDark) {
                variantClasses =
                  niche === 'delivery'
                    ? 'border border-white/20 bg-white/10 text-zinc-100 backdrop-blur-md hover:bg-white/15'
                    : 'border border-white/12 bg-white/10 text-zinc-100 backdrop-blur-md hover:bg-white/15';
              } else {
                variantClasses =
                  niche === 'delivery'
                    ? 'border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 hover:shadow-md'
                    : 'border border-zinc-200/90 bg-white text-zinc-900 shadow-sm hover:border-zinc-300 hover:shadow-md';
              }

              const paddingClasses = isFeaturedCard ? 'p-2.5 pr-4' : 'px-4 py-3.5';

              const inner = (
                <div
                  style={styleObj}
                  onMouseEnter={
                    isOutline
                      ? (e) => {
                          e.currentTarget.style.backgroundColor = hexToRgba(
                            outlineColor,
                            0.1
                          );
                        }
                      : undefined
                  }
                  onMouseLeave={
                    isOutline
                      ? (e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      : undefined
                  }
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 transition ${buttonRadiusClass} ${paddingClasses} ${variantClasses}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {isFeaturedCard ? (
                      showThumb && linkThumbUrl ? (
                        <img
                          src={linkThumbUrl}
                          alt={item.title || 'Link'}
                          onError={() =>
                            setBrokenLinkImages((prev) => ({
                              ...prev,
                              [linkThumbUrl]: true,
                            }))
                          }
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                            isHighlighted
                              ? 'bg-white/20'
                              : isOutline
                                ? isDark
                                  ? 'bg-white/10'
                                  : 'bg-zinc-100'
                                : isDark
                                  ? 'bg-white/10 text-zinc-200'
                                  : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {renderLinkIcon(item.icon, 'h-6 w-6')}
                        </span>
                      )
                    ) : (
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isHighlighted
                            ? 'bg-white/20'
                            : isOutline
                              ? isDark
                                ? 'bg-white/10'
                                : 'bg-zinc-100'
                              : isDark
                                ? 'bg-white/10 text-zinc-200'
                                : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {renderLinkIcon(item.icon, 'h-4 w-4')}
                      </span>
                    )}

                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-bold leading-tight">
                        {item.title || 'Link'}
                      </p>
                      {item.subtitle && (
                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isHighlighted
                              ? 'opacity-90'
                              : isOutline
                                ? 'opacity-80'
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

                  {isFeaturedCard ? (
                    <ArrowUpRight
                      className={`h-4 w-4 shrink-0 ${
                        isHighlighted || isOutline
                          ? 'opacity-90'
                          : 'text-zinc-400'
                      }`}
                    />
                  ) : (
                    <ExternalLink
                      className={`h-4 w-4 shrink-0 ${
                        isHighlighted || isOutline
                          ? 'opacity-90'
                          : 'text-zinc-400'
                      }`}
                    />
                  )}
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
                  className="block cursor-pointer"
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
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition ${
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
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/15'
                    : 'border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            )}
            {whatsappHref && (
              <a
                href={isPreview ? undefined : whatsappHref}
                target={isPreview ? undefined : '_blank'}
                rel={isPreview ? undefined : 'noopener noreferrer'}
                aria-label="WhatsApp"
                onClick={isPreview ? (e) => e.preventDefault() : undefined}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/15'
                    : 'border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Rodapé */}
      <footer className="relative z-10 mt-8 text-center">
        <a
          href="https://vitrimini.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold transition ${
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
