// ============================================================================
// Edge Function: cotar-frete
// Cota o frete na SuperFrete a partir do CEP de destino e dos itens do carrinho
// (busca peso/dimensões dos produtos no banco). Retorna as opções (PAC/SEDEX…).
//
// Secrets:
//   SUPERFRETE_TOKEN     -> token Bearer da SuperFrete (TESTE/sandbox ou produção)
//   ORIGIN_CEP           -> CEP de origem da loja (ex.: 39400000)
//   SUPERFRETE_BASE_URL  -> opcional (default sandbox)
// Injetados: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { cep, items } = await req.json();
    if (!cep || !Array.isArray(items) || items.length === 0) {
      return json({ error: 'CEP e itens são obrigatórios.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Busca peso/dimensões do produto de cada variação pedida.
    // Filtra ids inválidos (null, 0) para evitar match incorreto no .in()
    const variantIds = (items as ReqItem[])
      .map((i) => i.variant_id)
      .filter((id): id is number => id != null && id > 0);

    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('id, product:products(weight, height, width, length)')
      .in('id', variantIds);
    if (error) throw error;

    // A SuperFrete não suporta o campo `quantity` — cada objeto no array
    // representa exatamente 1 unidade. Expandimos com flatMap para que
    // qty: 3 vire 3 entradas separadas e o peso/volume total seja correto.
    const products = (items as ReqItem[]).flatMap((item) => {
      const v = (variants ?? []).find((x) => x.id === item.variant_id);
      const p = (Array.isArray(v?.product) ? v?.product[0] : v?.product) ?? {};
      const unit = {
        quantity: 1,
        weight: Number(p.weight ?? 0.3),
        height: Number(p.height ?? 2),
        width: Number(p.width ?? 11),
        length: Number(p.length ?? 16),
      };
      const qty = Math.max(1, Number(item.qty) || 1);
      return Array.from({ length: qty }, () => unit);
    });

    const baseUrl =
      Deno.env.get('SUPERFRETE_BASE_URL') ?? 'https://sandbox.superfrete.com';

    const res = await fetch(`${baseUrl}/api/v0/calculator`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPERFRETE_TOKEN')}`,
        'User-Agent': 'Brothers Story (contato@brothersstory.com.br)',
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: { postal_code: Deno.env.get('ORIGIN_CEP') },
        to: { postal_code: String(cep).replace(/\D/g, '') },
        services: '1,2,17',
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false,
        },
        products,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Erro SuperFrete:', res.status, data);
      // Detalhe exposto temporariamente para depuração.
      return json(
        { error: 'Falha ao cotar o frete.', status: res.status, detail: data },
        502
      );
    }

    // Filtra serviços indisponíveis e devolve uma lista enxuta.
    const options = (Array.isArray(data) ? data : [])
      .filter((s) => !s.error && s.price)
      .map((s) => ({
        id: s.id,
        name: s.name,
        company: s.company?.name ?? '',
        price: Number(s.price),
        delivery_time: s.delivery_time,
      }));

    return json({ options });
  } catch (err) {
    console.error('cotar-frete:', err);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
