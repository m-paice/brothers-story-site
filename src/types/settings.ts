export interface DayHours {
  enabled: boolean;
  open: string;
  close: string;
}

export interface PageContent {
  title: string;
  subtitle: string;
  body: string;
}

export interface StoreSettings {
  store: {
    name: string;
    tagline: string;
    instagram_url: string;
    whatsapp_url: string;
    onboarding_done?: boolean;
  };
  hours: {
    seg: DayHours;
    ter: DayHours;
    qua: DayHours;
    qui: DayHours;
    sex: DayHours;
    sab: DayHours;
    dom: DayHours;
  };
  shipping: {
    free_threshold: number;
    default_fee: number;
  };
  pages: {
    sobre: PageContent;
    contato: PageContent;
    envios: PageContent;
    trocas: PageContent;
  };
}

export type WeekDay = keyof StoreSettings['hours'];
export type PageKey = keyof StoreSettings['pages'];
