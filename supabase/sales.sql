-- ============================================================================
-- Brother Store — vendas de balcão (PDV)
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- Venda presencial já concretizada, com pagamento e baixa de estoque imediata.
-- Pagamento: pix | cartao | dinheiro | prazo. Para "prazo", guarda os dias e
-- calcula a data de vencimento; o controle de vencido é feito na exibição.
-- ============================================================================

create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  sale_number    text unique,
  customer_name  text,
  items          jsonb not null,                 -- snapshot: [{ id, name, price, qty }]
  subtotal       numeric(10, 2) not null,
  discount       numeric(10, 2) not null default 0,
  total          numeric(10, 2) not null,
  payment_method text not null
                 check (payment_method in ('pix', 'cartao', 'dinheiro', 'prazo')),
  due_days       integer,                        -- só para "prazo"
  due_date       date,                           -- calculado: data da venda + due_days
  paid           boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- Número legível da venda: V-AAAA-NNNN
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
    -- A prazo: calcula vencimento a partir dos dias informados.
    if new.due_days is not null then
      new.due_date := current_date + new.due_days;
    end if;
  else
    -- Demais formas: pago no ato, sem prazo.
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

-- ----------------------------------------------------------------------------
-- Estoque: deduz ao registrar a venda (devolve se excluída). Bloqueia se não
-- houver estoque suficiente. Alterar o campo `paid` não afeta o estoque.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- RLS: vendas são exclusivas do admin autenticado.
-- ----------------------------------------------------------------------------
alter table public.sales enable row level security;

drop policy if exists "sales_all_authenticated" on public.sales;
create policy "sales_all_authenticated" on public.sales
  for all to authenticated using (true) with check (true);
