import { supabase } from './supabase';
import type { CartEntry } from '../types/cart';
import type { OrderCustomer, OrderShipping } from '../types/order';

interface StartPaymentInput {
  entries: CartEntry[];
  customer: OrderCustomer;
  shipping: OrderShipping;
}

/**
 * Inicia o pagamento: chama a Edge Function que cria o pedido e a preferência
 * no Mercado Pago, e retorna o init_point (URL do checkout) para redirecionar.
 */
export async function startPayment({
  entries,
  customer,
  shipping,
}: StartPaymentInput): Promise<{ init_point: string; order_number: string }> {
  if (!supabase) throw new Error('Pagamento indisponível: Supabase não configurado.');

  const { data, error } = await supabase.functions.invoke('criar-pagamento', {
    body: {
      items: entries.map((e) => ({ variant_id: e.variantId, qty: e.qty })),
      customer,
      shipping,
    },
  });

  if (error) throw error;
  if (!data?.init_point) throw new Error('Não foi possível iniciar o pagamento.');
  return data as { init_point: string; order_number: string };
}
