import { supabase } from './supabase';

/**
 * Faz upload de uma imagem para o bucket `produtos`.
 * Retorna a URL pública permanente.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado.');

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  // Nome único: timestamp + random para evitar colisão
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('produtos')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('produtos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Remove uma imagem do bucket `produtos` a partir da URL pública.
 * Ignora silenciosamente URLs que não sejam do Storage (ex.: Google Drive).
 */
export async function deleteProductImage(url: string): Promise<void> {
  if (!supabase || !url) return;

  // Extrai o path relativo dentro do bucket a partir da URL pública
  const marker = '/storage/v1/object/public/produtos/';
  const idx = url.indexOf(marker);
  if (idx === -1) return; // URL não é do nosso Storage — ignora

  const path = url.slice(idx + marker.length);
  await supabase.storage.from('produtos').remove([path]);
}
