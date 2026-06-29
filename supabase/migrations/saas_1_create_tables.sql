-- ============================================================================
-- SaaS Migration 1/8 — Novas tabelas do SaaS
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Planos do SaaS
-- ----------------------------------------------------------------------------
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,          -- 'Free', 'Pro', 'Enterprise'
  slug        text not null unique,          -- 'free', 'pro', 'enterprise'
  price       numeric(10, 2) not null default 0,
  max_products integer,                      -- null = ilimitado
  max_orders_month integer,                  -- null = ilimitado
  features    jsonb not null default '[]',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Lojas (tenants)
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- subdomínio: "brother-story"
  name        text not null,
  owner_id    uuid references auth.users(id) on delete set null,
  plan_id     uuid references public.plans(id),
  status      text not null default 'active'
              check (status in ('active', 'suspended', 'cancelled')),
  custom_domain text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_stores_slug on public.stores(slug);
create index if not exists idx_stores_owner on public.stores(owner_id);

-- ----------------------------------------------------------------------------
-- Membros da loja (quem pode acessar o admin)
-- ----------------------------------------------------------------------------
create table if not exists public.store_members (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'staff'
             check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists idx_store_members_store on public.store_members(store_id);
create index if not exists idx_store_members_user  on public.store_members(user_id);

-- ----------------------------------------------------------------------------
-- Assinaturas (histórico de cobrança)
-- ----------------------------------------------------------------------------
create table if not exists public.store_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  plan_id         uuid not null references public.plans(id),
  status          text not null default 'active'
                  check (status in ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start timestamptz,
  current_period_end   timestamptz,
  external_id     text,                     -- id na Stripe/Pagar.me
  created_at      timestamptz not null default now()
);

create index if not exists idx_subscriptions_store on public.store_subscriptions(store_id);

-- ----------------------------------------------------------------------------
-- Credenciais por tenant (MP + SuperFrete)
-- ----------------------------------------------------------------------------
create table if not exists public.tenant_credentials (
  id                         uuid primary key default gen_random_uuid(),
  store_id                   uuid not null unique references public.stores(id) on delete cascade,
  mercadopago_access_token   text,
  mercadopago_webhook_secret text,
  superfrete_token           text,
  superfrete_sandbox         boolean not null default true,
  origin_cep                 text,
  sender_name                text,
  sender_document            text,
  sender_email               text,
  sender_phone               text,
  sender_address             jsonb not null default '{}',
  updated_at                 timestamptz not null default now()
);

-- RLS habilitado nas novas tabelas
alter table public.plans               enable row level security;
alter table public.stores              enable row level security;
alter table public.store_members       enable row level security;
alter table public.store_subscriptions enable row level security;
alter table public.tenant_credentials  enable row level security;

-- Políticas permissivas temporárias (refinadas no script 6)
create policy "plans_select_public" on public.plans
  for select using (true);

create policy "stores_select_public" on public.stores
  for select using (true);

create policy "store_members_authenticated" on public.store_members
  for all to authenticated using (true) with check (true);

create policy "store_subscriptions_authenticated" on public.store_subscriptions
  for all to authenticated using (true) with check (true);

create policy "tenant_credentials_authenticated" on public.tenant_credentials
  for all to authenticated using (true) with check (true);
