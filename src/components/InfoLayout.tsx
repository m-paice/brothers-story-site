import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { PRIMARY_NAV } from '../data/navigation';
import '../App.css';

interface InfoLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Layout das páginas institucionais (Sobre, Envios, Trocas, Contato). */
export function InfoLayout({ title, subtitle, children }: InfoLayoutProps) {
  const location = useLocation();

  // Garante que cada página abra no topo.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner container">
          <Link to="/" className="header__logo">
            <img
              className="header__logo-img"
              src="/logo.jpg"
              alt="Brothers Story"
              width={30}
              height={30}
            />
            <span className="header__logo-text">Brothers Story</span>
          </Link>

          <nav className="header__nav" aria-label="Navegação principal">
            {PRIMARY_NAV.map((item) => (
              <Link key={item.to} to={item.to} className="header__nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header__actions">
            <Link to="/" className="header__store-link">
              Ver loja
            </Link>
          </div>
        </div>
      </header>

      <main className="content container">
        <article className="page">
          <header className="page__head">
            <h1 className="page__title">{title}</h1>
            {subtitle && <p className="page__subtitle">{subtitle}</p>}
          </header>
          <div className="page__body">{children}</div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
