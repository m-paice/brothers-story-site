import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PRIMARY_NAV } from '../data/navigation';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

/**
 * Cabeçalho fixo: logo da marca, navegação central e ações (busca, conta, carrinho).
 * No mobile o cabeçalho empilha e a barra de busca fica sempre visível.
 */
export function Header({
  search,
  onSearchChange,
  cartCount,
  onOpenCart,
}: HeaderProps) {
  // Busca expandível no desktop (no mobile a barra fica sempre visível via CSS)
  const [searchOpen, setSearchOpen] = useState(false);
  const { session } = useAuth();

  return (
    <header className="header">
      <div className="header__inner container">
        {/* Logo */}
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

        {/* Navegação central (desktop) */}
        <nav className="header__nav" aria-label="Navegação principal">
          {PRIMARY_NAV.map((item) => (
            <Link key={item.to} to={item.to} className="header__nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Ações */}
        <div className="header__actions">
          <button
            className="header__icon-btn header__search-toggle"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Buscar"
            aria-expanded={searchOpen}
          >
            <SearchIcon />
          </button>

          <Link
            to={session ? '/minha-conta' : '/entrar'}
            className="header__icon-btn"
            aria-label={session ? 'Minha conta' : 'Entrar'}
            title={session ? 'Minha conta' : 'Entrar'}
          >
            <UserIcon />
          </Link>

          <button
            className="header__icon-btn header__cart"
            onClick={onOpenCart}
            aria-label={`Carrinho com ${cartCount} ${
              cartCount === 1 ? 'item' : 'itens'
            }`}
          >
            <BagIcon />
            {cartCount > 0 && (
              <span className="header__cart-badge">{cartCount}</span>
            )}
          </button>
        </div>

        {/* Barra de busca (sempre visível no mobile; toggle no desktop) */}
        <div
          className={`header__search ${
            searchOpen ? 'header__search--open' : ''
          }`}
        >
          <SearchIcon />
          <input
            type="search"
            placeholder="Buscar no catálogo..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar produtos"
          />
        </div>
      </div>
    </header>
  );
}

/* --- Ícones --- */

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
