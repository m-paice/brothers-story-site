import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Role = 'admin' | 'customer' | 'superadmin' | null;

export interface StoreMembership {
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeRole: 'owner' | 'admin' | 'staff';
}

interface AuthContextValue {
  session: Session | null;
  role: Role;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  stores: StoreMembership[];
  currentStoreId: string | null;
  isSuperAdmin: boolean;
  isStoreAdmin: boolean;
  currentStoreRole: StoreMembership['storeRole'] | null;
  switchStore: (storeId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    nome: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [stores, setStores] = useState<StoreMembership[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);

  // Busca o papel do usuário (admin/customer) a partir do profiles.
  async function loadRole(userId: string | undefined) {
    if (!supabase || !userId) {
      setRole(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    setRole((data?.role as Role) ?? 'customer');
  }

  async function loadStores(userId: string | undefined) {
    if (!supabase || !userId) {
      setStores([]);
      return;
    }
    const { data } = await supabase
      .from('store_members')
      .select('role, stores(id, name, slug)')
      .eq('user_id', userId);

    type Row = {
      role: StoreMembership['storeRole'];
      stores: { id: string; name: string; slug: string } | null;
    };

    const memberships: StoreMembership[] = ((data as Row[] | null) ?? [])
      .filter((row): row is Row & { stores: NonNullable<Row['stores']> } =>
        row.stores !== null
      )
      .map((row) => ({
        storeId: row.stores.id,
        storeName: row.stores.name,
        storeSlug: row.stores.slug,
        storeRole: row.role,
      }));

    setStores(memberships);
    setCurrentStoreId((prev) => prev ?? memberships[0]?.storeId ?? null);
  }

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadRole(data.session?.user?.id);
      await loadStores(data.session?.user?.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      loadRole(next?.user?.id);
      loadStores(next?.user?.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const switchStore = (storeId: string) => setCurrentStoreId(storeId);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nome: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) throw error;
    // Sem sessão = e-mail de confirmação habilitado no Supabase.
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        isAdmin: role === 'admin',
        loading,
        configured: isSupabaseConfigured,
        stores,
        currentStoreId,
        isSuperAdmin: role === 'superadmin',
        isStoreAdmin: stores.some(
          (s) => s.storeRole === 'owner' || s.storeRole === 'admin'
        ),
        currentStoreRole:
          stores.find((s) => s.storeId === currentStoreId)?.storeRole ?? null,
        switchStore,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
