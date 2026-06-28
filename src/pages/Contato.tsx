import { useEffect } from 'react';
import { InfoLayout } from '../components/InfoLayout';
import { useSettings } from '../context/SettingsContext';
import { renderBody } from '../utils/body';

export function Contato() {
  const { settings } = useSettings();
  const { title, subtitle, body } = settings.pages.contato;
  const { instagram_url, whatsapp_url } = settings.store;

  useEffect(() => {
    document.title = `${title} — Brothers Story`;
    return () => {
      document.title = 'Brothers Story — Moda Masculina';
    };
  }, [title]);

  return (
    <InfoLayout title={title} subtitle={subtitle}>
      {renderBody(body)}

      <div className="page__contact">
        <a
          className="contact-card contact-card--whatsapp"
          href={whatsapp_url}
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
          href={instagram_url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="contact-card__channel">Instagram</span>
          <span className="contact-card__hint">
            @brothers_story_modamasculina
          </span>
        </a>
      </div>
    </InfoLayout>
  );
}
