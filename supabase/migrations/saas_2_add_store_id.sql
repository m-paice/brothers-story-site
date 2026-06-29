-- ============================================================================
-- SaaS Migration 2/8 — Adicionar store_id às tabelas existentes
-- Idempotente. Rode APÓS saas_1_create_tables.sql.
-- ============================================================================

-- products
alter table public.products
  add column if not exists store_id uuid references public.stores(id);

-- product_variants (denormalizado para queries mais rápidas)
alter table public.product_variants
  add column if not exists store_id uuid references public.stores(id);

-- orders
alter table public.orders
  add column if not exists store_id uuid references public.stores(id);

-- sales
alter table public.sales
  add column if not exists store_id uuid references public.stores(id);

-- store_settings: remove o singleton e permite multi-registro por loja
alter table public.store_settings
  add column if not exists store_id uuid references public.stores(id);

-- profiles: loja ativa preferida pelo usuário
alter table public.profiles
  add column if not exists current_store_id uuid references public.stores(id);
