// Tipos do PDV (venda de balcão)

export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'prazo';

// Snapshot do item no momento da venda
export interface SaleItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  due_days: number | null;
  due_date: string | null; // ISO date (apenas "prazo")
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

// Payload enviado ao registrar a venda (sem campos gerados pelo banco)
export interface NewSale {
  customer_name: string | null;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  due_days: number | null;
}

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string }> = {
  dinheiro: { label: 'Dinheiro' },
  pix: { label: 'Pix' },
  cartao: { label: 'Cartão' },
  prazo: { label: 'A prazo' },
};

export type SaleStatus = 'pago' | 'aberto' | 'vencido';

export const SALE_STATUS_META: Record<
  SaleStatus,
  { label: string; color: string }
> = {
  pago: { label: 'Pago', color: 'var(--color-success)' },
  aberto: { label: 'Em aberto', color: 'var(--color-warning)' },
  vencido: { label: 'Vencido', color: 'var(--color-danger)' },
};

/** Situação de pagamento da venda (vencido é calculado na exibição). */
export function getSaleStatus(sale: Sale): SaleStatus {
  if (sale.payment_method !== 'prazo' || sale.paid) return 'pago';
  if (sale.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${sale.due_date}T00:00:00`) < today) return 'vencido';
  }
  return 'aberto';
}
