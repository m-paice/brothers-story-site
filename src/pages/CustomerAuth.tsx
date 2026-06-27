import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function CustomerAuth() {
  const { session, signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/minha-conta';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to={next} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate(next, { replace: true });
      } else {
        const { needsConfirmation } = await signUp(email, password, nome);
        if (needsConfirmation) {
          setInfo(
            'Conta criada! Confirme seu e-mail pelo link que enviamos para entrar.'
          );
          setMode('login');
        } else {
          navigate(next, { replace: true });
        }
      }
    } catch {
      setError(
        mode === 'login'
          ? 'E-mail ou senha inválidos.'
          : 'Não foi possível criar a conta. O e-mail pode já estar em uso.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="content container">
      <div className="auth">
        <h1 className="auth__title">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="auth__subtitle">
          {mode === 'login'
            ? 'Acesse sua conta para comprar e acompanhar seus pedidos.'
            : 'Crie sua conta para finalizar a compra e acompanhar seus pedidos.'}
        </p>

        {!configured && (
          <p className="auth__warning">Loja em modo offline (sem Supabase).</p>
        )}

        <form className="auth__form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="checkout__field">
              <label htmlFor="auth-nome">Nome</label>
              <input
                id="auth-nome"
                type="text"
                autoComplete="name"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          )}
          <div className="checkout__field">
            <label htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="checkout__error">{error}</p>}
          {info && <p className="auth__info">{info}</p>}

          <button
            type="submit"
            className="auth__submit"
            disabled={loading || !configured}
          >
            {loading
              ? 'Aguarde…'
              : mode === 'login'
              ? 'Entrar'
              : 'Criar conta'}
          </button>
        </form>

        <button
          className="auth__toggle"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'login'
            ? 'Não tem conta? Criar agora'
            : 'Já tem conta? Entrar'}
        </button>
      </div>
    </main>
  );
}
