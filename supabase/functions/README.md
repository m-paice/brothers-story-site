# Pagamento (Mercado Pago · Checkout Pro)

Camada server-side do pagamento online. Duas Edge Functions:

- **criar-pagamento** — recalcula os preços no banco, cria o pedido
  (`aguardando_pagamento`) e a preferência no Mercado Pago; devolve o `init_point`.
- **mp-webhook** — recebe a notificação do Mercado Pago, consulta o pagamento e,
  se aprovado, marca o pedido como `pago` (o trigger baixa o estoque).

## 1. Banco

No SQL Editor do Supabase, rode (uma vez):

```
supabase/payments.sql
```

## 2. Credenciais do Mercado Pago

Em https://www.mercadopago.com.br/developers → sua aplicação:

- **Access Token** (use o de **TESTE** para sandbox).
- (Opcional, recomendado) **Assinatura secreta** do webhook → `MERCADOPAGO_WEBHOOK_SECRET`.

## 3. Secrets (rode localmente com o Supabase CLI)

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF

supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TEST-xxxxx"
supabase secrets set SITE_URL="https://brothers-story.vercel.app"
# opcional:
supabase secrets set MERCADOPAGO_WEBHOOK_SECRET="xxxxx"
```

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.

## 4. Deploy das funções

```bash
supabase functions deploy criar-pagamento
supabase functions deploy mp-webhook --no-verify-jwt
```

> O webhook precisa de `--no-verify-jwt` porque o Mercado Pago chama sem o JWT do
> Supabase (a autenticidade é garantida pela assinatura `x-signature`).

## 5. Webhook no Mercado Pago

No painel da aplicação, configure a URL de notificações (Webhooks) para:

```
https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-webhook
```

Evento: **Pagamentos (payment)**.

## 6. Testar (sandbox)

- Use os [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards)
  e usuários de teste do Mercado Pago.
- Fluxo: carrinho → "Ir para o pagamento" → Checkout Pro → retorno em
  `/pagamento/sucesso|pendente|erro`. O pedido vira `pago` pelo webhook.

## Produção

Troque o Access Token de TESTE pelo de **produção** e o webhook continua o mesmo.
