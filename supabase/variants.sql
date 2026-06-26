-- ============================================================================
-- Brother Store — variações de produto (tamanhos) com estoque por variação
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- O estoque passa a ser por (produto, tamanho). A coluna products.stock deixa
-- de ser a fonte da verdade (o app soma as variações). Os triggers de estoque
-- de pedidos e vendas passam a baixar/devolver em product_variants pelo
-- variant_id guardado no snapshot dos itens.
-- ============================================================================

create table if not exists public.product_variants (
  id         bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  size       text not null,
  stock      integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, size)
);

create index if not exists idx_variants_product on public.product_variants(product_id);

alter table public.product_variants enable row level security;

drop policy if exists "variants_select_public" on public.product_variants;
create policy "variants_select_public" on public.product_variants
  for select using (true);

drop policy if exists "variants_write_authenticated" on public.product_variants;
create policy "variants_write_authenticated" on public.product_variants
  for all to authenticated using (true) with check (true);

-- Migração: cada produto sem variação ganha uma "Único" com o estoque atual.
insert into public.product_variants (product_id, size, stock)
select p.id, 'Único', p.stock
from public.products p
where not exists (
  select 1 from public.product_variants v where v.product_id = p.id
);

-- ----------------------------------------------------------------------------
-- Estoque dos PEDIDOS: agora por variant_id (item->>'variant_id')
-- ----------------------------------------------------------------------------
create or replace function public.apply_stock_on_order_change()
returns trigger as $$
declare
  item      jsonb;
  vid       bigint;
  qty       integer;
  available integer;
  old_held  boolean;
  new_held  boolean;
begin
  old_held := (tg_op in ('UPDATE', 'DELETE')) and old.status = 'confirmado';
  new_held := (tg_op in ('INSERT', 'UPDATE')) and new.status = 'confirmado';

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
        raise exception
          'Estoque insuficiente para "%" (disponível %, pedido %)',
          coalesce(item->>'name', vid::text), available, qty
          using errcode = 'P0001';
      end if;
    end loop;

    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants
          set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  else
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants
          set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Estoque das VENDAS (PDV): agora por variant_id
-- ----------------------------------------------------------------------------
create or replace function public.apply_stock_on_sale_change()
returns trigger as $$
declare
  item      jsonb;
  vid       bigint;
  qty       integer;
  available integer;
begin
  if tg_op = 'INSERT' then
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      qty := (item->>'qty')::integer;
      if vid is null then continue; end if;
      select stock into available from public.product_variants where id = vid for update;
      if available is null then continue; end if;
      if available < qty then
        raise exception
          'Estoque insuficiente para "%" (disponível %, venda %)',
          coalesce(item->>'name', vid::text), available, qty
          using errcode = 'P0001';
      end if;
    end loop;

    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants
          set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
    return new;
  elsif tg_op = 'DELETE' then
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants
          set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;
