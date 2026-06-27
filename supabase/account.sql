-- ============================================================================
-- Brother Store — perfil do cliente (dados pessoais) e endereços
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
-- Requer accounts.sql já aplicado (tabela profiles + RLS).
-- ============================================================================

-- Dados pessoais extras no perfil
alter table public.profiles add column if not exists telefone text;
alter table public.profiles add column if not exists cpf text;

-- ----------------------------------------------------------------------------
-- Endereços do cliente
-- ----------------------------------------------------------------------------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text,
  cep         text,
  endereco    text,
  numero      text,
  complemento text,
  bairro      text,
  cidade      text,
  uf          text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses(user_id);

alter table public.addresses enable row level security;

-- Cada cliente gerencia apenas os próprios endereços.
drop policy if exists "addresses_own" on public.addresses;
create policy "addresses_own" on public.addresses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
