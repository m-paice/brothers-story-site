import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';

interface TenantContextValue {
  storeSlug: string | null;
  storeId: string | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const defaultStoreId =
  (import.meta.env.VITE_DEFAULT_STORE_ID as string | undefined) ?? null;

// Detecta o slug da loja a partir do subdomínio em produção
// (loja1.brotherstore.com → "loja1"). Em localhost/IP não há subdomínio,
// então cai no modo loja única (fallback).
function detectStoreSlug(): string | null {
  const { hostname } = window.location;

  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length < 3) return null;

  const sub = parts[0];
  if (sub === 'www') return null;
  return sub;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [storeSlug] = useState<string | null>(detectStoreSlug);
  const [storeId, setStoreId] = useState<string | null>(
    storeSlug ? null : defaultStoreId
  );
  const [isLoading, setIsLoading] = useState<boolean>(storeSlug !== null);

  useEffect(() => {
    if (!storeSlug) return;

    if (!supabase) {
      setStoreId(defaultStoreId);
      setIsLoading(false);
      return;
    }

    let active = true;

    supabase
      .from('stores')
      .select('id')
      .eq('slug', storeSlug)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setStoreId((data?.id as string | undefined) ?? null);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeSlug]);

  return (
    <TenantContext.Provider value={{ storeSlug, storeId, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx)
    throw new Error('useTenant deve ser usado dentro de <TenantProvider>.');
  return ctx;
}
