// Item do carrinho: guarda um snapshot do necessário para renderizar e fechar
// o pedido/venda sem depender de recarregar o produto (chave = variação).
export interface CartEntry {
  variantId: number;
  productId: number;
  name: string;
  price: number;
  image: string;
  size: string;
  qty: number;
}
