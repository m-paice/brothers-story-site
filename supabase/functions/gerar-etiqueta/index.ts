// ============================================================================
// Edge Function: gerar-etiqueta (SuperFrete) — somente admin
// Para um pedido pago: monta o carrinho na SuperFrete (remetente + destinatário
// + pacote + serviço), paga com o saldo (checkout), gera a etiqueta (tag) e
// salva o rastreio + PDF no pedido, marcando como "enviado".
//
// Secrets (remetente / loja):
//   SUPERFRETE_TOKEN, SUPERFRETE_BASE_URL, ORIGIN_CEP
//   SENDER_NAME, SENDER_DOCUMENT, SENDER_ADDRESS, SENDER_NUMBER,
//   SENDER_COMPLEMENT, SENDER_DISTRICT, SENDER_CITY, SENDER_STATE
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const onlyDigits = (s: string) => String(s ?? '').replace(/\D/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- Autorização: precisa ser admin -----------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Não autenticado.' }, 401);
    const { data: prof } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (prof?.role !== 'admin') return json({ error: 'Sem permissão.' }, 403);

    // --- Pedido ------------------------------------------------------------
    const { order_id } = await req.json();
    const { data: order, error: oErr } = await admin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();
    if (oErr || !order) return json({ error: 'Pedido não encontrado.' }, 404);
    if (order.superfrete_order_id) {
      return json({ error: 'Etiqueta já gerada para este pedido.' }, 400);
    }
    if (!order.shipping_service_id) {
      return json(
        {
          error:
            'Pedido sem serviço de frete. Foi criado antes da cotação — refaça a compra pelo fluxo atual.',
        },
        400
      );
    }

    // Dimensões/peso dos produtos (pelas variações dos itens).
    const variantIds = (order.items ?? [])
      .map((i: { variant_id: number }) => i.variant_id)
      .filter(Boolean);
    const { data: variants } = await admin
      .from('product_variants')
      .select('id, product:products(weight, height, width, length)')
      .in('id', variantIds);

    let weight = 0;
    let height = 2;
    let width = 11;
    let length = 16;
    for (const item of order.items ?? []) {
      // deno-lint-ignore no-explicit-any
      const v: any = (variants ?? []).find((x) => x.id === item.variant_id);
      const p = (Array.isArray(v?.product) ? v?.product[0] : v?.product) ?? {};
      weight += Number(p.weight ?? 0.3) * (item.qty ?? 1);
      height = Math.max(height, Number(p.height ?? 2));
      width = Math.max(width, Number(p.width ?? 11));
      length = Math.max(length, Number(p.length ?? 16));
    }

    const sh = order.shipping ?? {};
    const cu = order.customer ?? {};

    const cartBody = {
      from: {
        name: Deno.env.get('SENDER_NAME'),
        document: onlyDigits(Deno.env.get('SENDER_DOCUMENT') ?? ''),
        address: Deno.env.get('SENDER_ADDRESS'),
        number: Deno.env.get('SENDER_NUMBER') ?? '',
        complement: Deno.env.get('SENDER_COMPLEMENT') ?? '',
        district: Deno.env.get('SENDER_DISTRICT') ?? 'NA',
        city: Deno.env.get('SENDER_CITY'),
        state_abbr: Deno.env.get('SENDER_STATE'),
        postal_code: onlyDigits(Deno.env.get('ORIGIN_CEP') ?? ''),
      },
      to: {
        name: cu.nome,
        document: onlyDigits(cu.cpf ?? ''),
        email: cu.email,
        phone: onlyDigits(cu.telefone ?? ''),
        address: sh.endereco,
        number: sh.numero ?? '',
        complement: sh.complemento ?? '',
        district: sh.bairro || 'NA',
        city: sh.cidade,
        state_abbr: (sh.uf ?? '').toUpperCase(),
        postal_code: onlyDigits(sh.cep ?? ''),
      },
      service: order.shipping_service_id,
      products: (order.items ?? []).map(
        (i: { name: string; qty: number; price: number }) => ({
          name: i.name,
          quantity: i.qty,
          unitary_value: i.price,
        })
      ),
      volumes: [{ height, width, length, weight }],
      options: {
        insurance_value: Number(order.subtotal) || 0,
        receipt: false,
        own_hand: false,
        non_commercial: true,
      },
    };

    const base =
      Deno.env.get('SUPERFRETE_BASE_URL') ?? 'https://sandbox.superfrete.com';
    const token = Deno.env.get('SUPERFRETE_TOKEN');
    const sf = (path: string, body: unknown) =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Brothers Story (contato@brothersstory.com.br)',
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

    // 1) Carrinho
    const cartRes = await sf('/api/v0/cart', cartBody);
    const cart = await cartRes.json();
    if (!cartRes.ok) {
      return json({ error: 'Falha ao criar o frete', step: 'cart', detail: cart }, 502);
    }
    const sfId = cart.id;

    // 2) Checkout (paga com saldo)
    const checkoutRes = await sf('/api/v0/checkout', { orders: [sfId] });
    const checkout = await checkoutRes.json();
    if (!checkoutRes.ok) {
      return json(
        { error: 'Falha no checkout do frete', step: 'checkout', detail: checkout },
        502
      );
    }

    // 3) Etiqueta (PDF)
    const tagRes = await sf('/api/v0/tag/print', { orders: [sfId] });
    const tag = await tagRes.json();
    const labelUrl = tag?.url ?? null;

    // Rastreio: tenta do checkout/cart.
    const tracking =
      cart.tracking ??
      checkout?.[0]?.tracking ??
      checkout?.tracking ??
      null;

    // Atualiza o pedido.
    await admin
      .from('orders')
      .update({
        status: 'enviado',
        superfrete_order_id: sfId,
        tracking_code: tracking,
        label_url: labelUrl,
      })
      .eq('id', order_id);

    return json({ ok: true, tracking_code: tracking, label_url: labelUrl });
  } catch (err) {
    console.error('gerar-etiqueta:', err);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
