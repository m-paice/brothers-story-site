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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FREE_SHIPPING_THRESHOLD = 300;
const SHIPPING_FEE = 24.9;

interface ReqItem {
  variant_id: number;
  qty: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { items, customer, shipping } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Carrinho vazio.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Busca as variações pedidas + produto, para recalcular preços no servidor.
    const variantIds = (items as ReqItem[]).map((i) => i.variant_id);
    const { data: variants, error: vErr } = await supabase
      .from('product_variants')
      .select('id, size, stock, product:products(id, name, price)')
      .in('id', variantIds);

    if (vErr) throw vErr;

    // Monta os itens do pedido com preços confiáveis (do banco).
    const orderItems = (items as ReqItem[]).map((reqItem) => {
      const v = (variants ?? []).find((x) => x.id === reqItem.variant_id);
      if (!v) throw new Error(`Variação ${reqItem.variant_id} não encontrada.`);
      const product = Array.isArray(v.product) ? v.product[0] : v.product;
      const qty = Math.max(1, Number(reqItem.qty) || 1);
      return {
        id: product.id,
        variant_id: v.id,
        size: v.size,
        name: product.name,
        price: Number(product.price),
        qty,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shippingFee;

    // Cria o pedido aguardando pagamento.
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        status: 'aguardando_pagamento',
        payment_status: 'pending',
        customer,
        shipping,
        items: orderItems,
        subtotal,
        shipping_fee: shippingFee,
        total,
      })
      .select('id, order_number')
      .single();

    if (oErr) throw oErr;

    // Cria a preferência no Mercado Pago.
    const siteUrl = Deno.env.get('SITE_URL') ?? '';
    const preferenceBody = {
      items: orderItems.map((i) => ({
        title: `${i.name} (${i.size})`,
        quantity: i.qty,
        unit_price: i.price,
        currency_id: 'BRL',
      })),
      payer: { name: customer?.nome, email: customer?.email },
      external_reference: String(order.id),
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso`,
        pending: `${siteUrl}/pagamento/pendente`,
        failure: `${siteUrl}/pagamento/erro`,
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      metadata: { order_id: order.id },
    };

    const mpRes = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
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
