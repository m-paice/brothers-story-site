// Navegação e links externos compartilhados entre header e footer.

export const INSTAGRAM_URL =
  'https://www.instagram.com/brothers_story_modamasculina/';

export const WHATSAPP_URL = 'https://wa.me/message/KYXA3T4X6GCWL1';

export interface NavItem {
  label: string;
  to: string;
}

// Itens principais do menu (todos com página real).
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Início', to: '/' },
  { label: 'Sobre', to: '/sobre' },
  { label: 'Envios', to: '/envios' },
  { label: 'Contato', to: '/contato' },
];
