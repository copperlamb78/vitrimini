interface StoreProduct {
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  available?: boolean;
}

interface StorePayload {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  notes?: string | null;
  products?: StoreProduct[];
}

interface HTMLRewriterElement {
  setInnerContent(content: string, options?: { html?: boolean }): void;
  setAttribute(name: string, value: string): void;
}

declare class HTMLRewriter {
  on(
    selector: string,
    handlers: {
      element(element: HTMLRewriterElement): void;
    }
  ): HTMLRewriter;
  transform(response: Response): Response;
}

const SLUG_REGEX = /^[a-z0-9-]{1,120}$/;
const CRAWLER_UA_REGEX =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest/i;
const DEFAULT_OG_IMAGE = 'https://vitrimini.com.br/og-cover.png';

export async function onRequestGet(context: {
  request: Request;
  params: { slug?: string };
  next: () => Promise<Response>;
}): Promise<Response> {
  const ua = context.request.headers.get('user-agent') || '';
  const slug = (context.params.slug || '').trim().toLowerCase();

  // FinOps: visitantes humanos e slugs inválidos seguem direto para o SPA sem carga na API
  if (!SLUG_REGEX.test(slug) || !CRAWLER_UA_REGEX.test(ua)) {
    return context.next();
  }

  try {
    const apiRes = await fetch(
      `https://api.vitrimini.com.br/api/store/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(2500) }
    );

    if (!apiRes.ok) {
      return context.next();
    }

    const store = (await apiRes.json()) as StorePayload;
    const storeName = store.storeName?.trim() || 'VitriMini';
    const title = `${storeName} — Vitrine de Encomendas | VitriMini`;
    const description =
      store.notes?.trim().slice(0, 155) ||
      `Confira os produtos de ${storeName} e faça sua encomenda online direto pelo WhatsApp.`;
    const canonicalUrl = `https://vitrimini.com.br/c/${encodeURIComponent(slug)}`;

    const hasHttpsLogo =
      typeof store.logoUrl === 'string' &&
      store.logoUrl.trim().startsWith('https://');
    const ogImage = hasHttpsLogo ? store.logoUrl!.trim() : DEFAULT_OG_IMAGE;
    const ogImageWidth = hasHttpsLogo ? '512' : '1200';
    const ogImageHeight = hasHttpsLogo ? '512' : '630';

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: storeName,
      description,
      url: canonicalUrl,
      image: ogImage,
      makesOffer: (store.products || []).slice(0, 20).map((p) => ({
        '@type': 'Offer',
        priceCurrency: 'BRL',
        price: (p.priceCents / 100).toFixed(2),
        availability:
          p.available === false
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        itemOffered: {
          '@type': 'Product',
          name: p.name,
          ...(p.description ? { description: p.description } : {}),
          ...(p.imageUrl && p.imageUrl.startsWith('https://')
            ? { image: p.imageUrl }
            : {}),
        },
      })),
    };

    const baseRes = await context.next();
    const contentType = baseRes.headers.get('content-type') || '';
    if (!baseRes.ok || !contentType.includes('text/html')) {
      return baseRes;
    }

    const rewritten = new HTMLRewriter()
      .on('title', {
        element(el) {
          el.setInnerContent(title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute('content', description);
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute('href', canonicalUrl);
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute('content', title);
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute('content', description);
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute('content', canonicalUrl);
        },
      })
      .on('meta[property="og:image"]', {
        element(el) {
          el.setAttribute('content', ogImage);
        },
      })
      .on('meta[property="og:image:width"]', {
        element(el) {
          el.setAttribute('content', ogImageWidth);
        },
      })
      .on('meta[property="og:image:height"]', {
        element(el) {
          el.setAttribute('content', ogImageHeight);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(el) {
          el.setAttribute('content', title);
        },
      })
      .on('meta[name="twitter:description"]', {
        element(el) {
          el.setAttribute('content', description);
        },
      })
      .on('meta[name="twitter:image"]', {
        element(el) {
          el.setAttribute('content', ogImage);
        },
      })
      .on('script#vitrimini-jsonld', {
        element(el) {
          el.setInnerContent(
            JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
            { html: true }
          );
        },
      })
      .transform(baseRes);

    const headers = new Headers(rewritten.headers);
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('Vary', 'User-Agent');

    return new Response(rewritten.body, {
      status: rewritten.status,
      headers,
    });
  } catch {
    return context.next();
  }
}
