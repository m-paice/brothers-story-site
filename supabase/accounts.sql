-- ============================================================================
-- Brother Store — contas de cliente, papéis (admin/cliente) e acompanhamento
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- IMPORTANTE: este arquivo APERTA a segurança — as áreas de admin passam a
-- exigir papel 'admin'. Defina seu usuário admin no final (placeholder) ANTES
-- de testar, senão você perde acesso ao /admin.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Perfis + papéis
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'customer' check (role in ('customer', 'admin')),
  nome       text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper de papel. SECURITY DEFINER evita recursão de RLS ao checar o papel.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Cria o perfil automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data->>'nome')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: cria perfil para usuários já existentes (ex.: seu admin atual).
insert into public.profiles (id)
select id from auth.users on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Pedidos: dono (user_id), código de rastreio e status de logística
-- ----------------------------------------------------------------------------
alter table public.orders add column if not exists user_id uuid references auth.users(id);
alter table public.orders add column if not exists tracking_code text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'aguardando_pagamento', 'novo', 'em_contato', 'confirmado',
    'pago', 'enviado', 'entregue', 'cancelado'
  ));

-- ----------------------------------------------------------------------------
-- RLS: admin agora exige is_admin(); cliente lê apenas os próprios pedidos.
-- (Pedidos são criados pela Edge Function com service role, que ignora a RLS,
--  por isso não há policy de insert.)
-- ----------------------------------------------------------------------------
drop policy if exists "products_write_authenticated" on public.products;
create policy "products_write_admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variants_write_authenticated" on public.product_variants;
create policy "variants_write_admin" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sales_all_authenticated" on public.sales;
create policy "sales_all_admin" on public.sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_insert_public" on public.orders;
drop policy if exists "orders_read_authenticated" on public.orders;
drop policy if exists "orders_update_authenticated" on public.orders;
drop policy if exists "orders_delete_authenticated" on public.orders;

create policy "orders_select_own_or_admin" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "orders_update_admin" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders_delete_admin" on public.orders
  for delete to authenticated using (public.is_admin());

-- ============================================================================
-- >>> DEFINA SEU ADMIN AQUI (troque o e-mail) e rode esta linha <<<
-- ============================================================================
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'SEU_EMAIL_ADMIN');
