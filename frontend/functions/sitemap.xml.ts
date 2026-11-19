export async function onRequestGet(): Promise<Response> {
  try {
    const res = await fetch('https://api.vitrimini.com.br/sitemap.xml');
    if (!res.ok) {
      return new Response('Sitemap indisponível', { status: res.status });
    }

    const xml = await res.text();
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/xml; charset=utf-8',
        'Cache-Control': res.headers.get('Cache-Control') || 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Erro ao carregar sitemap', { status: 502 });
  }
}
