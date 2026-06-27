-- ============================================================================
-- Brother Store — etiqueta SuperFrete (fase 2)
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
-- ============================================================================

-- Id do serviço escolhido (1=PAC, 2=SEDEX, 17=Mini Envios, 3=Jadlog…)
alter table public.orders add column if not exists shipping_service_id integer;

-- Etiqueta gerada
alter table public.orders add column if not exists label_url text;
alter table public.orders add column if not exists superfrete_order_id text;
