import { supabase } from './supabase';
import type { StoreSettings } from '../types/settings';

export const DEFAULT_SETTINGS: StoreSettings = {
  store: {
    name: 'Brothers Story',
    tagline: 'Moda masculina feita para durar e vestir bem.',
    instagram_url: 'https://www.instagram.com/brothers_story_modamasculina/',
    whatsapp_url: 'https://wa.me/message/KYXA3T4X6GCWL1',
  },
  hours: {
    seg: { enabled: true, open: '09:00', close: '18:00' },
    ter: { enabled: true, open: '09:00', close: '18:00' },
    qua: { enabled: true, open: '09:00', close: '18:00' },
    qui: { enabled: true, open: '09:00', close: '18:00' },
    sex: { enabled: true, open: '09:00', close: '18:00' },
    sab: { enabled: true, open: '09:00', close: '13:00' },
    dom: { enabled: false, open: '09:00', close: '13:00' },
  },
  shipping: {
    free_threshold: 300,
    default_fee: 24.9,
  },
  pages: {
    sobre: {
      title: 'Sobre a Brothers Story',
      subtitle: 'Moda masculina feita para durar e vestir bem.',
      body: `A Brothers Story nasceu da vontade de oferecer moda masculina com propósito: peças bem construídas, de caimento impecável e que combinam com o dia a dia de quem valoriza estilo sem exagero. Cada item do nosso catálogo é escolhido a dedo, pensando em qualidade, conforto e durabilidade.

## O que nos move

Acreditamos que vestir bem é simples quando as peças certas estão ao seu alcance. Por isso trabalhamos com curadoria enxuta — preferimos poucas peças excelentes a muitas opções sem identidade. Do básico ao statement, tudo é selecionado para compor um guarda-roupa versátil.

## Compromisso com você

- Curadoria de produtos com foco em qualidade e caimento.
- Atendimento próximo e direto pelo WhatsApp e Instagram.
- Transparência em preços, prazos e políticas de troca.

Tem alguma dúvida ou quer uma recomendação personalizada? Fale com a gente — adoramos ajudar a montar o look certo.`,
    },
    contato: {
      title: 'Fale com a gente',
      subtitle: 'Atendimento direto, sem complicação.',
      body: `Dúvidas sobre tamanhos, disponibilidade, pedidos ou trocas? Nosso atendimento é feito de forma próxima e direta. Escolha o canal de sua preferência.

Preferimos o WhatsApp para tratar de pedidos: assim conseguimos confirmar disponibilidade, combinar o pagamento e acompanhar a entrega com você em tempo real.`,
    },
    envios: {
      title: 'Envios',
      subtitle: 'Como e quando o seu pedido chega.',
      body: `Enviamos para todo o Brasil. Assim que o seu pedido é confirmado pela nossa equipe, ele é preparado e despachado, e você recebe o código de rastreamento para acompanhar a entrega.

## Frete e prazos

- Frete grátis em pedidos a partir de R$ 300,00.
- Abaixo desse valor, o frete padrão é de R$ 24,90.
- O prazo de entrega varia conforme a sua região e é informado na confirmação do pedido.

## Como funciona

Nesta etapa, o pedido feito no site é uma solicitação: nossa equipe confirma a disponibilidade das peças e combina com você a forma de pagamento e o envio. Só depois da confirmação o produto é separado e postado.

## Acompanhamento

Após o despacho, enviamos o código de rastreamento pelo WhatsApp. Se tiver qualquer dúvida sobre o status da entrega, é só falar com a gente.`,
    },
    trocas: {
      title: 'Trocas e devoluções',
      subtitle: 'Comprou e não serviu? A gente resolve.',
      body: `Queremos que você fique satisfeito com a sua compra. Se a peça não serviu ou você mudou de ideia, é possível trocar ou devolver seguindo as condições abaixo.

## Prazo

Você tem até 7 dias corridos após o recebimento para solicitar a devolução por arrependimento, conforme o Código de Defesa do Consumidor (art. 49). Para trocas de tamanho, o prazo é de 30 dias a partir do recebimento.

## Condições

- A peça deve estar sem uso, com etiqueta e na embalagem original.
- Não pode apresentar sinais de uso, lavagem ou cheiro de perfume.
- Recomendamos guardar a nota e a embalagem até confirmar o caimento.

## Como solicitar

Fale com a gente pelo WhatsApp informando o número do pedido e o motivo da troca ou devolução. Nossa equipe orienta o passo a passo e os detalhes do envio.`,
    },
  },
};

export async function fetchSettings(storeId?: string): Promise<StoreSettings> {
  if (!supabase || !storeId) return DEFAULT_SETTINGS;
  const { data, error } = await supabase
    .from('store_settings')
    .select('data')
    .eq('store_id', storeId)
    .maybeSingle();

  if (error || !data?.data) return DEFAULT_SETTINGS;

  // Merge profundo: garante que campos novos adicionados ao DEFAULT sempre existem
  const remote = data.data as Partial<StoreSettings>;
  return {
    store: { ...DEFAULT_SETTINGS.store, ...remote.store },
    hours: { ...DEFAULT_SETTINGS.hours, ...remote.hours },
    shipping: { ...DEFAULT_SETTINGS.shipping, ...remote.shipping },
    pages: {
      sobre: { ...DEFAULT_SETTINGS.pages.sobre, ...remote.pages?.sobre },
      contato: { ...DEFAULT_SETTINGS.pages.contato, ...remote.pages?.contato },
      envios: { ...DEFAULT_SETTINGS.pages.envios, ...remote.pages?.envios },
      trocas: { ...DEFAULT_SETTINGS.pages.trocas, ...remote.pages?.trocas },
    },
  };
}

export async function saveSettings(
  settings: StoreSettings,
  storeId: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const updated_at = new Date().toISOString();
  const { error } = await supabase
    .from('store_settings')
    .upsert(
      { store_id: storeId, data: settings, updated_at },
      { onConflict: 'store_id' }
    );
  if (error) throw error;
}
