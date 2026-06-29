-- ============================================================================
-- SaaS Migration 5/8 — Funções auxiliares de RLS
-- Idempotente. Rode APÓS saas_4_constraints_indexes.sql.
-- ============================================================================

-- Super admin da plataforma (profiles.role = 'admin' equivale a super_admin por ora)
create or replace function public.is_global_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Membro com qualquer papel em uma loja
create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store_id and user_id = auth.uid()
  );
$$;

-- Membro com papel owner ou admin em uma loja
create or replace function public.is_store_admin(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store_id
      and user_id  = auth.uid()
      and role     in ('owner', 'admin')
  );
$$;

-- Dono (owner) de uma loja
create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store_id
      and user_id  = auth.uid()
      and role     = 'owner'
  );
$$;
