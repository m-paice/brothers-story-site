// Tipos do fluxo de pedidos (sem pagamento nesta versão)

export type OrderStatus =
  | 'aguardando_pagamento'
  | 'novo'
  | 'em_contato'
  | 'confirmado'
  | 'pago'
  | 'enviado'
  | 'entregue'
  | 'cancelado';

export interface OrderCustomer {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string | null;
}

export interface OrderShipping {
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro?: string;
  cidade: string;
  uf: string;
}

// Snapshot do item no momento do pedido (preço congelado)
export interface OrderItem {
  id: number; // id do produto
  variant_id: number | null; // id da variação
  color?: string | null;
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
  shipping_service: string | null;
  total: number;
  payment_id: string | null;
  payment_status: string | null;
  paid_at: string | null;
  user_id: string | null;
  tracking_code: string | null;
  shipping_service_id: number | null;
  label_url: string | null;
  superfrete_order_id: string | null;
  mp_init_point: string | null;
  created_at: string;
}

// Payload enviado pela loja ao criar um pedido (sem campos gerados pelo banco)
export type NewOrder = Omit<
  Order,
  | 'id'
  | 'order_number'
  | 'status'
  | 'created_at'
  | 'payment_id'
  | 'payment_status'
  | 'paid_at'
  | 'user_id'
  | 'tracking_code'
  | 'shipping_service'
  | 'shipping_service_id'
  | 'label_url'
  | 'superfrete_order_id'
  | 'mp_init_point'
>;

// Rótulos e cores de status para exibição no admin
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  aguardando_pagamento: {
    label: 'Aguardando pagamento',
    color: 'var(--color-warning)',
  },
  novo: { label: 'Novo', color: 'var(--color-accent)' },
  em_contato: { label: 'Em contato', color: 'var(--color-warning)' },
  pago: { label: 'Pago', color: 'var(--color-success)' },
  confirmado: { label: 'Confirmado', color: 'var(--color-success)' },
  enviado: { label: 'Enviado', color: 'var(--color-secondary)' },
  entregue: { label: 'Entregue', color: 'var(--color-success)' },
  cancelado: { label: 'Cancelado', color: 'var(--color-danger)' },
};

// Sequência de etapas exibida na linha do tempo do cliente.
export const ORDER_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { status: 'pago', label: 'Pagamento aprovado' },
  { status: 'confirmado', label: 'Em preparação' },
  { status: 'enviado', label: 'Enviado' },
  { status: 'entregue', label: 'Entregue' },
];
