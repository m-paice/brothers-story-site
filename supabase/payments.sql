-- ============================================================================
-- Brother Store — pagamento online (Mercado Pago / Checkout Pro)
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- O pedido online passa a nascer em "aguardando_pagamento" e vira "pago" pelo
-- webhook do Mercado Pago. O estoque é baixado apenas no "pago".
-- ============================================================================

-- Campos de pagamento no pedido
alter table public.orders add column if not exists payment_id     text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists paid_at        timestamptz;

-- Amplia os status permitidos (inclui aguardando_pagamento e pago)
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'aguardando_pagamento', 'novo', 'em_contato', 'confirmado', 'pago', 'cancelado'
  ));

-- ----------------------------------------------------------------------------
-- Estoque: agora "segura" estoque quando o pedido está confirmado OU pago.
-- (Pagamento aprovado pelo webhook = entra em 'pago' = baixa o estoque.)
-- ----------------------------------------------------------------------------
create or replace function public.apply_stock_on_order_change()
returns trigger as $$
declare
  item jsonb; vid bigint; qty integer; available integer;
  old_held boolean; new_held boolean;
begin
  old_held := (tg_op in ('UPDATE', 'DELETE'))
              and old.status in ('confirmado', 'pago');
  new_held := (tg_op in ('INSERT', 'UPDATE'))
              and new.status in ('confirmado', 'pago');

  if old_held = new_held then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if new_held then
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      qty := (item->>'qty')::integer;
      if vid is null then continue; end if;
      select stock into available from public.product_variants where id = vid for update;
      if available is null then continue; end if;
      if available < qty then
        raise exception 'Estoque insuficiente para "%" (disponível %, pedido %)',
          coalesce(item->>'name', vid::text), available, qty using errcode = 'P0001';
      end if;
    end loop;
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  else
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;
