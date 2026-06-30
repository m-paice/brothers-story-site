import { supabase } from './supabase';
import type { NewOrder, Order, OrderStatus } from '../types/order';

/**
 * Cria um pedido. Retorna o pedido gravado (com número gerado pelo banco).
 * Sem Supabase configurado, simula um número local para não travar o fluxo.
 */
export async function createOrder(payload: NewOrder): Promise<Order> {
  if (!supabase) {
    const now = new Date();
    const fake = Math.floor(Math.random() * 9999) + 1;
    return {
      id: crypto.randomUUID(),
      order_number: `${now.getFullYear()}-${String(fake).padStart(4, '0')}`,
      status: 'novo',
      payment_id: null,
      payment_status: null,
      paid_at: null,
      user_id: null,
      tracking_code: null,
      shipping_service: null,
      shipping_service_id: null,
      label_url: null,
      superfrete_order_id: null,
      mp_init_point: null,
      expires_at: null,
      created_at: now.toISOString(),
      ...payload,
    };
  }

  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as Order;
}

export async function fetchOrders(storeId?: string): Promise<Order[]> {
  if (!supabase) return [];
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (storeId) query = query.eq('store_id', storeId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Order[];
}

/** Pedidos do cliente logado (a RLS já restringe aos próprios). */
export async function fetchMyOrders(storeId?: string): Promise<Order[]> {
  if (!supabase) return [];
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (storeId) query = query.eq('store_id', storeId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Order[];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function updateOrderTracking(
  id: string,
  tracking_code: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('orders')
    .update({ tracking_code })
    .eq('id', id);
  if (error) throw error;
}

/** Gera a etiqueta na SuperFrete (admin) e marca o pedido como enviado. */
export async function generateLabel(
  id: string
): Promise<{ tracking_code: string | null; label_url: string | null }> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.functions.invoke('gerar-etiqueta', {
    body: { order_id: id },
  });
  if (error) {
    // Tenta extrair a mensagem detalhada da função.
    const ctx = (error as { context?: Response }).context;
    let detail = '';
    try {
      detail = ctx ? JSON.stringify(await ctx.json()) : '';
    } catch {
      /* ignore */
    }
    throw new Error(detail || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as { tracking_code: string | null; label_url: string | null };
}
