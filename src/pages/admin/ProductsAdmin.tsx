import { useEffect, useState } from 'react';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
} from '../../lib/products';
import { ProductFormModal } from '../../components/admin/ProductFormModal';
import { formatPrice } from '../../utils/format';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { Product } from '../../types/product';

export function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err))
      .finally(() => setLoading(false));
  };

  // Carga inicial: não seta `loading` aqui (já inicia true) para evitar
  // setState síncrono dentro do effect.
  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setModalOpen(true);
  };

  const handleSave = async (input: ProductInput) => {
    if (editing) await updateProduct(editing.id, input);
    else await createProduct(input);
    load();
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Remover "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id);
      load();
    } catch (err) {
      console.error('Falha ao remover produto:', err);
      alert('Não foi possível remover o produto.');
    }
  };

  const stockClass = (stock: number) =>
    stock === 0 ? 'is-out' : stock <= 5 ? 'is-low' : 'is-in';

  return (
    <div>
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Produtos</h1>
          <p className="admin-page__subtitle">{products.length} no catálogo</p>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={openCreate}
          disabled={!isSupabaseConfigured}
          title={
            isSupabaseConfigured
              ? undefined
              : 'Configure o Supabase para gerenciar produtos'
          }
        >
          + Novo produto
        </button>
      </div>

      {!isSupabaseConfigured && (
        <p className="admin-banner">
          Supabase não configurado — exibindo o catálogo estático em modo
          somente leitura.
        </p>
      )}

      {loading ? (
        <div className="admin-loading">
          <span className="admin-spinner" aria-hidden="true" />
          <p>Carregando…</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-table__product">
                      <img src={product.image} alt="" />
                      <div>
                        <span className="admin-table__name">
                          {product.name}
                          {product.isNew && (
                            <span className="admin-tag">Novo</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>
                    <span className={`stock-chip stock-chip--${stockClass(product.stock)}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button
                        className="admin-icon-btn"
                        onClick={() => openEdit(product)}
                        disabled={!isSupabaseConfigured}
                        aria-label={`Editar ${product.name}`}
                      >
                        Editar
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--danger"
                        onClick={() => handleDelete(product)}
                        disabled={!isSupabaseConfigured}
                        aria-label={`Remover ${product.name}`}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal
        open={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
