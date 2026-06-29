import { useEffect, useMemo, useState } from 'react';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
} from '../../lib/products';
import { ProductFormModal } from '../../components/admin/ProductFormModal';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import { resolveImageUrl } from '../../utils/image';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ALL_CATEGORIES, type Product } from '../../types/product';

const PAGE_SIZE = 8;

type StockFilter = 'todos' | 'in' | 'low' | 'out';

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'in', label: 'Em estoque' },
  { value: 'low', label: 'Baixo' },
  { value: 'out', label: 'Esgotado' },
];

const stockClass = (stock: number) =>
  stock === 0 ? 'is-out' : stock <= 5 ? 'is-low' : 'is-in';

export function ProductsAdmin() {
  const { currentStoreId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Filtros + paginação
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    fetchProducts(currentStoreId ?? undefined)
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err))
      .finally(() => setLoading(false));
  };

  // Carga inicial: não seta `loading` aqui (já inicia true) para evitar
  // setState síncrono dentro do effect.
  useEffect(() => {
    fetchProducts(currentStoreId ?? undefined)
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err))
      .finally(() => setLoading(false));
  }, [currentStoreId]);

  // Categorias disponíveis (derivadas do catálogo)
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category))).sort();
    return [ALL_CATEGORIES, ...unique];
  }, [products]);

  // Aplica busca + categoria + status de estoque
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        category === ALL_CATEGORIES || p.category === category;
      const matchesSearch =
        term === '' ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term);
      const matchesStock =
        stockFilter === 'todos' ||
        (stockFilter === 'in' && p.stock > 5) ||
        (stockFilter === 'low' && p.stock > 0 && p.stock <= 5) ||
        (stockFilter === 'out' && p.stock === 0);
      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [products, search, category, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Mantém a página dentro do intervalo válido se os filtros reduzirem a lista.
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // Volta para a primeira página sempre que um filtro muda.
  const resetTo = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

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
    else await createProduct(input, currentStoreId ?? undefined);
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

      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Buscar por nome ou categoria…"
          value={search}
          onChange={(e) => resetTo(setSearch)(e.target.value)}
        />
        <select
          className="admin-select"
          value={category}
          onChange={(e) => resetTo(setCategory)(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === ALL_CATEGORIES ? 'Todas as categorias' : c}
            </option>
          ))}
        </select>
        <div className="admin-filters admin-filters--inline">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`admin-chip ${
                stockFilter === f.value ? 'admin-chip--active' : ''
              }`}
              onClick={() => resetTo(setStockFilter)(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <span className="admin-spinner" aria-hidden="true" />
          <p>Carregando…</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="admin-empty">Nenhum produto encontrado com esses filtros.</p>
      ) : (
        <>
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
                {pageItems.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-table__product">
                        <img src={resolveImageUrl(product.image, 120)} alt="" />
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
                      <span
                        className={`stock-chip stock-chip--${stockClass(product.stock)}`}
                      >
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

          <div className="pagination">
            <span className="pagination__info">
              {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} de{' '}
              {filtered.length}
            </span>
            <div className="pagination__controls">
              <button
                className="pagination__btn"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`pagination__btn ${
                    n === currentPage ? 'pagination__btn--active' : ''
                  }`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="pagination__btn"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
          </div>
        </>
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
