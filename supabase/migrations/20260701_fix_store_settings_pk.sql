-- Corrige store_settings: a PK era "id" (integer DEFAULT 1), resquício do
-- modelo single-tenant original. Isso bloqueava a criação de qualquer loja
-- nova (insert de store_settings sempre tentava id=1 e violava a PK) e fazia
-- upserts de configuração de uma loja poderem sobrescrever a linha de outra
-- (upsert sem onConflict caía sempre no conflito de id=1). store_id já é
-- UNIQUE NOT NULL — vira a PK, e a coluna id (sem uso em nenhum outro lugar
-- do código) é removida.
alter table public.store_settings drop constraint if exists store_settings_pkey;
alter table public.store_settings drop constraint if exists store_settings_store_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_settings_pkey' and conrelid = 'public.store_settings'::regclass
  ) then
    alter table public.store_settings
      add constraint store_settings_pkey primary key (store_id);
  end if;
end $$;

alter table public.store_settings drop column if exists id;
