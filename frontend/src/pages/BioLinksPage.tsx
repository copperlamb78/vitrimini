import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Catalog } from '../types/catalog';
import { getPublicStore } from '../services/api';
import { applyPageSeo } from '../utils/seo';
import { resolveImageUrl } from '../utils/format';
import { normalizeBioLinksConfig } from '../utils/bioLinks';
import { BioLinksView } from '../components/BioLinksView';
import { StorePageSkeleton } from '../components/Skeletons';

export function BioLinksPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPublicStore(slug, isPreview)
      .then((data) => {
        if (cancelled) return;
        if (!data.bioLinksConfig?.enabled) {
          navigate(`/c/${slug}`, { replace: true });
          return;
        }
        setCatalog(data);
        const description =
          data.notes?.trim().slice(0, 155) ||
          `Acesse os links oficiais de ${data.storeName} e faça seu pedido pelo WhatsApp.`;
        applyPageSeo({
          title: `Links — ${data.storeName} | VitriMini`,
          description,
          canonicalPath: `/${slug}/links`,
          ogImage:
            resolveImageUrl(data.logoUrl) ||
            'https://vitrimini.com.br/og-cover.png?v=20261127',
        });
      })
      .catch(() => {
        if (cancelled) return;
        navigate(`/c/${slug}`, { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, isPreview, navigate]);

  if (loading) {
    return <StorePageSkeleton />;
  }

  if (!catalog || !catalog.bioLinksConfig?.enabled) {
    return null;
  }

  const config = normalizeBioLinksConfig(catalog.bioLinksConfig);

  return (
    <BioLinksView
      slug={catalog.slug}
      storeName={catalog.storeName}
      logoUrl={catalog.logoUrl}
      themeColor={catalog.themeColor}
      storeAppearance={catalog.storeAppearance}
      notes={catalog.notes}
      config={config}
      products={catalog.products}
    />
  );
}
