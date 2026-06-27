-- ============================================================================
-- Brother Store — frete (SuperFrete): peso e dimensões do produto
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- A SuperFrete cota pelo peso (kg) e dimensões (cm) do pacote. Os defaults
-- abaixo atendem aos mínimos dos Correios — ajuste cada produto no admin.
-- ============================================================================

alter table public.products add column if not exists weight numeric(6, 3) not null default 0.3;  -- kg
alter table public.products add column if not exists height numeric(6, 1) not null default 2;    -- cm
alter table public.products add column if not exists width  numeric(6, 1) not null default 11;   -- cm
alter table public.products add column if not exists length numeric(6, 1) not null default 16;   -- cm

-- Serviço de frete escolhido no pedido (ex.: "PAC", "SEDEX")
alter table public.orders add column if not exists shipping_service text;
