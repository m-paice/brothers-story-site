// Helpers para envio de e-mail via Resend.
// Secret obrigatório: RESEND_API_KEY
// Secret opcional:   RESEND_FROM_EMAIL (padrão: onboarding@resend.dev)

const RESEND_URL = 'https://api.resend.com/emails';

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendParams): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY não configurado — e-mail ignorado');
    return;
  }
  const from =
    Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => res.statusText);
    console.error('Resend error:', err);
  }
}

// ─── Tipos internos ────────────────────────────────────────────────────────

interface OrderItem {
  name: string;
  size?: string;
  color?: string;
  qty: number;
  price: number;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingAddress: string;
  storeName: string;
}

// ─── Templates ─────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function itemRows(items: OrderItem[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">
          ${item.name}
          ${item.color ? `<span style="color:#6b7280"> — ${item.color}</span>` : ''}
          ${item.size && item.size !== 'Único' ? `<span style="color:#6b7280"> / ${item.size}</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;color:#6b7280;">
          ${item.qty}×
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:600;color:#111827;">
          ${fmt(item.price * item.qty)}
        </td>
      </tr>`
    )
    .join('');
}

function baseLayout(storeName: string, title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#6366f1;padding:28px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:.05em;text-transform:uppercase;">
              ${storeName}
            </p>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,.75);">${title}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
            ${storeName} · Este é um e-mail automático, não responda.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// E-mail para o cliente: confirmação do pedido
export function buildCustomerEmail(data: OrderEmailData): string {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">Pedido confirmado!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Olá, <strong style="color:#111827;">${data.customerName}</strong> —
      recebemos seu pedido e já estamos separando as peças.
    </p>

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">
      Pedido
    </p>
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#6366f1;">
      #${data.orderNumber}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows(data.items)}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-size:14px;color:#6b7280;padding:4px 0;">Subtotal</td>
        <td style="font-size:14px;color:#6b7280;text-align:right;">${fmt(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#6b7280;padding:4px 0;">Frete</td>
        <td style="font-size:14px;color:#6b7280;text-align:right;">${data.shippingFee === 0 ? 'Grátis' : fmt(data.shippingFee)}</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:700;color:#111827;padding:12px 0 4px;border-top:1px solid #e5e7eb;">Total</td>
        <td style="font-size:16px;font-weight:700;color:#6366f1;text-align:right;padding-top:12px;border-top:1px solid #e5e7eb;">${fmt(data.total)}</td>
      </tr>
    </table>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">Endereço de entrega</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${data.shippingAddress}</p>
    </div>

    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
      Nossa equipe confirmará a disponibilidade das peças e entrará em contato
      para combinar o envio. Qualquer dúvida, responda pelo WhatsApp.
    </p>`;

  return baseLayout(data.storeName, `Confirmação do pedido #${data.orderNumber}`, body);
}

// E-mail para o dono da loja: novo pedido recebido
export function buildOwnerEmail(data: OrderEmailData): string {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">Novo pedido recebido</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      <strong style="color:#111827;">${data.customerName}</strong> acabou de fazer um pedido.
    </p>

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">
      Pedido
    </p>
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#6366f1;">
      #${data.orderNumber}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows(data.items)}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-size:14px;color:#6b7280;padding:4px 0;">Subtotal</td>
        <td style="font-size:14px;color:#6b7280;text-align:right;">${fmt(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#6b7280;padding:4px 0;">Frete</td>
        <td style="font-size:14px;color:#6b7280;text-align:right;">${data.shippingFee === 0 ? 'Grátis' : fmt(data.shippingFee)}</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:700;color:#111827;padding:12px 0 4px;border-top:1px solid #e5e7eb;">Total</td>
        <td style="font-size:16px;font-weight:700;color:#6366f1;text-align:right;padding-top:12px;border-top:1px solid #e5e7eb;">${fmt(data.total)}</td>
      </tr>
    </table>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">Endereço de entrega</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${data.shippingAddress}</p>
    </div>`;

  return baseLayout(data.storeName, `Novo pedido #${data.orderNumber}`, body);
}
