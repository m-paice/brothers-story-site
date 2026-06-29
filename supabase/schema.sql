


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."apply_stock_on_order_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  item jsonb; vid bigint; qty integer; available integer;
  old_held boolean; new_held boolean;
begin
  old_held := (tg_op in ('UPDATE', 'DELETE'))
              and old.status in ('confirmado', 'pago');
  new_held := (tg_op in ('INSERT', 'UPDATE'))
              and new.status in ('confirmado', 'pago');

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
$$;


ALTER FUNCTION "public"."apply_stock_on_order_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_stock_on_sale_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  item      jsonb;
  vid       bigint;
  qty       integer;
  available integer;
begin
  if tg_op = 'INSERT' then
    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      qty := (item->>'qty')::integer;
      if vid is null then continue; end if;
      select stock into available from public.product_variants where id = vid for update;
      if available is null then continue; end if;
      if available < qty then
        raise exception
          'Estoque insuficiente para "%" (disponível %, venda %)',
          coalesce(item->>'name', vid::text), available, qty
          using errcode = 'P0001';
      end if;
    end loop;

    for item in select jsonb_array_elements(new.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants
          set stock = stock - (item->>'qty')::integer where id = vid;
      end if;
    end loop;
    return new;
  elsif tg_op = 'DELETE' then
    for item in select jsonb_array_elements(old.items) loop
      vid := nullif(item->>'variant_id', '')::bigint;
      if vid is not null then
        update public.product_variants
          set stock = stock + (item->>'qty')::integer where id = vid;
      end if;
    end loop;
    return old;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."apply_stock_on_sale_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data->>'nome')
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_global_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_admin"("p_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store_id
      and user_id  = auth.uid()
      and role     in ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_store_admin"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_member"("p_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store_id and user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_store_member"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_owner"("p_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store_id
      and user_id  = auth.uid()
      and role     = 'owner'
  );
$$;


ALTER FUNCTION "public"."is_store_owner"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_tenant_seq"("p_store_id" "uuid", "p_seq" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."next_tenant_seq"("p_store_id" "uuid", "p_seq" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."set_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sale_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."set_sale_defaults"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text",
    "cep" "text",
    "endereco" "text",
    "numero" "text",
    "complemento" "text",
    "bairro" "text",
    "cidade" "text",
    "uf" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text",
    "status" "text" DEFAULT 'novo'::"text" NOT NULL,
    "customer" "jsonb" NOT NULL,
    "shipping" "jsonb" NOT NULL,
    "items" "jsonb" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "shipping_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_id" "text",
    "payment_status" "text",
    "paid_at" timestamp with time zone,
    "user_id" "uuid",
    "tracking_code" "text",
    "shipping_service" "text",
    "shipping_service_id" integer,
    "label_url" "text",
    "superfrete_order_id" "text",
    "store_id" "uuid" NOT NULL,
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['aguardando_pagamento'::"text", 'novo'::"text", 'em_contato'::"text", 'confirmado'::"text", 'pago'::"text", 'enviado'::"text", 'entregue'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "max_products" integer,
    "max_orders_month" integer,
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "size" "text" NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "color" "text" DEFAULT ''::"text" NOT NULL,
    "store_id" "uuid" NOT NULL
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


ALTER TABLE "public"."product_variants" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."product_variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "original_price" numeric(10,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "image" "text" DEFAULT ''::"text" NOT NULL,
    "is_new" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight" numeric(6,3) DEFAULT 0.3 NOT NULL,
    "height" numeric(6,1) DEFAULT 2 NOT NULL,
    "width" numeric(6,1) DEFAULT 11 NOT NULL,
    "length" numeric(6,1) DEFAULT 16 NOT NULL,
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "store_id" "uuid" NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'customer'::"text" NOT NULL,
    "nome" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "telefone" "text",
    "cpf" "text",
    "current_store_id" "uuid",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'admin'::"text", 'superadmin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sale_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sale_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_number" "text",
    "customer_name" "text",
    "items" "jsonb" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "discount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "due_days" integer,
    "due_date" "date",
    "paid" boolean DEFAULT false NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    CONSTRAINT "sales_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['pix'::"text", 'cartao'::"text", 'dinheiro'::"text", 'prazo'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "store_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."store_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_id" "uuid" NOT NULL
);


ALTER TABLE "public"."store_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "external_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "store_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'cancelled'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."store_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid",
    "plan_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "custom_domain" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stores_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "mercadopago_access_token" "text",
    "mercadopago_webhook_secret" "text",
    "superfrete_token" "text",
    "superfrete_sandbox" boolean DEFAULT true NOT NULL,
    "origin_cep" "text",
    "sender_name" "text",
    "sender_document" "text",
    "sender_email" "text",
    "sender_phone" "text",
    "sender_address" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_sequences" (
    "store_id" "uuid" NOT NULL,
    "seq_name" "text" NOT NULL,
    "last_value" bigint DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."tenant_sequences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_prod_color_size_key" UNIQUE ("product_id", "color", "size");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_sale_number_key" UNIQUE ("sale_number");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_user_id_key" UNIQUE ("store_id", "user_id");



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_store_id_key" UNIQUE ("store_id");



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tenant_credentials"
    ADD CONSTRAINT "tenant_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_credentials"
    ADD CONSTRAINT "tenant_credentials_store_id_key" UNIQUE ("store_id");



ALTER TABLE ONLY "public"."tenant_sequences"
    ADD CONSTRAINT "tenant_sequences_pkey" PRIMARY KEY ("store_id", "seq_name");



CREATE INDEX "idx_addresses_user" ON "public"."addresses" USING "btree" ("user_id");



CREATE INDEX "idx_orders_store" ON "public"."orders" USING "btree" ("store_id");



CREATE INDEX "idx_product_variants_store" ON "public"."product_variants" USING "btree" ("store_id");



CREATE INDEX "idx_products_store" ON "public"."products" USING "btree" ("store_id");



CREATE INDEX "idx_sales_store" ON "public"."sales" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_store" ON "public"."store_members" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_user" ON "public"."store_members" USING "btree" ("user_id");



CREATE INDEX "idx_store_settings_store" ON "public"."store_settings" USING "btree" ("store_id");



CREATE INDEX "idx_stores_owner" ON "public"."stores" USING "btree" ("owner_id");



CREATE INDEX "idx_stores_slug" ON "public"."stores" USING "btree" ("slug");



CREATE INDEX "idx_subscriptions_store" ON "public"."store_subscriptions" USING "btree" ("store_id");



CREATE INDEX "idx_variants_product" ON "public"."product_variants" USING "btree" ("product_id");



CREATE OR REPLACE TRIGGER "trg_order_number" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_order_number"();



CREATE OR REPLACE TRIGGER "trg_sale_defaults" BEFORE INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."set_sale_defaults"();



CREATE OR REPLACE TRIGGER "trg_stock_order_delete" AFTER DELETE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."apply_stock_on_order_change"();



CREATE OR REPLACE TRIGGER "trg_stock_order_insert" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."apply_stock_on_order_change"();



CREATE OR REPLACE TRIGGER "trg_stock_order_update" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."apply_stock_on_order_change"();



CREATE OR REPLACE TRIGGER "trg_stock_sale_delete" AFTER DELETE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."apply_stock_on_sale_change"();



CREATE OR REPLACE TRIGGER "trg_stock_sale_insert" AFTER INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."apply_stock_on_sale_change"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_current_store_id_fkey" FOREIGN KEY ("current_store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_user_profile_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."tenant_credentials"
    ADD CONSTRAINT "tenant_credentials_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_sequences"
    ADD CONSTRAINT "tenant_sequences_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_own" ON "public"."addresses" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_delete_store_admin" ON "public"."orders" FOR DELETE TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



CREATE POLICY "orders_insert_public" ON "public"."orders" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "orders_select" ON "public"."orders" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



CREATE POLICY "orders_update_store_admin" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_select_public" ON "public"."plans" FOR SELECT USING (true);



CREATE POLICY "plans_write_global_admin" ON "public"."plans" TO "authenticated" USING ("public"."is_global_admin"()) WITH CHECK ("public"."is_global_admin"());



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_select_public" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "products_write_store_admin" ON "public"."products" TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_self_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_store_admin" ON "public"."sales" TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."store_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_members_select" ON "public"."store_members" FOR SELECT TO "authenticated" USING (("public"."is_store_member"("store_id") OR "public"."is_global_admin"()));



CREATE POLICY "store_members_write" ON "public"."store_members" TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."store_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_settings_select_public" ON "public"."store_settings" FOR SELECT USING (true);



CREATE POLICY "store_settings_write_admin" ON "public"."store_settings" TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."store_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_subscriptions_select" ON "public"."store_subscriptions" FOR SELECT TO "authenticated" USING (("public"."is_store_member"("store_id") OR "public"."is_global_admin"()));



CREATE POLICY "store_subscriptions_write_global" ON "public"."store_subscriptions" TO "authenticated" USING ("public"."is_global_admin"()) WITH CHECK ("public"."is_global_admin"());



ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stores_delete_global_admin" ON "public"."stores" FOR DELETE TO "authenticated" USING ("public"."is_global_admin"());



CREATE POLICY "stores_insert_global_admin" ON "public"."stores" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_global_admin"());



CREATE POLICY "stores_select_public" ON "public"."stores" FOR SELECT USING (true);



CREATE POLICY "stores_update_owner" ON "public"."stores" FOR UPDATE TO "authenticated" USING (("public"."is_store_owner"("id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_owner"("id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."tenant_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_credentials_select" ON "public"."tenant_credentials" FOR SELECT TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



CREATE POLICY "tenant_credentials_write" ON "public"."tenant_credentials" TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));



ALTER TABLE "public"."tenant_sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_sequences_authenticated" ON "public"."tenant_sequences" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "variants_select_public" ON "public"."product_variants" FOR SELECT USING (true);



CREATE POLICY "variants_write_store_admin" ON "public"."product_variants" TO "authenticated" USING (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"())) WITH CHECK (("public"."is_store_admin"("store_id") OR "public"."is_global_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."apply_stock_on_order_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_stock_on_order_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_stock_on_order_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_stock_on_sale_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_stock_on_sale_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_stock_on_sale_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_store_admin"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_store_admin"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_store_admin"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_store_member"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_store_member"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_store_member"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_store_owner"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_store_owner"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_store_owner"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."next_tenant_seq"("p_store_id" "uuid", "p_seq" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."next_tenant_seq"("p_store_id" "uuid", "p_seq" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_tenant_seq"("p_store_id" "uuid", "p_seq" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sale_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_sale_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sale_defaults"() TO "service_role";


















GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sale_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sale_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sale_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."store_members" TO "anon";
GRANT ALL ON TABLE "public"."store_members" TO "authenticated";
GRANT ALL ON TABLE "public"."store_members" TO "service_role";



GRANT ALL ON TABLE "public"."store_settings" TO "anon";
GRANT ALL ON TABLE "public"."store_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."store_settings" TO "service_role";



GRANT ALL ON TABLE "public"."store_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."store_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."store_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_credentials" TO "anon";
GRANT ALL ON TABLE "public"."tenant_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_sequences" TO "anon";
GRANT ALL ON TABLE "public"."tenant_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_sequences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































