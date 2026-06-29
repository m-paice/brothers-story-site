-- ============================================================================
-- SaaS Migration 4/8 — Constraints NOT NULL + indexes de performance
-- Idempotente. Rode APÓS saas_3_backfill.sql.
-- ============================================================================

-- store_settings: remover constraint singleton e adicionar store_id NOT NULL
alter table public.store_settings
  drop constraint if exists single_row;

alter table public.store_settings
  alter column store_id set not null;

-- products
alter table public.products
  alter column store_id set not null;

-- product_variants
alter table public.product_variants
  alter column store_id set not null;

-- orders
alter table public.orders
  alter column store_id set not null;

-- sales
alter table public.sales
  alter column store_id set not null;

-- Indexes de tenant em todas as tabelas principais
create index if not exists idx_products_store          on public.products(store_id);
create index if not exists idx_product_variants_store  on public.product_variants(store_id);
create index if not exists idx_orders_store            on public.orders(store_id);
create index if not exists idx_sales_store             on public.sales(store_id);
create index if not exists idx_store_settings_store    on public.store_settings(store_id);

-- Unique store_settings por loja (substitui o id=1 singleton)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'store_settings_store_id_key'
  ) then
    alter table public.store_settings
      add constraint store_settings_store_id_key unique (store_id);
  end if;
end $$;
