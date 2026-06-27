import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { WHATSAPP_URL } from '../data/navigation';

type Kind = 'sucesso' | 'pendente' | 'erro';

const META: Record<
  Kind,
  { icon: string; color: string; title: string; text: string }
> = {
  sucesso: {
    icon: '✓',
    color: 'var(--color-success)',
    title: 'Pagamento aprovado!',
    text: 'Recebemos seu pagamento e seu pedido está confirmado. Em breve entramos em contato com os próximos passos.',
  },
  pendente: {
    icon: '⏳',
    color: 'var(--color-warning)',
    title: 'Pagamento pendente',
    text: 'Seu pagamento está sendo processado (comum no boleto/Pix). Assim que for confirmado, seu pedido segue para preparação.',
  },
  erro: {
    icon: '✕',
    color: 'var(--color-danger)',
    title: 'Pagamento não concluído',
    text: 'O pagamento foi recusado ou cancelado. Nenhuma cobrança foi feita — você pode tentar novamente quando quiser.',
  },
};

// Traduz o status que o Mercado Pago devolve na URL para o nosso resultado.
function statusToKind(status: string | null, fallback: Kind): Kind {
  switch (status) {
    case 'approved':
      return 'sucesso';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pendente';
    case 'rejected':
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'erro';
    default:
      return fallback;
  }
}

export function PaymentResult({ kind: fallbackKind }: { kind: Kind }) {
  const { confirmOrder } = useCart();
  const [params] = useSearchParams();
  const cleared = useRef(false);

  // O MP anexa collection_status / status na URL de retorno.
  const mpStatus =
    params.get('collection_status') ?? params.get('status') ?? null;
  const kind = statusToKind(mpStatus, fallbackKind);
  const meta = META[kind];
  const orderNumber =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('ef:lastOrder')
      : null;

  // Limpa o carrinho quando o pagamento foi aprovado.
  useEffect(() => {
    if (kind === 'sucesso' && !cleared.current) {
      cleared.current = true;
      const t = setTimeout(() => confirmOrder(), 0);
      return () => clearTimeout(t);
    }
  }, [kind, confirmOrder]);

  const waText = orderNumber
    ? `${WHATSAPP_URL}?text=${encodeURIComponent(
        `Olá! Quero acompanhar meu pedido #${orderNumber}.`
      )}`
    : WHATSAPP_URL;

  return (
    <main className="content container">
      <div className="payres">
        <div className="payres__mark" style={{ color: meta.color }}>
          {meta.icon}
        </div>
        <h1 className="payres__title">{meta.title}</h1>

        {orderNumber && (
          <p className="payres__order">
            Pedido <strong>#{orderNumber}</strong>
          </p>
        )}

        <p className="payres__text">{meta.text}</p>

        <div className="payres__actions">
          {kind === 'erro' ? (
            <Link to="/" className="payres__btn">
              Voltar e tentar de novo
            </Link>
          ) : (
            <Link to="/" className="payres__btn">
              Voltar à loja
            </Link>
          )}
          <a
            href={waText}
            target="_blank"
            rel="noreferrer"
            className="payres__btn payres__btn--ghost"
          >
            Acompanhar no WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
