import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

export function Login() {
  const { session, signIn, configured, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname;

  // Já autenticado ao abrir a página
  if (session && !pendingRedirect) {
    return <Navigate to={from ?? (isSuperAdmin ? '/superadmin' : '/admin')} replace />;
  }

  // Aguarda o perfil carregar depois do signIn para decidir para onde ir
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (pendingRedirect && session && !authLoading) {
      navigate(from ?? (isSuperAdmin ? '/superadmin' : '/admin'), { replace: true });
    }
  }, [pendingRedirect, session, authLoading, isSuperAdmin, navigate, from]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      setPendingRedirect(true);
    } catch {
      setError('E-mail ou senha inválidos.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__brand">
          <img
            className="login__brand-img"
            src="/logo.jpg"
            alt="Brothers Story"
            width={32}
            height={32}
          />
          <span className="login__brand-text">Brothers Story</span>
        </div>
        <h1 className="login__title">Painel administrativo</h1>
        <p className="login__subtitle">Entre para gerenciar a loja.</p>

        {!configured && (
          <p className="login__warning">
            Supabase não configurado. Preencha o arquivo <code>.env</code> com as
            credenciais do projeto.
          </p>
        )}

        <div className="login__field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="login__field">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="login__error">{error}</p>}

        <button
          className="login__submit"
          type="submit"
          disabled={submitting || !configured}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
