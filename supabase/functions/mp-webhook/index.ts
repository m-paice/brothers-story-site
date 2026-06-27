// ============================================================================
// Edge Function: mp-webhook
// Recebe as notificações do Mercado Pago, consulta o pagamento na API e
// atualiza o pedido. Pagamento aprovado -> pedido "pago" (o trigger baixa o
// estoque). É a fonte da verdade do pagamento (o retorno do navegador é só UX).
//
// Secrets:
//   MERCADOPAGO_ACCESS_TOKEN
//   MERCADOPAGO_WEBHOOK_SECRET (opcional, recomendado — valida a assinatura)
// Injetados: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Algumas notificações vêm só por query string.
    }

    const type =
      url.searchParams.get('type') ??
      url.searchParams.get('topic') ??
      (body.type as string) ??
      (body.topic as string);

    // Só tratamos eventos de pagamento.
    if (type && type !== 'payment') {
      return new Response('ignored', { status: 200 });
    }

    const paymentId =
      url.searchParams.get('data.id') ??
      url.searchParams.get('id') ??
      ((body.data as { id?: string })?.id ?? null);

    if (!paymentId) return new Response('no id', { status: 200 });

    // Validação de assinatura (se o secret estiver configurado).
    // Não bloqueia: o status real é sempre reconfirmado na API do Mercado Pago
    // com o access token (isso garante a autenticidade). A assinatura serve só
    // como camada extra — se não bater, registramos e seguimos.
    const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    if (secret) {
      const ok = await verifySignature(req, String(paymentId), secret);
      if (!ok) {
        console.warn(
          'Assinatura do webhook não confere — processando mesmo assim.'
        );
      }
    }

    // Consulta o pagamento na API do Mercado Pago.
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
        },
      }
    );
    const payment = await mpRes.json();
    if (!mpRes.ok) {
      console.error('Erro ao consultar pagamento:', payment);
      return new Response('mp error', { status: 200 });
    }

    const orderId = payment.external_reference;
    const status = payment.status as string; // approved | pending | rejected ...
    if (!orderId) return new Response('no ref', { status: 200 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const update: Record<string, unknown> = {
      payment_status: status,
      payment_id: String(paymentId),
    };
    if (status === 'approved') {
      update.status = 'pago';
      update.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', orderId);
    if (error) console.error('Falha ao atualizar pedido:', error);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('mp-webhook:', err);
    // Responde 200 para o MP não reenviar em loop por erro nosso.
    return new Response('error', { status: 200 });
  }
});

// Verifica a assinatura x-signature do Mercado Pago.
async function verifySignature(
  req: Request,
  dataId: string,
  secret: string
): Promise<boolean> {
  const signature = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id');
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(manifest)
  );
  const hex = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === v1;
}
