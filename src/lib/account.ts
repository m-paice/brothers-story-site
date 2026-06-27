import { supabase } from './supabase';
import type { Address, AddressInput, Profile } from '../types/account';

// ---- Perfil --------------------------------------------------------------
export async function fetchProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, nome, telefone, cpf')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(input: {
  nome: string;
  telefone: string;
  cpf: string;
}): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error('Sem sessão.');

  const { error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', id);
  if (error) throw error;
}

// ---- Endereços -----------------------------------------------------------
export async function fetchAddresses(): Promise<Address[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Address[];
}

export async function createAddress(
  input: AddressInput,
  makeDefault: boolean
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error('Sem sessão.');

  if (makeDefault) await clearDefault(id);
  const { error } = await supabase
    .from('addresses')
    .insert({ ...input, user_id: id, is_default: makeDefault });
  if (error) throw error;
}

export async function updateAddress(
  addressId: string,
  input: AddressInput,
  makeDefault: boolean
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error('Sem sessão.');

  if (makeDefault) await clearDefault(id);
  const { error } = await supabase
    .from('addresses')
    .update({ ...input, is_default: makeDefault })
    .eq('id', addressId);
  if (error) throw error;
}

export async function deleteAddress(addressId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from('addresses').delete().eq('id', addressId);
  if (error) throw error;
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error('Sem sessão.');

  await clearDefault(id);
  const { error } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId);
  if (error) throw error;
}

// Remove a marca de padrão de todos os endereços do usuário.
async function clearDefault(userId: string): Promise<void> {
  await supabase!
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId);
}
