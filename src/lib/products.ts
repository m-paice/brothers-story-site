import { supabase } from './supabase';
import type { Product } from '../types/product';
import { products as seedProducts } from '../data/products';

// Linha crua da tabela `products` (snake_case do Postgres)
interface ProductRow {
  id: number;
  name: string;
  price: number;
  original_price: number;
  stock: number;
  category: string;
  description: string;
  image: string;
  is_new: boolean;
}

// Campos editáveis no admin (sem id e sem campos derivados/computados)
export type ProductInput = Omit<Product, 'id' | 'discount' | 'isFavorite'>;

const pct = (original: number, price: number): number =>
  original > price ? Math.round((1 - price / original) * 100) : 0;

// Converte a linha do banco para o tipo usado na UI
function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    originalPrice: Number(row.original_price),
    discount: pct(Number(row.original_price), Number(row.price)),
    stock: row.stock,
    category: row.category,
    description: row.description,
    image: row.image,
    isNew: row.is_new,
    isFavorite: false,
  };
}

function productToRow(input: ProductInput) {
  return {
    name: input.name,
    price: input.price,
    original_price: input.originalPrice,
    stock: input.stock,
    category: input.category,
    description: input.description,
    image: input.image,
    is_new: input.isNew,
  };
}

/**
 * Lista os produtos. Sem Supabase configurado, cai no catálogo estático
 * para que a loja continue funcionando em desenvolvimento.
 */
export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return seedProducts;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase
    .from('products')
    .insert(productToRow(input))
    .select('*')
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

export async function updateProduct(
  id: number,
  input: ProductInput
): Promise<Product> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase
    .from('products')
    .update(productToRow(input))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

export async function deleteProduct(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
