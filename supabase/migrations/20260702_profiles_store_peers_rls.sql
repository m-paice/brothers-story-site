-- Corrige RLS de profiles: dono/funcionário não conseguia ler o nome de
-- colegas de loja (join `profiles!...` em fetchSales/fetchStoreMembers
-- voltava null), pois a policy antiga só permitia ver a própria linha ou
-- ser admin global (profiles.role = 'admin'). Agora também é permitido ver
-- o profile de quem compartilha pelo menos uma loja (store_members) com o
-- usuário logado — cobre "Vendido por" em Vendas e a lista em Funcionários.
-- Idempotente.

CREATE OR REPLACE FUNCTION "public"."shares_store_with"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.store_members sm1
    join public.store_members sm2 on sm1.store_id = sm2.store_id
    where sm1.user_id = auth.uid() and sm2.user_id = p_user_id
  );
$$;

ALTER FUNCTION "public"."shares_store_with"("p_user_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."shares_store_with"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."shares_store_with"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_store_with"("p_user_id" "uuid") TO "service_role";

DROP POLICY IF EXISTS "profiles_select_store_peers" ON "public"."profiles";
CREATE POLICY "profiles_select_store_peers" ON "public"."profiles"
  FOR SELECT TO "authenticated"
  USING ("public"."shares_store_with"("id"));
