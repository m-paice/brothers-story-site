import { supabase } from './supabase';
import type { NewSale, Sale } from '../types/sale';

/**
 * Registra uma venda de balcão. Retorna a venda gravada (número e vencimento
 * gerados pelo banco). Sem Supabase configurado, simula o resultado.
 */
export async function createSale(payload: NewSale, storeId?: string): Promise<Sale> {
  if (!supabase) {
    const now = new Date();
    const fake = Math.floor(Math.random() * 9999) + 1;
    const dueDate =
      payload.payment_method === 'prazo' && payload.due_days != null
        ? new Date(now.getTime() + payload.due_days * 86400000)
            .toISOString()
            .slice(0, 10)
        : null;
    return {
      id: crypto.randomUUID(),
      sale_number: `V-${now.getFullYear()}-${String(fake).padStart(4, '0')}`,
      paid: payload.payment_method !== 'prazo',
      paid_at: payload.payment_method !== 'prazo' ? now.toISOString() : null,
      due_date: dueDate,
      created_at: now.toISOString(),
      sold_by: null,
      seller: null,
      ...payload,
    };
  }

  const { data, error } = await supabase
    .from('sales')
    .insert({ ...payload, ...(storeId ? { store_id: storeId } : undefined) })
    .select('*')
    .single();

  if (error) throw error;
  return data as Sale;
}

export async function fetchSales(storeId?: string): Promise<Sale[]> {
  if (!supabase) return [];
  let query = supabase
    .from('sales')
    .select('*, seller:profiles!sales_sold_by_profile_fkey(nome)')
    .order('created_at', { ascending: false });
  if (storeId) query = query.eq('store_id', storeId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Sale[];
}

/** Quita uma venda a prazo. */
export async function markSalePaid(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('sales')
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSale(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw error;
}
