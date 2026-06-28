-- Configurações globais da loja (registro único — id sempre = 1)
create table if not exists public.store_settings (
  id          int primary key default 1,
  data        jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  constraint  single_row check (id = 1)
);

insert into public.store_settings (id, data)
values (1, '{}')
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

-- Leitura pública: conteúdo das páginas institucionais
create policy "public read store_settings"
  on public.store_settings for select
  using (true);

-- Escrita restrita a usuários autenticados (admin)
-- "for all" cobre INSERT + UPDATE: o upsert do PostgREST usa
-- INSERT ... ON CONFLICT DO UPDATE, que exige as duas permissões.
create policy "admin write store_settings"
  on public.store_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
