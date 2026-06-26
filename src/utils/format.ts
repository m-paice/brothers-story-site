// Formata número para moeda BRL (ex.: R$ 1.150,00)
export const formatPrice = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
