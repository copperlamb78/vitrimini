import { BioLinksRenderer, type BioLinksRendererProps } from './BioLinksRenderer';

type BioLinksViewProps = BioLinksRendererProps;

export function BioLinksView(props: BioLinksViewProps) {
  return <BioLinksRenderer {...props} />;
}
