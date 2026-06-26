// Tipos do fluxo de pedidos (sem pagamento nesta versão)

export type OrderStatus = 'novo' | 'em_contato' | 'confirmado' | 'cancelado';

export interface OrderCustomer {
  nome: string;
  email: string;
  telefone: string;
}

export interface OrderShipping {
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  cidade: string;
  uf: string;
}

// Snapshot do item no momento do pedido (preço congelado)
export interface OrderItem {
  id: number; // id do produto
  variant_id: number | null; // id da variação (tamanho)
  size: string | null;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer: OrderCustomer;
  shipping: OrderShipping;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
}

// Payload enviado pela loja ao criar um pedido (sem campos gerados pelo banco)
export type NewOrder = Omit<Order, 'id' | 'order_number' | 'status' | 'created_at'>;

// Rótulos e cores de status para exibição no admin
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  novo: { label: 'Novo', color: 'var(--color-accent)' },
  em_contato: { label: 'Em contato', color: 'var(--color-warning)' },
  confirmado: { label: 'Confirmado', color: 'var(--color-success)' },
  cancelado: { label: 'Cancelado', color: 'var(--color-danger)' },
};
