-- ============================================================================
-- Brother Store — controle de estoque por status de pedido
-- Rode este arquivo no SQL Editor do Supabase (idempotente: pode rodar de novo).
--
-- Regra: o estoque é "segurado" apenas enquanto o pedido está 'confirmado'.
--   - Entrou em 'confirmado'  -> deduz a quantidade dos itens (−qtd)
--   - Saiu de 'confirmado'     -> devolve a quantidade (+qtd)
--   - Pedido 'confirmado' excluído -> devolve a quantidade
-- A baixa usa o snapshot `items` do pedido (imune a mudanças posteriores).
-- Confirmar sem estoque suficiente é BLOQUEADO (levanta exceção).
-- ============================================================================

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
  -- Um pedido "segura" estoque somente quando está confirmado.
  old_held := (tg_op in ('UPDATE', 'DELETE')) and old.status = 'confirmado';
  new_held := (tg_op in ('INSERT', 'UPDATE')) and new.status = 'confirmado';

  -- Sem mudança no "segurar estoque": nada a fazer.
  if old_held = new_held then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if new_held then
    -- Passou a segurar estoque: valida disponibilidade e deduz.
    -- 1ª passada: valida (e trava as linhas) antes de aplicar qualquer baixa.
    for item in select jsonb_array_elements(new.items) loop
      pid := (item->>'id')::bigint;
      qty := (item->>'qty')::integer;

      select stock into available from public.products where id = pid for update;
      if available is null then
        continue; -- produto removido do catálogo: ignora
      end if;
      if available < qty then
        raise exception
          'Estoque insuficiente para "%" (disponível %, pedido %)',
          coalesce(item->>'name', pid::text), available, qty
          using errcode = 'P0001';
      end if;
    end loop;

    -- 2ª passada: aplica a baixa.
    for item in select jsonb_array_elements(new.items) loop
      update public.products
        set stock = stock - (item->>'qty')::integer
        where id = (item->>'id')::bigint;
    end loop;

  else
    -- Deixou de segurar estoque: devolve as quantidades.
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
