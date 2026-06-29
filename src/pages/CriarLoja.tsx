import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/admin.css';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export function CriarLoja() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!supabase) {
    return (
      <div className="login">
        <div className="login__card">
          <div className="login__brand">
            <span className="login__brand-text">Brothers Story</span>
          </div>
          <p className="login__warning">
            Supabase não configurado. Preencha o arquivo <code>.env</code> com as
            credenciais do projeto.
          </p>
        </div>
      </div>
    );
  }
  const client = supabase;

  const handleNameChange = (value: string) => {
    setStoreName(value);
    if (!slugEdited) setStoreSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setStoreSlug(slugify(value));
  };

  const handleNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!storeName.trim() || !storeSlug.trim()) {
      setError('Preencha o nome e o slug da loja.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await client.functions.invoke(
        'criar-loja',
        {
          body: {
            store_name: storeName.trim(),
            store_slug: storeSlug.trim(),
            email: email.trim(),
            password,
          },
        }
      );

      if (fnError) {
        setError('Não foi possível criar a loja. Tente novamente.');
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }

      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError('Loja criada, mas o login falhou. Faça login manualmente.');
        return;
      }

      navigate('/admin/setup', { replace: true });
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      {step === 1 ? (
        <form className="login__card" onSubmit={handleNext}>
          <div className="login__brand">
            <span className="login__brand-text">Brothers Story</span>
          </div>
          <h1 className="login__title">Crie sua loja</h1>
          <p className="login__subtitle">Passo 1 de 2</p>

          <div className="login__field">
            <label htmlFor="store-name">Nome da loja</label>
            <input
              id="store-name"
              type="text"
              required
              value={storeName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="login__field">
            <label htmlFor="store-slug">Slug</label>
            <input
              id="store-slug"
              type="text"
              required
              value={storeSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
            <small>
              {storeSlug || 'suaslug'}.brotherstore.com
            </small>
          </div>

          {error && <p className="login__error">{error}</p>}

          <button className="login__submit" type="submit">
            Próximo →
          </button>

          <p className="login__subtitle">
            Já tem uma conta? <Link to="/admin/login">Entrar →</Link>
          </p>
        </form>
      ) : (
        <form className="login__card" onSubmit={handleSubmit}>
          <div className="login__brand">
            <span className="login__brand-text">Brothers Story</span>
          </div>
          <h1 className="login__title">Crie sua conta</h1>
          <p className="login__subtitle">Passo 2 de 2</p>

          <div className="login__field">
            <label htmlFor="signup-email">E-mail</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login__field">
            <label htmlFor="signup-password">Senha</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="login__field">
            <label htmlFor="signup-confirm">Confirmar senha</label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="login__error">{error}</p>}

          <button
            className="login__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Criando…' : 'Criar loja'}
          </button>

          <button
            type="button"
            className="login__back"
            onClick={() => {
              setError(null);
              setStep(1);
            }}
          >
            ← Voltar
          </button>

          <p className="login__subtitle">
            Já tem uma conta? <Link to="/admin/login">Entrar →</Link>
          </p>
        </form>
      )}
    </div>
  );
}
