-- Migration: gerenciamento de funcionários + rastreio de vendedor em vendas
-- Idempotente.

-- ----------------------------------------------------------------------------
-- 1. sales.sold_by — quem registrou a venda (default = usuário logado)
-- ----------------------------------------------------------------------------
alter table public.sales
  add column if not exists sold_by uuid default auth.uid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_sold_by_profile_fkey') then
    alter table public.sales
      add constraint sales_sold_by_profile_fkey
      foreign key (sold_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists idx_sales_sold_by on public.sales(sold_by);

-- ----------------------------------------------------------------------------
-- 2. store_members: só o dono (owner) cria/remove membros da equipe
-- ----------------------------------------------------------------------------
drop policy if exists "store_members_write" on public.store_members;
create policy "store_members_write" on public.store_members
  for all to authenticated
  using (public.is_store_owner(store_id) or public.is_global_admin())
  with check (public.is_store_owner(store_id) or public.is_global_admin());

-- ----------------------------------------------------------------------------
-- 3. store_settings: só o dono (owner) edita configurações da loja
-- ----------------------------------------------------------------------------
drop policy if exists "store_settings_write_admin" on public.store_settings;
create policy "store_settings_write_owner" on public.store_settings
  for all to authenticated
  using (public.is_store_owner(store_id) or public.is_global_admin())
  with check (public.is_store_owner(store_id) or public.is_global_admin());
