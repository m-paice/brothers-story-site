-- 1. Adiciona coluna expires_at na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Recria a função de trigger para incluir aguardando_pagamento na reserva de estoque
CREATE OR REPLACE FUNCTION public.apply_stock_on_order_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_held boolean;
  new_held boolean;
  item     jsonb;
  vid      bigint;
  qty      int;
  avail    int;
BEGIN
  -- status que "segura" estoque: aguardando_pagamento, confirmado, pago
  old_held := (tg_op IN ('UPDATE', 'DELETE'))
              AND old.status IN ('aguardando_pagamento', 'confirmado', 'pago');
  new_held := (tg_op IN ('INSERT', 'UPDATE'))
              AND new.status IN ('aguardando_pagamento', 'confirmado', 'pago');

  -- LIBERA estoque: era held, deixou de ser (cancelado, etc.)
  IF old_held AND NOT new_held THEN
    FOR item IN SELECT * FROM jsonb_array_elements(old.items) LOOP
      vid := (item->>'variant_id')::bigint;
      qty := (item->>'qty')::int;
      IF vid IS NOT NULL THEN
        UPDATE public.product_variants SET stock = stock + qty WHERE id = vid;
      END IF;
    END LOOP;
  END IF;

  -- RESERVA estoque: passou a ser held (INSERT ou mudança de status)
  IF new_held AND NOT old_held THEN
    FOR item IN SELECT * FROM jsonb_array_elements(new.items) LOOP
      vid := (item->>'variant_id')::bigint;
      qty := (item->>'qty')::int;
      IF vid IS NOT NULL THEN
        SELECT stock INTO avail FROM public.product_variants WHERE id = vid FOR UPDATE;
        IF avail < qty THEN
          RAISE EXCEPTION 'Estoque insuficiente para a variante %', vid;
        END IF;
        UPDATE public.product_variants SET stock = stock - qty WHERE id = vid;
      END IF;
    END LOOP;
  END IF;

  IF tg_op = 'DELETE' THEN RETURN old; END IF;
  RETURN new;
END;
$$;

-- 3. Função para expirar pedidos pendentes (chamada pelo pg_cron)
CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'cancelado'
  WHERE status = 'aguardando_pagamento'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

-- 4. Habilita pg_cron (extensão já disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Agenda job para rodar a cada 5 minutos (remove se já existe antes de criar)
SELECT cron.unschedule('expire-pending-orders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-orders'
);
SELECT cron.schedule('expire-pending-orders', '*/5 * * * *', 'SELECT public.expire_pending_orders()');
