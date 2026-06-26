import { Link } from 'react-router-dom';
import { INSTAGRAM_URL, WHATSAPP_URL } from '../data/navigation';

/** Rodapé: call-to-action, colunas de links e redes sociais. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__cta container">
        <Link to="/" className="footer__discover">
          Ver catálogo
        </Link>
      </div>

      <div className="footer__inner container">
        <div className="footer__brand">
          <span className="footer__logo">
            <img
              className="footer__logo-img"
              src="/logo.jpg"
              alt=""
              width={32}
              height={32}
            />
            Brothers Story
          </span>
          <p className="footer__tagline">
            Moda masculina com curadoria de peças que unem caimento, qualidade
            e atitude. Brothers Story.
          </p>
        </div>

        <nav className="footer__col" aria-label="Loja">
          <h3>Loja</h3>
          <Link to="/">Produtos</Link>
          <Link to="/sobre">Sobre</Link>
          <Link to="/contato">Contato</Link>
        </nav>

        <nav className="footer__col" aria-label="Atendimento">
          <h3>Atendimento</h3>
          <Link to="/envios">Envios</Link>
          <Link to="/trocas">Trocas e devoluções</Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </nav>

        <div className="footer__social">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="footer__social-link"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="footer__social-link"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.3c0-4.46 3.63-8.09 8.1-8.09zm4.68 11.43c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.3z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="footer__bottom container">
        <p>
          © {new Date().getFullYear()} Brothers Story. Todos os direitos
          reservados.
        </p>
        <p>Brothers Story · Moda masculina.</p>
      </div>
    </footer>
  );
}
