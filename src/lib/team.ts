import { supabase } from './supabase';

export type StoreRole = 'owner' | 'admin' | 'staff';

export interface StoreMember {
  id: string;
  user_id: string;
  role: StoreRole;
  created_at: string;
  nome: string | null;
}

interface RawMember {
  id: string;
  user_id: string;
  role: StoreRole;
  created_at: string;
  member: { nome: string | null } | null;
}

export async function fetchStoreMembers(storeId: string): Promise<StoreMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('store_members')
    .select('id, user_id, role, created_at, member:profiles!store_members_user_profile_fkey(nome)')
    .eq('store_id', storeId)
    .order('created_at');
  if (error) throw error;

  return ((data as unknown as RawMember[] | null) ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    nome: row.member?.nome ?? null,
  }));
}

export interface NewStoreMember {
  store_id: string;
  email: string;
  password: string;
  nome: string;
  role: 'admin' | 'staff';
}

/** Registra um novo funcionário via Edge Function (precisa de service role p/ criar o auth user). */
export async function createStoreMember(payload: NewStoreMember): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.functions.invoke('funcionarios', {
    body: payload,
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    let message = error.message;
    try {
      const parsed = ctx ? await ctx.json() : null;
      if (parsed?.error) message = parsed.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
}

/** Remove o vínculo do funcionário com a loja (não apaga a conta de login). */
export async function removeStoreMember(memberId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from('store_members').delete().eq('id', memberId);
  if (error) throw error;
}
