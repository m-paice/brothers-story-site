#!/usr/bin/env bash
# Deploy das Edge Functions de pagamento + configuração dos secrets.
# Lê os valores de supabase/.secrets.local (não versionado) sem imprimi-los.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f supabase/.secrets.local ]; then
  echo "Crie supabase/.secrets.local a partir de supabase/.secrets.local.example" >&2
  exit 1
fi

# Carrega os segredos como variáveis de ambiente.
set -a
# shellcheck disable=SC1091
source supabase/.secrets.local
set +a

: "${SUPABASE_ACCESS_TOKEN:?defina SUPABASE_ACCESS_TOKEN em .secrets.local}"
: "${PROJECT_REF:?defina PROJECT_REF em .secrets.local}"
: "${MERCADOPAGO_ACCESS_TOKEN:?defina MERCADOPAGO_ACCESS_TOKEN em .secrets.local}"
: "${SITE_URL:?defina SITE_URL em .secrets.local}"

export SUPABASE_ACCESS_TOKEN
SB="npx --yes supabase@latest"

echo "→ Configurando secrets das functions…"
$SB secrets set --project-ref "$PROJECT_REF" \
  MERCADOPAGO_ACCESS_TOKEN="$MERCADOPAGO_ACCESS_TOKEN" \
  SITE_URL="$SITE_URL"

if [ -n "${MERCADOPAGO_WEBHOOK_SECRET:-}" ]; then
  $SB secrets set --project-ref "$PROJECT_REF" \
    MERCADOPAGO_WEBHOOK_SECRET="$MERCADOPAGO_WEBHOOK_SECRET"
fi

echo "→ Deploy: criar-pagamento"
$SB functions deploy criar-pagamento --project-ref "$PROJECT_REF"

echo "→ Deploy: mp-webhook"
$SB functions deploy mp-webhook --no-verify-jwt --project-ref "$PROJECT_REF"

echo "✓ Deploy concluído."
echo "Lembre de: 1) rodar supabase/payments.sql no SQL Editor;"
echo "           2) configurar o webhook no Mercado Pago apontando para"
echo "              https://$PROJECT_REF.supabase.co/functions/v1/mp-webhook"
