export function getPublicAppOrigin(): string {
  const configured =
    (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_FRONTEND_URL as string | undefined)?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window === 'undefined') {
    return 'https://vitrimini.com.br';
  }

  const { protocol, hostname, port, origin } = window.location;
  if (hostname.toLowerCase().startsWith('painel.')) {
    const publicHost = hostname.slice('painel.'.length);
    return `${protocol}//${publicHost}${port ? `:${port}` : ''}`;
  }

  return origin;
}

export function getPublicStoreUrl(slug: string): string {
  return `${getPublicAppOrigin()}/c/${encodeURIComponent(slug.trim())}`;
}
