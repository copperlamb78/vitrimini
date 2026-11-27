export interface PageSeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_URL = 'https://vitrimini.com.br';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.png?v=20261127`;
const JSON_LD_SCRIPT_ID = 'vitrimini-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(
  data?: Record<string, unknown> | Array<Record<string, unknown>>
): void {
  const existing = document.getElementById(JSON_LD_SCRIPT_ID);
  if (!data) {
    existing?.remove();
    return;
  }

  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = JSON_LD_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function applyPageSeo({
  title,
  description,
  canonicalPath = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd,
}: PageSeoOptions): void {
  document.title = title;

  const cleanPath = canonicalPath.startsWith('/')
    ? canonicalPath
    : `/${canonicalPath}`;
  const canonicalUrl = `${SITE_URL}${cleanPath}`;
  const resolvedImage = ogImage.startsWith('http')
    ? ogImage
    : `${SITE_URL}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  upsertCanonical(canonicalUrl);

  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', resolvedImage);
  upsertMeta('property', 'og:image:secure_url', resolvedImage);
  upsertMeta('property', 'og:image:width', '1200');
  upsertMeta('property', 'og:image:height', '630');

  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', resolvedImage);

  upsertJsonLd(jsonLd);
}
