import { useEffect, useState, type CSSProperties } from 'react';
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
  Product,
  StoreAppearanceConfig,
} from '../types/catalog';
import { getStoreInitials } from '../constants/themes';
import { formatCurrency, resolveImageUrl } from '../utils/format';
import { isSafeHttpUrl, resolveSocialUrl } from '../utils/bioLinks';
import {
  getNichePatternStyle,
  hexToRgba,
  resolveVitriLinkAppearance,
} from '../utils/storeTheme';
import { ThemedButton } from './ThemedButton';
import { ThemedCard } from './ThemedCard';

export interface VitriLinkRendererProps {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  themeColor?: string | null;
  storeAppearance?: StoreAppearanceConfig | null;
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

export function VitriLinkRenderer({
  slug,
  storeName,
  logoUrl,
  themeColor,
  storeAppearance,
  notes,
  config,
  products = [],
  isPreview = false,
  bannerPreviewUrl,
  linkPreviewUrls,
}: VitriLinkRendererProps) {
  const resolvedTheme = resolveVitriLinkAppearance(
    themeColor,
    storeAppearance,
    config
  );
  const {
    bgColor,
    surfaceColor,
    primaryColor,
    textColor,
    textMutedColor,
    textOnPrimary,
    borderColor,
    isDark,
    nichePreset,
    buttonFill,
    radiusClass,
    cssVars,
  } = resolvedTheme;

  const initials = getStoreInitials(storeName || 'VitriMini');
  const resolvedLogo = resolveImageUrl(logoUrl);
  const bannerStyle = config.bannerStyle || 'none';

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

  const nichePatternStyle = getNichePatternStyle(
    nichePreset,
    primaryColor,
    isDark
  );

  const containerStyle: CSSProperties = {
    ...cssVars,
    backgroundColor: bgColor,
    color: textColor,
    ...(config.inheritStoreTheme === false &&
    config.theme === 'brand-soft' &&
    !config.bgColor
      ? {
          backgroundImage: `radial-gradient(circle at 50% 0%, ${hexToRgba(primaryColor, 0.13)} 0%, transparent 62%)`,
        }
      : {}),
  };

  const shortDescription = notes?.trim()
    ? notes.trim().slice(0, 140) + (notes.trim().length > 140 ? '...' : '')
    : null;

  const cardRadiusClass =
    resolvedTheme.buttonShape === 'professional'
      ? 'rounded-lg'
      : resolvedTheme.buttonShape === 'relaxed'
        ? 'rounded-3xl'
        : 'rounded-2xl';

  return (
    <div
      style={containerStyle}
      className={`relative flex min-h-full w-full flex-col justify-between overflow-x-hidden ${
        isPreview ? 'px-4 py-5' : 'min-h-screen px-4 py-8 sm:py-10'
      }`}
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
            <div className={`w-full overflow-hidden ${cardRadiusClass} shadow-sm`}>
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
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${hexToRgba(primaryColor, 0.78)} 58%, ${hexToRgba(primaryColor, 0.45)} 100%)`,
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
              style={{
                backgroundColor: surfaceColor,
                borderColor: hasBanner ? bgColor : borderColor,
              }}
              className={`relative z-10 h-20 w-20 rounded-full border-4 object-cover shadow-md ${
                hasBanner ? '-mt-10' : ''
              }`}
            />
          ) : (
            <div
              style={{
                backgroundColor: hasBanner ? surfaceColor : primaryColor,
                color: hasBanner ? primaryColor : textOnPrimary,
                borderColor: hasBanner ? bgColor : borderColor,
              }}
              className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-md ${
                hasBanner ? '-mt-10' : ''
              }`}
            >
              <span className="text-xl font-black tracking-tight">{initials}</span>
            </div>
          )}

          <h1
            className={`mt-3 text-xl font-extrabold ${
              nichePreset === 'fashion' ? 'tracking-wide' : 'tracking-tight'
            } ${isPreview ? 'text-lg' : 'sm:text-2xl'}`}
          >
            {storeName || 'Minha Vitrine'}
          </h1>

          {shortDescription && (
            <p
              style={{ color: textMutedColor }}
              className="mt-1.5 max-w-sm text-xs leading-relaxed sm:text-sm"
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
            <ThemedCard
              resolvedTheme={resolvedTheme}
              style={{
                backgroundColor: primaryColor,
                color: textOnPrimary,
                borderColor: 'transparent',
                boxShadow:
                  nichePreset === 'delivery'
                    ? `0 12px 28px -6px ${hexToRgba(primaryColor, 0.45)}`
                    : undefined,
              }}
              className={`group relative overflow-hidden p-4 shadow-lg transition hover:brightness-105 ${
                nichePreset === 'delivery' ? 'ring-1 ring-white/20' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    style={{ backgroundColor: hexToRgba(textOnPrimary, 0.16) }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl backdrop-blur-xs"
                  >
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
            </ThemedCard>
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
              const isOutline = !isHighlighted && buttonFill === 'outline';
              const isFeaturedCard = item.layout === 'featured-card';

              const linkThumbUrl =
                linkPreviewUrls?.[item.id] || resolveImageUrl(item.imageUrl);
              const showThumb =
                isFeaturedCard &&
                Boolean(linkThumbUrl) &&
                !brokenLinkImages[linkThumbUrl || ''];

              const paddingClasses = isFeaturedCard
                ? '!p-2.5 !pr-4'
                : '!px-4 !py-3.5';

              const buttonBody = (
                <>
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
                          style={{
                            backgroundColor: isHighlighted
                              ? hexToRgba(textOnPrimary, 0.18)
                              : hexToRgba(
                                  isOutline ? resolvedTheme.outlineColor : textColor,
                                  0.08
                                ),
                          }}
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                        >
                          {renderLinkIcon(item.icon, 'h-6 w-6')}
                        </span>
                      )
                    ) : (
                      <span
                        style={{
                          backgroundColor: isHighlighted
                            ? hexToRgba(textOnPrimary, 0.18)
                            : hexToRgba(
                                isOutline ? resolvedTheme.outlineColor : textColor,
                                0.08
                              ),
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
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
                          style={
                            !isHighlighted && !isOutline
                              ? { color: textMutedColor }
                              : undefined
                          }
                          className={`mt-0.5 truncate text-xs font-normal ${
                            isHighlighted
                              ? 'opacity-90'
                              : isOutline
                                ? 'opacity-80'
                                : ''
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
                        isHighlighted || isOutline ? 'opacity-90' : 'opacity-50'
                      }`}
                    />
                  ) : (
                    <ExternalLink
                      className={`h-4 w-4 shrink-0 ${
                        isHighlighted || isOutline ? 'opacity-90' : 'opacity-50'
                      }`}
                    />
                  )}
                </>
              );

              if (isPreview || !safeUrl) {
                return (
                  <ThemedButton
                    key={item.id}
                    type="button"
                    variant="secondary"
                    highlighted={isHighlighted}
                    resolvedTheme={resolvedTheme}
                    onClick={(e) => e.preventDefault()}
                    className={`w-full !justify-between gap-3 ${radiusClass} ${paddingClasses} ${
                      !isOutline && !isHighlighted ? 'shadow-xs' : ''
                    }`}
                  >
                    {buttonBody}
                  </ThemedButton>
                );
              }

              return (
                <ThemedButton
                  key={item.id}
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  highlighted={isHighlighted}
                  resolvedTheme={resolvedTheme}
                  className={`w-full !justify-between gap-3 ${radiusClass} ${paddingClasses} ${
                    !isOutline && !isHighlighted ? 'shadow-xs' : ''
                  }`}
                >
                  {buttonBody}
                </ThemedButton>
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
                style={{
                  backgroundColor: surfaceColor,
                  borderColor,
                  color: textColor,
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition hover:scale-105"
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
                style={{
                  backgroundColor: surfaceColor,
                  borderColor,
                  color: textColor,
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition hover:scale-105"
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
                style={{
                  backgroundColor: surfaceColor,
                  borderColor,
                  color: textColor,
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition hover:scale-105"
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
          style={{ color: textMutedColor }}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold transition hover:opacity-80"
        >
          <span>Criado com</span>
          <span className="font-extrabold">VitriMini</span>
        </a>
      </footer>
    </div>
  );
}
