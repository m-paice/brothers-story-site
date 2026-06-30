// Edge Function: recriar-pagamento
// Recebe um order_id de um pedido em aguardando_pagamento, cria uma nova
// preferência no Mercado Pago com os mesmos dados e devolve o init_point.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadTenantCredentials, extractStoreId } from '../_shared/tenant.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: 'order_id obrigatório.' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verifica que o pedido pertence ao cliente logado.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Não autenticado.' }, 401);

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .eq('status', 'aguardando_pagamento')
      .single();

    if (oErr || !order) return json({ error: 'Pedido não encontrado.' }, 404);

    const storeId = extractStoreId(req) ?? order.store_id;
    const creds = storeId ? await loadTenantCredentials(supabase, storeId) : null;

    const siteUrl = creds?.site_url || Deno.env.get('SITE_URL') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    // deno-lint-ignore no-explicit-any
    const items = (order.items as any[]).map((i: any) => ({
      title: `${i.name} (${i.size ?? 'Único'})`,
      quantity: i.qty,
      unit_price: Number(i.price),
      currency_id: 'BRL',
    }));

    const preferenceBody = {
      items,
      shipments: { cost: Number(order.shipping_fee), mode: 'not_specified' },
      payer: { name: order.customer?.nome, email: order.customer?.email },
      external_reference: String(order.id),
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso`,
        pending: `${siteUrl}/pagamento/pendente`,
        failure: `${siteUrl}/pagamento/erro`,
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook${storeId ? `?tenant_id=${storeId}` : ''}`,
      metadata: { order_id: order.id },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds?.mercadopago_access_token || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const pref = await mpRes.json();
    if (!mpRes.ok) {
      console.error('Erro MP:', pref);
      throw new Error('Falha ao criar preferência de pagamento.');
    }

    await supabase
      .from('orders')
      .update({ payment_id: pref.id, mp_init_point: pref.init_point })
      .eq('id', order.id);

    return json({ init_point: pref.init_point });
  } catch (err) {
    console.error('recriar-pagamento:', err);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
