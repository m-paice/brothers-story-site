// Tipos centrais do catálogo

// Variação de um produto (tamanho) com estoque próprio
export interface ProductVariant {
  id: number;
  size: string;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  price: number; // preço atual (com desconto aplicado)
  originalPrice: number; // preço antes do desconto
  discount: number; // percentual de desconto (0-100)
  stock: number; // estoque total (soma das variações)
  variants: ProductVariant[]; // tamanhos disponíveis
  category: string;
  description: string;
  image: string; // URL da imagem
  isNew: boolean;
  isFavorite: boolean;
  // Frete (SuperFrete): peso em kg, dimensões em cm
  weight: number;
  height: number;
  width: number;
  length: number;
}

// Critérios de ordenação disponíveis na toolbar
export type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'relevance';

// Modo de visualização do catálogo no mobile (1 coluna ou 2 colunas)
export type ViewMode = 'list' | 'grid';

// Carrinho: mapa de id do produto -> quantidade
export type Cart = Record<number, number>;

// Categoria especial que representa "todas"
export const ALL_CATEGORIES = 'Todos';
