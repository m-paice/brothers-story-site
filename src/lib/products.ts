import { supabase } from './supabase';
import type { Product, ProductVariant } from '../types/product';
import { products as seedProducts } from '../data/products';

// Linha crua da tabela `products` (snake_case do Postgres), com as variações.
interface VariantRow {
  id: number;
  size: string;
  stock: number;
}
interface ProductRow {
  id: number;
  name: string;
  price: number;
  original_price: number;
  category: string;
  description: string;
  image: string;
  images: string[] | null;
  is_new: boolean;
  weight: number;
  height: number;
  width: number;
  length: number;
  product_variants: VariantRow[] | null;
}

// Variação editável no admin (sem id ao criar)
export interface VariantInput {
  size: string;
  stock: number;
}

// Campos editáveis no admin (sem id e sem campos derivados/computados)
export type ProductInput = Omit<
  Product,
  'id' | 'discount' | 'isFavorite' | 'stock' | 'variants'
> & {
  variants: VariantInput[];
};

const DEFAULT_DIMS = { weight: 0.3, height: 2, width: 11, length: 16 };

const pct = (original: number, price: number): number =>
  original > price ? Math.round((1 - price / original) * 100) : 0;

// Converte a linha do banco para o tipo usado na UI
function rowToProduct(row: ProductRow): Product {
  const variants: ProductVariant[] = (row.product_variants ?? [])
    .map((v) => ({ id: v.id, size: v.size, stock: v.stock }))
    .sort((a, b) => a.id - b.id);
  const stock = variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    originalPrice: Number(row.original_price),
    discount: pct(Number(row.original_price), Number(row.price)),
    stock,
    variants,
    category: row.category,
    description: row.description,
    image: row.image,
    images:
      Array.isArray(row.images) && row.images.length > 0
        ? row.images
        : row.image
        ? [row.image]
        : [],
    isNew: row.is_new,
    isFavorite: false,
    weight: Number(row.weight ?? DEFAULT_DIMS.weight),
    height: Number(row.height ?? DEFAULT_DIMS.height),
    width: Number(row.width ?? DEFAULT_DIMS.width),
    length: Number(row.length ?? DEFAULT_DIMS.length),
  };
}

function productToRow(input: ProductInput) {
  return {
    name: input.name,
    price: input.price,
    original_price: input.originalPrice,
    // products.stock fica como cache do total (a fonte é product_variants)
    stock: input.variants.reduce((sum, v) => sum + (v.stock || 0), 0),
    category: input.category,
    description: input.description,
    image: input.image,
    images: input.images,
    is_new: input.isNew,
    weight: input.weight || DEFAULT_DIMS.weight,
    height: input.height || DEFAULT_DIMS.height,
    width: input.width || DEFAULT_DIMS.width,
    length: input.length || DEFAULT_DIMS.length,
  };
}

// Variações válidas (com tamanho preenchido)
const cleanVariants = (variants: VariantInput[]) =>
  variants
    .map((v) => ({ size: v.size.trim(), stock: Number(v.stock) || 0 }))
    .filter((v) => v.size !== '');

// Catálogo estático (modo offline, sem Supabase) — já traz variação "Único".
function offlineProducts(): Product[] {
  return seedProducts;
}

export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return offlineProducts();

  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .order('id', { ascending: true });

  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

export async function fetchProduct(id: number): Promise<Product | null> {
  if (!supabase) return offlineProducts().find((p) => p.id === id) ?? null;

  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return rowToProduct(data as ProductRow);
}

// Substitui o conjunto de variações de um produto (apaga e reinsere).
async function syncVariants(productId: number, variants: VariantInput[]) {
  if (!supabase) return;
  await supabase.from('product_variants').delete().eq('product_id', productId);
  const rows = cleanVariants(variants).map((v) => ({
    product_id: productId,
    size: v.size,
    stock: v.stock,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from('product_variants').insert(rows);
    if (error) throw error;
  }
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase
    .from('products')
    .insert(productToRow(input))
    .select('id')
    .single();
  if (error) throw error;

  const id = (data as { id: number }).id;
  await syncVariants(id, input.variants);
  return (await fetchProduct(id))!;
}

export async function updateProduct(
  id: number,
  input: ProductInput
): Promise<Product> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('products')
    .update(productToRow(input))
    .eq('id', id);
  if (error) throw error;

  await syncVariants(id, input.variants);
  return (await fetchProduct(id))!;
}

export async function deleteProduct(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  // product_variants tem ON DELETE CASCADE
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
