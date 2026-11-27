export interface SiteConfig {
  brandName: string;
  legalName: string;
  documentLabel: string;
  documentNumber: string;
  cityState: string;
  supportEmail: string;
  supportWhatsapp: {
    display: string;
    url: string;
  };
  socialLinks: {
    instagram: string;
    tiktok?: string;
    youtube?: string;
  };
}

export const SITE_CONFIG: SiteConfig = {
  brandName: 'VitriMini',
  legalName: 'VitriMini',
  documentLabel: 'CNPJ',
  documentNumber: '',
  cityState: 'Feira de Santana – BA',
  supportEmail: 'suporte@vitrimini.com.br',
  supportWhatsapp: {
    display: '(75) 99219-7406',
    url: 'https://wa.me/5575992197406',
  },
  socialLinks: {
    instagram: 'https://www.instagram.com/vitriminibr/',
  },
};
