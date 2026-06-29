import { supabase } from './supabase';
import type { CartEntry } from '../types/cart';

export interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  delivery_time: number;
}

/** Cota o frete na SuperFrete (via Edge Function) para o CEP e itens dados. */
export async function quoteShipping(
  cep: string,
  entries: CartEntry[],
  storeId?: string
): Promise<ShippingOption[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.functions.invoke('cotar-frete', {
    body: {
      cep,
      items: entries.map((e) => ({ variant_id: e.variantId, qty: e.qty })),
    },
    headers: storeId ? { 'X-Tenant-ID': storeId } : undefined,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.options ?? []) as ShippingOption[];
}
