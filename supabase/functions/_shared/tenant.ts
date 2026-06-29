// Shared helper: carrega credenciais do tenant do banco.
// Fallback para Deno.env quando não há registro (modo single-store legado).
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface TenantCredentials {
  superfrete_token: string;
  superfrete_sandbox: boolean;
  superfrete_base_url: string;
  origin_cep: string;
  mercadopago_access_token: string;
  mercadopago_webhook_secret: string;
  sender_name: string;
  sender_document: string;
  sender_email: string;
  sender_phone: string;
  sender_address: string;
  sender_number: string;
  sender_complement: string;
  sender_district: string;
  sender_city: string;
  sender_state: string;
  site_url: string;
}

export async function loadTenantCredentials(
  supabase: SupabaseClient,
  storeId: string
): Promise<TenantCredentials> {
  const { data } = await supabase
    .from('tenant_credentials')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle();

  const addr =
    typeof data?.sender_address === 'object' && data.sender_address !== null
      ? (data.sender_address as Record<string, string>)
      : {};

  const sf_sandbox = data?.superfrete_sandbox ?? true;

  return {
    superfrete_token:
      data?.superfrete_token || Deno.env.get('SUPERFRETE_TOKEN') || '',
    superfrete_sandbox: sf_sandbox,
    superfrete_base_url:
      sf_sandbox
        ? 'https://sandbox.superfrete.com'
        : 'https://superfrete.com',
    origin_cep:
      data?.origin_cep || Deno.env.get('ORIGIN_CEP') || '',
    mercadopago_access_token:
      data?.mercadopago_access_token || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '',
    mercadopago_webhook_secret:
      data?.mercadopago_webhook_secret || Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') || '',
    sender_name:
      data?.sender_name || Deno.env.get('SENDER_NAME') || '',
    sender_document:
      data?.sender_document || Deno.env.get('SENDER_DOCUMENT') || '',
    sender_email:
      data?.sender_email || Deno.env.get('SENDER_EMAIL') || '',
    sender_phone:
      data?.sender_phone || Deno.env.get('SENDER_PHONE') || '',
    sender_address:
      addr.address || Deno.env.get('SENDER_ADDRESS') || '',
    sender_number:
      addr.number || Deno.env.get('SENDER_NUMBER') || '',
    sender_complement:
      addr.complement || Deno.env.get('SENDER_COMPLEMENT') || '',
    sender_district:
      addr.district || Deno.env.get('SENDER_DISTRICT') || 'NA',
    sender_city:
      addr.city || Deno.env.get('SENDER_CITY') || '',
    sender_state:
      addr.state || Deno.env.get('SENDER_STATE') || '',
    site_url:
      Deno.env.get('SITE_URL') || '',
  };
}

// Extrai o storeId da requisição: tenta header X-Tenant-ID primeiro,
// depois query string ?tenant_id=, depois fallback nulo.
export function extractStoreId(req: Request): string | null {
  return (
    req.headers.get('X-Tenant-ID') ??
    new URL(req.url).searchParams.get('tenant_id') ??
    null
  );
}

// Busca o storeId pelo user_id (para funções de admin autenticado).
export async function storeIdForAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('store_members')
    .select('store_id')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .maybeSingle();
  return data?.store_id ?? null;
}
