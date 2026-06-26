// Tipos centrais do catálogo

export interface Product {
  id: number;
  name: string;
  price: number; // preço atual (com desconto aplicado)
  originalPrice: number; // preço antes do desconto
  discount: number; // percentual de desconto (0-100)
  stock: number; // unidades em estoque
  category: string;
  description: string;
  image: string; // URL da imagem
  isNew: boolean;
  isFavorite: boolean;
}

// Critérios de ordenação disponíveis na toolbar
export type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'relevance';

// Modo de visualização do catálogo no mobile (1 coluna ou 2 colunas)
export type ViewMode = 'list' | 'grid';

// Carrinho: mapa de id do produto -> quantidade
export type Cart = Record<number, number>;

// Categoria especial que representa "todas"
export const ALL_CATEGORIES = 'Todos';
