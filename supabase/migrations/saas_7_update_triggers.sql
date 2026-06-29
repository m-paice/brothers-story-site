-- ============================================================================
-- SaaS Migration 7/8 — Atualiza triggers para numeração por tenant
-- Idempotente. Rode APÓS saas_6_rls_policies.sql.
-- ============================================================================

-- Sequências por loja: substitui order_seq/sale_seq globais.
-- Usamos uma tabela de contadores para evitar uma sequence por tenant.
create table if not exists public.tenant_sequences (
  store_id   uuid not null references public.stores(id) on delete cascade,
  seq_name   text not null,
  last_value bigint not null default 0,
  primary key (store_id, seq_name)
);

alter table public.tenant_sequences enable row level security;
create policy "tenant_sequences_authenticated" on public.tenant_sequences
  for all to authenticated using (true) with check (true);

create or replace function public.next_tenant_seq(p_store_id uuid, p_seq text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  insert into public.tenant_sequences (store_id, seq_name, last_value)
  values (p_store_id, p_seq, 1)
  on conflict (store_id, seq_name) do update
    set last_value = tenant_sequences.last_value + 1
  returning last_value into v_next;
  return v_next;
end;
$$;

-- ----------------------------------------------------------------------------
-- Numeração de pedidos: SLUG-AAAA-NNNN (ex.: brothers-story-2026-0001)
-- Mantém compatibilidade: se store_id for null, usa o formato antigo.
-- ----------------------------------------------------------------------------
create or replace function public.set_order_number()
returns trigger as $$
declare
  v_slug text;
  v_num  bigint;
begin
  if new.order_number is not null then
    return new;
  end if;

  if new.store_id is not null then
    select slug into v_slug from public.stores where id = new.store_id;
    v_num := public.next_tenant_seq(new.store_id, 'order');
    new.order_number :=
      v_slug || '-' || to_char(now(), 'YYYY') || '-' ||
      lpad(v_num::text, 4, '0');
  else
    new.order_number :=
      to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.order_seq')::text, 4, '0');
  end if;

  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Numeração de vendas: V-SLUG-AAAA-NNNN
-- ----------------------------------------------------------------------------
create or replace function public.set_sale_defaults()
returns trigger as $$
declare
  v_slug text;
  v_num  bigint;
begin
  if new.sale_number is null then
    if new.store_id is not null then
      select slug into v_slug from public.stores where id = new.store_id;
      v_num := public.next_tenant_seq(new.store_id, 'sale');
      new.sale_number :=
        'V-' || v_slug || '-' || to_char(now(), 'YYYY') || '-' ||
        lpad(v_num::text, 4, '0');
    else
      new.sale_number :=
        'V-' || to_char(now(), 'YYYY') || '-' ||
        lpad(nextval('public.sale_seq')::text, 4, '0');
    end if;
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
