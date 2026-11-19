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

const CRAWLER_UA_REGEX =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest/i;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function onRequestGet(context: {
  request: Request;
  params: { slug?: string };
  next: () => Promise<Response>;
}): Promise<Response> {
  const ua = context.request.headers.get('user-agent') || '';
  const slug = (context.params.slug || '').trim().toLowerCase();

  if (!slug || !CRAWLER_UA_REGEX.test(ua)) {
    return context.next();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const apiRes = await fetch(
      `https://api.vitrimini.com.br/api/store/${encodeURIComponent(slug)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

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

    const firstProductImage = store.products?.find((p) => p.imageUrl)?.imageUrl;
    const rawImage = store.logoUrl || firstProductImage || '';
    const isUsingDefaultCover = !rawImage.startsWith('http');
    const ogImage = isUsingDefaultCover
      ? 'https://vitrimini.com.br/og-cover.png'
      : rawImage;
    const ogImageWidth = isUsingDefaultCover ? '1200' : '900';
    const ogImageHeight = isUsingDefaultCover ? '630' : '900';

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
          ...(p.imageUrl ? { image: p.imageUrl } : {}),
        },
      })),
    };

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="VitriMini" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:width" content="${ogImageWidth}" />
    <meta property="og:image:height" content="${ogImageHeight}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body>
    <h1>${escapeHtml(storeName)}</h1>
    <p>${escapeHtml(description)}</p>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return context.next();
  }
}
