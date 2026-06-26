import { InfoLayout } from '../components/InfoLayout';
import { INSTAGRAM_URL, WHATSAPP_URL } from '../data/navigation';

export function Contato() {
  return (
    <InfoLayout
      title="Fale com a gente"
      subtitle="Atendimento direto, sem complicação."
    >
      <p>
        Dúvidas sobre tamanhos, disponibilidade, pedidos ou trocas? Nosso
        atendimento é feito de forma próxima e direta. Escolha o canal de sua
        preferência:
      </p>

      <div className="page__contact">
        <a
          className="contact-card contact-card--whatsapp"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
        >
          <span className="contact-card__channel">WhatsApp</span>
          <span className="contact-card__hint">
            Resposta rápida para pedidos e dúvidas
          </span>
        </a>

        <a
          className="contact-card"
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
        >
          <span className="contact-card__channel">Instagram</span>
          <span className="contact-card__hint">
            @brothers_story_modamasculina
          </span>
        </a>
      </div>

      <p>
        Preferimos o WhatsApp para tratar de pedidos: assim conseguimos
        confirmar disponibilidade, combinar o pagamento e acompanhar a entrega
        com você em tempo real.
      </p>
    </InfoLayout>
  );
}
