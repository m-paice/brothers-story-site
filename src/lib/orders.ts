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

export async function fetchOrders(): Promise<Order[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
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
