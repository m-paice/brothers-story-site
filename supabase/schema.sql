-- ============================================================================
-- Brother Store — schema do Supabase
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Produtos
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id             bigint generated always as identity primary key,
  name           text not null,
  price          numeric(10, 2) not null,
  original_price numeric(10, 2) not null,
  stock          integer not null default 0,
  category       text not null,
  description    text not null default '',
  image          text not null default '',
  is_new         boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Pedidos (sem pagamento — apenas a solicitação do cliente)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text unique,
  status        text not null default 'novo'
                check (status in ('novo', 'em_contato', 'confirmado', 'cancelado')),
  customer      jsonb not null,   -- { nome, email, telefone }
  shipping      jsonb not null,   -- { cep, endereco, numero, complemento, cidade, uf }
  items         jsonb not null,   -- snapshot: [{ id, name, price, qty }]
  subtotal      numeric(10, 2) not null,
  shipping_fee  numeric(10, 2) not null default 0,
  total         numeric(10, 2) not null,
  created_at    timestamptz not null default now()
);

-- Número de pedido legível: AAAA-NNNN (ex.: 2026-0001)
create sequence if not exists public.order_seq start 1;

create or replace function public.set_order_number()
returns trigger as $$
begin
  if new.order_number is null then
    new.order_number :=
      to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.order_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_order_number on public.orders;
create trigger trg_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- ----------------------------------------------------------------------------
-- Row Level Security
--   products: leitura pública; escrita só autenticado (admin)
--   orders:   inserção pública (loja); leitura/edição só autenticado (admin)
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.orders   enable row level security;

create policy "products_select_public" on public.products
  for select using (true);
create policy "products_write_authenticated" on public.products
  for all to authenticated using (true) with check (true);

create policy "orders_insert_public" on public.orders
  for insert to anon, authenticated with check (true);
create policy "orders_read_authenticated" on public.orders
  for select to authenticated using (true);
create policy "orders_update_authenticated" on public.orders
  for update to authenticated using (true) with check (true);
create policy "orders_delete_authenticated" on public.orders
  for delete to authenticated using (true);

-- ----------------------------------------------------------------------------
-- Seed de produtos (mesmos itens do catálogo estático)
-- ----------------------------------------------------------------------------
insert into public.products (name, price, original_price, stock, category, description, image, is_new) values
  ('Tricô Técnico Moderno', 385, 385, 3, 'Tricô', 'Trama técnica ergonômica para máxima mobilidade e regulação térmica.', 'https://picsum.photos/seed/techknit/700/900?grayscale', true),
  ('Trench Coat de Couro', 1150, 1350, 12, 'Casacos', 'Couro de bezerro italiano integral com acabamento fosco profundo.', 'https://picsum.photos/seed/trench/700/900?grayscale', false),
  ('Tênis Obsidian', 540, 720, 9, 'Tênis', 'Solado reforçado com fibra de carbono e cadarço de compressão adaptável.', 'https://picsum.photos/seed/obsidian/700/900?grayscale', false),
  ('Calça Cargo Tech', 420, 420, 4, 'Calças', 'Tecido ripstop repelente à água com configuração modular de 8 bolsos.', 'https://picsum.photos/seed/cargo/700/900?grayscale', false),
  ('Kit de Acessórios Prata', 260, 320, 22, 'Acessórios', 'Coleção de anéis e pingente em prata de lei com acabamento à mão.', 'https://picsum.photos/seed/silverset/700/900?grayscale', false),
  ('Camiseta Heavy Off-White', 180, 180, 40, 'Camisetas', 'Malha de algodão pesada 320g/m² com caimento boxy estruturado.', 'https://picsum.photos/seed/heavytee/700/900?grayscale', true),
  ('Jaqueta Jeans Raw', 590, 590, 7, 'Jaquetas', 'Jeans selvedge japonês cru que desbota de forma única com o tempo.', 'https://picsum.photos/seed/denimraw/700/900?grayscale', false),
  ('Óculos Noir Edge', 336, 480, 15, 'Acessórios', 'Armação de acetato com lentes polarizadas e ferragens em preto fosco.', 'https://picsum.photos/seed/noiredge/700/900?grayscale', false),
  ('Calça Alfaiataria Cinza', 460, 460, 0, 'Calças', 'Alfaiataria em mistura de lã com silhueta afiada e afunilada.', 'https://picsum.photos/seed/tailored/700/900?grayscale', false),
  ('Bolsa Transversal Tech', 340, 420, 11, 'Acessórios', 'Corpo modular em Cordura com compartimentos magnéticos de acesso rápido.', 'https://picsum.photos/seed/crossbody/700/900?grayscale', true),
  ('Suéter de Cashmere', 720, 720, 5, 'Tricô', 'Cashmere mongol grau A em modelagem de gola careca relaxada.', 'https://picsum.photos/seed/cashmere/700/900?grayscale', false),
  ('Calça Avant-Garde', 540, 680, 8, 'Calças', 'Construção drapeada assimétrica em tecido técnico fosco.', 'https://picsum.photos/seed/avantgarde/700/900?grayscale', false)
on conflict do nothing;
