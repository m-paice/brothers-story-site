// ============================================================================
// Edge Function: criar-pagamento
// Recebe os itens (variant_id + qty) e os dados do cliente, RECALCULA os preços
// no banco (não confia no cliente), cria o pedido em "aguardando_pagamento" e
// gera a preferência de pagamento no Mercado Pago (Checkout Pro). Devolve o
// init_point para o front redirecionar.
//
// Secrets necessários (supabase secrets set ...):
//   MERCADOPAGO_ACCESS_TOKEN  -> token de acesso do Mercado Pago (TESTE/PROD)
//   SITE_URL                  -> URL pública da loja (ex.: https://brothers-story.vercel.app)
// Injetados pelo Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadTenantCredentials, extractStoreId } from '../_shared/tenant.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReqItem {
  variant_id: number;
  qty: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { items, customer, shipping, shipping_option_id } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Carrinho vazio.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const storeId = extractStoreId(req);
    const creds = storeId
      ? await loadTenantCredentials(supabase, storeId)
      : null;

    // Identifica o cliente logado pelo JWT enviado no Authorization.
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user },
      } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // CPF do cliente (para a etiqueta de frete): do checkout, com fallback no perfil.
    let cpf: string | null =
      typeof customer?.cpf === 'string' && customer.cpf.trim()
        ? customer.cpf.trim()
        : null;
    if (!cpf && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cpf')
        .eq('id', userId)
        .single();
      cpf = profile?.cpf ?? null;
    }

    // Busca as variações pedidas + produto, para recalcular preços no servidor.
    const variantIds = (items as ReqItem[]).map((i) => i.variant_id);
    const { data: variants, error: vErr } = await supabase
      .from('product_variants')
      .select(
        'id, color, size, stock, product:products(id, name, price, weight, height, width, length)'
      )
      .in('id', variantIds);

    if (vErr) throw vErr;

    const productOf = (variantId: number) => {
      const v = (variants ?? []).find((x) => x.id === variantId);
      if (!v) throw new Error(`Variação ${variantId} não encontrada.`);
      // deno-lint-ignore no-explicit-any
      return (Array.isArray(v.product) ? v.product[0] : v.product) as any;
    };

    // Monta os itens do pedido com preços confiáveis (do banco).
    const orderItems = (items as ReqItem[]).map((reqItem) => {
      const product = productOf(reqItem.variant_id);
      const v = (variants ?? []).find((x) => x.id === reqItem.variant_id);
      const qty = Math.max(1, Number(reqItem.qty) || 1);
      return {
        id: product.id,
        variant_id: reqItem.variant_id,
        color: v?.color ?? null,
        size: v?.size ?? null,
        name: product.name,
        price: Number(product.price),
        qty,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);

    // Recalcula o frete na SuperFrete e valida a opção escolhida pelo cliente.
    const shippingProducts = (items as ReqItem[]).map((reqItem) => {
      const p = productOf(reqItem.variant_id);
      return {
        quantity: Math.max(1, Number(reqItem.qty) || 1),
        weight: Number(p.weight ?? 0.3),
        height: Number(p.height ?? 2),
        width: Number(p.width ?? 11),
        length: Number(p.length ?? 16),
      };
    });

    const baseUrl =
      creds?.superfrete_base_url ||
      Deno.env.get('SUPERFRETE_BASE_URL') ||
      'https://sandbox.superfrete.com';
    const freteRes = await fetch(`${baseUrl}/api/v0/calculator`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds?.superfrete_token || Deno.env.get('SUPERFRETE_TOKEN')}`,
        'User-Agent': 'Brothers Story (contato@brothersstory.com.br)',
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: { postal_code: creds?.origin_cep || Deno.env.get('ORIGIN_CEP') },
        to: { postal_code: String(shipping?.cep ?? '').replace(/\D/g, '') },
        services: '1,2,17',
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false,
        },
        products: shippingProducts,
      }),
    });
    const freteData = await freteRes.json();
    // deno-lint-ignore no-explicit-any
    const chosen = (Array.isArray(freteData) ? freteData : []).find(
      (s: any) => s.id === shipping_option_id && !s.error && s.price
    );
    if (!chosen) {
      return json({ error: 'Opção de frete inválida. Recalcule o frete.' }, 400);
    }
    const shippingFee = Number(chosen.price);
    const shippingService = chosen.name as string;
    const total = subtotal + shippingFee;

    // Cria o pedido aguardando pagamento.
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        status: 'aguardando_pagamento',
        payment_status: 'pending',
        user_id: userId,
        ...(storeId ? { store_id: storeId } : {}),
        customer: { ...customer, cpf },
        shipping,
        items: orderItems,
        subtotal,
        shipping_fee: shippingFee,
        shipping_service: shippingService,
        shipping_service_id: chosen.id,
        total,
      })
      .select('id, order_number')
      .single();

    if (oErr) throw oErr;

    // Cria a preferência no Mercado Pago.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const siteUrl = creds?.site_url || Deno.env.get('SITE_URL') || '';
    const preferenceBody = {
      items: orderItems.map((i) => ({
        title: `${i.name} (${i.size})`,
        quantity: i.qty,
        unit_price: i.price,
        currency_id: 'BRL',
      })),
      // Frete cobrado junto (soma ao total no Mercado Pago).
      shipments: { cost: shippingFee, mode: 'not_specified' },
      payer: { name: customer?.nome, email: customer?.email },
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

    const mpRes = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds?.mercadopago_access_token || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
        },
        body: JSON.stringify(preferenceBody),
      }
    );

    const pref = await mpRes.json();
    if (!mpRes.ok) {
      console.error('Erro do Mercado Pago:', pref);
      throw new Error('Falha ao criar a preferência de pagamento.');
    }

    // Guarda a referência da preferência no pedido.
    await supabase
      .from('orders')
      .update({ payment_id: pref.id })
      .eq('id', order.id);

    return json({
      init_point: pref.init_point,
      order_number: order.order_number,
    });
  } catch (err) {
    console.error('criar-pagamento:', err);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
