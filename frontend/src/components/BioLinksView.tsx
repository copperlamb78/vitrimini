import {
  VitriLinkRenderer,
  type VitriLinkRendererProps,
} from './VitriLinkRenderer';

type BioLinksViewProps = VitriLinkRendererProps;

export function BioLinksView(props: BioLinksViewProps) {
  return <VitriLinkRenderer {...props} />;
}
