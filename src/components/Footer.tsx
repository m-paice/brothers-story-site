/** Rodapé: call-to-action, colunas de links e redes sociais. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__cta container">
        <button className="footer__discover">Descubra Mais</button>
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
            Brother Store
          </span>
          <p className="footer__tagline">
            Redefinindo a experiência de luxo digital por meio de precisão
            técnica e estética minimalista.
          </p>
        </div>

        <nav className="footer__col" aria-label="Loja">
          <h3>Loja</h3>
          <a href="#">Coleções</a>
          <a href="#">Novidades</a>
          <a href="#">Arquivo</a>
        </nav>

        <nav className="footer__col" aria-label="Atendimento">
          <h3>Atendimento</h3>
          <a href="#">Envios</a>
          <a href="#">Trocas</a>
          <a href="#">Contato</a>
        </nav>

        <div className="footer__social">
          <a href="#" aria-label="Instagram" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
          </a>
          <a href="#" aria-label="X" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-7-6.2 7H1.4l8-9.2L1 2h7l4.9 6.5L18.9 2zm-2.4 18h1.9L7.6 4H5.6l10.9 16z" />
            </svg>
          </a>
          <a href="#" aria-label="YouTube" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="5" width="20" height="14" rx="4" />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
      </div>

      <div className="footer__bottom container">
        <p>
          © {new Date().getFullYear()} Brother Store. Todos os direitos
          reservados.
        </p>
        <p>Feito com precisão técnica.</p>
      </div>
    </footer>
  );
}
