import type { Product } from '../types/product';

// Percentual de desconto derivado do preço original e do preço final
const pct = (original: number, price: number): number =>
  original > price ? Math.round((1 - price / original) * 100) : 0;

// Imagem estável por seed (placeholder escuro) — troque pelas URLs reais depois
const img = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/700/900?grayscale`;

interface Seed {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  stock: number;
  category: string;
  description: string;
  seed: string;
  isNew?: boolean;
}

const seeds: Seed[] = [
  {
    id: 1,
    name: 'Tricô Técnico Moderno',
    price: 385,
    originalPrice: 385,
    stock: 3,
    category: 'Tricô',
    description:
      'Trama técnica ergonômica para máxima mobilidade e regulação térmica.',
    seed: 'techknit',
    isNew: true,
  },
  {
    id: 2,
    name: 'Trench Coat de Couro',
    price: 1150,
    originalPrice: 1350,
    stock: 12,
    category: 'Casacos',
    description: 'Couro de bezerro italiano integral com acabamento fosco profundo.',
    seed: 'trench',
  },
  {
    id: 3,
    name: 'Tênis Obsidian',
    price: 540,
    originalPrice: 720,
    stock: 9,
    category: 'Tênis',
    description:
      'Solado reforçado com fibra de carbono e cadarço de compressão adaptável.',
    seed: 'obsidian',
  },
  {
    id: 4,
    name: 'Calça Cargo Tech',
    price: 420,
    originalPrice: 420,
    stock: 4,
    category: 'Calças',
    description:
      'Tecido ripstop repelente à água com configuração modular de 8 bolsos.',
    seed: 'cargo',
  },
  {
    id: 5,
    name: 'Kit de Acessórios Prata',
    price: 260,
    originalPrice: 320,
    stock: 22,
    category: 'Acessórios',
    description: 'Coleção de anéis e pingente em prata de lei com acabamento à mão.',
    seed: 'silverset',
  },
  {
    id: 6,
    name: 'Camiseta Heavy Off-White',
    price: 180,
    originalPrice: 180,
    stock: 40,
    category: 'Camisetas',
    description:
      'Malha de algodão pesada 320g/m² com caimento boxy estruturado.',
    seed: 'heavytee',
    isNew: true,
  },
  {
    id: 7,
    name: 'Jaqueta Jeans Raw',
    price: 590,
    originalPrice: 590,
    stock: 7,
    category: 'Jaquetas',
    description: 'Jeans selvedge japonês cru que desbota de forma única com o tempo.',
    seed: 'denimraw',
  },
  {
    id: 8,
    name: 'Óculos Noir Edge',
    price: 336,
    originalPrice: 480,
    stock: 15,
    category: 'Acessórios',
    description: 'Armação de acetato com lentes polarizadas e ferragens em preto fosco.',
    seed: 'noiredge',
  },
  {
    id: 9,
    name: 'Calça Alfaiataria Cinza',
    price: 460,
    originalPrice: 460,
    stock: 0,
    category: 'Calças',
    description: 'Alfaiataria em mistura de lã com silhueta afiada e afunilada.',
    seed: 'tailored',
  },
  {
    id: 10,
    name: 'Bolsa Transversal Tech',
    price: 340,
    originalPrice: 420,
    stock: 11,
    category: 'Acessórios',
    description:
      'Corpo modular em Cordura com compartimentos magnéticos de acesso rápido.',
    seed: 'crossbody',
    isNew: true,
  },
  {
    id: 11,
    name: 'Suéter de Cashmere',
    price: 720,
    originalPrice: 720,
    stock: 5,
    category: 'Tricô',
    description: 'Cashmere mongol grau A em modelagem de gola careca relaxada.',
    seed: 'cashmere',
  },
  {
    id: 12,
    name: 'Calça Avant-Garde',
    price: 540,
    originalPrice: 680,
    stock: 8,
    category: 'Calças',
    description: 'Construção drapeada assimétrica em tecido técnico fosco.',
    seed: 'avantgarde',
  },
];

export const products: Product[] = seeds.map((s) => ({
  id: s.id,
  name: s.name,
  price: s.price,
  originalPrice: s.originalPrice,
  discount: pct(s.originalPrice, s.price),
  stock: s.stock,
  // Modo offline: uma variação "Único" com o estoque do seed.
  variants: [{ id: s.id, size: 'Único', stock: s.stock }],
  category: s.category,
  description: s.description,
  image: img(s.seed),
  images: [img(s.seed)],
  isNew: s.isNew ?? false,
  isFavorite: false,
  weight: 0.3,
  height: 2,
  width: 11,
  length: 16,
}));
