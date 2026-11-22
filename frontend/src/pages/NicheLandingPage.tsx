import { LandingPage } from './LandingPage';
import { NICHE_PAGES, type NicheKey } from '../data/nichePages';

interface NicheLandingPageProps {
  nicheKey: NicheKey;
}

export function NicheLandingPage({ nicheKey }: NicheLandingPageProps) {
  const config = NICHE_PAGES[nicheKey];
  return <LandingPage nicheConfig={config} />;
}
