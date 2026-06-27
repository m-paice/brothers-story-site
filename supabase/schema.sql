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
-- Controle de estoque por status (detalhes e comentários em stock.sql)
--   Estoque é deduzido ao entrar em 'confirmado' e devolvido ao sair.
--   Confirmar sem estoque suficiente é bloqueado.
-- ----------------------------------------------------------------------------
create or replace function public.apply_stock_on_order_change()
returns trigger as $$
declare
  item      jsonb;
  pid       bigint;
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
      pid := (item->>'id')::bigint;
      qty := (item->>'qty')::integer;
      select stock into available from public.products where id = pid for update;
      if available is null then
        continue;
      end if;
      if available < qty then
        raise exception
          'Estoque insuficiente para "%" (disponível %, pedido %)',
          coalesce(item->>'name', pid::text), available, qty
          using errcode = 'P0001';
      end if;
    end loop;

    for item in select jsonb_array_elements(new.items) loop
      update public.products
        set stock = stock - (item->>'qty')::integer
        where id = (item->>'id')::bigint;
    end loop;
  else
    for item in select jsonb_array_elements(old.items) loop
      update public.products
        set stock = stock + (item->>'qty')::integer
        where id = (item->>'id')::bigint;
    end loop;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;

drop trigger if exists trg_stock_order_insert on public.orders;
create trigger trg_stock_order_insert
  after insert on public.orders
  for each row execute function public.apply_stock_on_order_change();

drop trigger if exists trg_stock_order_update on public.orders;
create trigger trg_stock_order_update
  after update of status on public.orders
  for each row execute function public.apply_stock_on_order_change();

drop trigger if exists trg_stock_order_delete on public.orders;
create trigger trg_stock_order_delete
  after delete on public.orders
  for each row execute function public.apply_stock_on_order_change();

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

-- ----------------------------------------------------------------------------
-- Vendas de balcão (PDV) — detalhes e comentários em sales.sql
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  sale_number    text unique,
  customer_name  text,
  items          jsonb not null,
  subtotal       numeric(10, 2) not null,
  discount       numeric(10, 2) not null default 0,
  total          numeric(10, 2) not null,
  payment_method text not null
                 check (payment_method in ('pix', 'cartao', 'dinheiro', 'prazo')),
  due_days       integer,
  due_date       date,
  paid           boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);

create sequence if not exists public.sale_seq start 1;

create or replace function public.set_sale_defaults()
returns trigger as $$
begin
  if new.sale_number is null then
    new.sale_number :=
      'V-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.sale_seq')::text, 4, '0');
  end if;
  if new.payment_method = 'prazo' then
    if new.due_days is not null then
      new.due_date := current_date + new.due_days;
    end if;
  else
    new.due_days := null;
    new.due_date := null;
    new.paid := true;
    if new.paid_at is null then
      new.paid_at := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sale_defaults on public.sales;
create trigger trg_sale_defaults
  before insert on public.sales
  for each row execute function public.set_sale_defaults();

create or replace function public.apply_stock_on_sale_change()
returns trigger as $$
declare
  item      jsonb;
  pid       bigint;
  qty       integer;
  available integer;
begin
  if tg_op = 'INSERT' then
    for item in select jsonb_array_elements(new.items) loop
      pid := (item->>'id')::bigint;
      qty := (item->>'qty')::integer;
      select stock into available from public.products where id = pid for update;
      if available is null then
        continue;
      end if;
      if available < qty then
        raise exception
          'Estoque insuficiente para "%" (disponível %, venda %)',
          coalesce(item->>'name', pid::text), available, qty
          using errcode = 'P0001';
      end if;
    end loop;
    for item in select jsonb_array_elements(new.items) loop
      update public.products
        set stock = stock - (item->>'qty')::integer
        where id = (item->>'id')::bigint;
    end loop;
    return new;
  elsif tg_op = 'DELETE' then
    for item in select jsonb_array_elements(old.items) loop
      update public.products
        set stock = stock + (item->>'qty')::integer
        where id = (item->>'id')::bigint;
    end loop;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_stock_sale_insert on public.sales;
create trigger trg_stock_sale_insert
  after insert on public.sales
  for each row execute function public.apply_stock_on_sale_change();

drop trigger if exists trg_stock_sale_delete on public.sales;
create trigger trg_stock_sale_delete
  after delete on public.sales
  for each row execute function public.apply_stock_on_sale_change();

alter table public.sales enable row level security;
drop policy if exists "sales_all_authenticated" on public.sales;
create policy "sales_all_authenticated" on public.sales
  for all to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Variações de produto (tamanhos) — detalhes e comentários em variants.sql
-- Estoque passa a ser por variação; os triggers acima são redefinidos abaixo
-- para baixar/devolver em product_variants pelo variant_id dos itens.
-- ----------------------------------------------------------------------------
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

insert into public.product_variants (product_id, size, stock)
select p.id, 'Único', p.stock
from public.products p
where not exists (
  select 1 from public.product_variants v where v.product_id = p.id
);

create or replace function public.apply_stock_on_order_change()
returns trigger as $$
declare
  item jsonb; vid bigint; qty integer; available integer;
  old_held boolean; new_held boolean;
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
        raise exception 'Estoque insuficiente para "%" (disponível %, pedido %)',
          coalesce(item->>'name', vid::text), available, qty using errcode = 'P0001';
      end if;
    end loop;
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  else
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;

create or replace function public.apply_stock_on_sale_change()
returns trigger as $$
declare item jsonb; vid bigint; qty integer; available integer;
begin
  if tg_op = 'INSERT' then
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      qty := (item->>'qty')::integer;
      if vid is null then continue; end if;
      select stock into available from public.product_variants where id = vid for update;
      if available is null then continue; end if;
      if available < qty then
        raise exception 'Estoque insuficiente para "%" (disponível %, venda %)',
          coalesce(item->>'name', vid::text), available, qty using errcode = 'P0001';
      end if;
    end loop;
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
    return new;
  elsif tg_op = 'DELETE' then
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Pagamento online (Mercado Pago) — detalhes em payments.sql
-- Pedido nasce em 'aguardando_pagamento' e vira 'pago' pelo webhook; estoque
-- baixa no 'confirmado' OU 'pago'.
-- ----------------------------------------------------------------------------
alter table public.orders add column if not exists payment_id     text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists paid_at        timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'aguardando_pagamento', 'novo', 'em_contato', 'confirmado', 'pago', 'cancelado'
  ));

create or replace function public.apply_stock_on_order_change()
returns trigger as $$
declare
  item jsonb; vid bigint; qty integer; available integer;
  old_held boolean; new_held boolean;
begin
  old_held := (tg_op in ('UPDATE', 'DELETE')) and old.status in ('confirmado', 'pago');
  new_held := (tg_op in ('INSERT', 'UPDATE')) and new.status in ('confirmado', 'pago');
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
        raise exception 'Estoque insuficiente para "%" (disponível %, pedido %)',
          coalesce(item->>'name', vid::text), available, qty using errcode = 'P0001';
      end if;
    end loop;
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  else
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;
