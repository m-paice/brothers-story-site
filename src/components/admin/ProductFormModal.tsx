import { useState, type FormEvent } from 'react';
import type { Product } from '../../types/product';
import type { ProductInput } from '../../lib/products';

interface ProductFormModalProps {
  open: boolean;
  /** Produto em edição; null para criação. */
  product: Product | null;
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
}

interface VariantRow {
  size: string;
  stock: string;
}

interface FormState {
  name: string;
  price: string;
  originalPrice: string;
  category: string;
  description: string;
  image: string;
  isNew: boolean;
  variants: VariantRow[];
}

const emptyForm = (): FormState => ({
  name: '',
  price: '',
  originalPrice: '',
  category: '',
  description: '',
  image: '',
  isNew: false,
  variants: [{ size: '', stock: '' }],
});

export function ProductFormModal({
  open,
  product,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza o formulário a cada nova abertura do modal — padrão do React de
  // ajustar estado durante a renderização (sem useEffect).
  const signature = open ? (product ? `edit-${product.id}` : 'new') : null;
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    if (open) {
      setError(null);
      setForm(
        product
          ? {
              name: product.name,
              price: String(product.price),
              originalPrice: String(product.originalPrice),
              category: product.category,
              description: product.description,
              image: product.image,
              isNew: product.isNew,
              variants:
                product.variants.length > 0
                  ? product.variants.map((v) => ({
                      size: v.size,
                      stock: String(v.stock),
                    }))
                  : [{ size: '', stock: '' }],
            }
          : emptyForm()
      );
    }
  }

  const setVariant = (index: number, patch: Partial<VariantRow>) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));

  const addVariant = () =>
    setForm((f) => ({ ...f, variants: [...f.variants, { size: '', stock: '' }] }));

  const removeVariant = (index: number) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const variants = form.variants
      .map((v) => ({ size: v.size.trim(), stock: Number(v.stock) || 0 }))
      .filter((v) => v.size !== '');

    if (variants.length === 0) {
      setError('Adicione ao menos um tamanho.');
      return;
    }

    setSaving(true);
    setError(null);

    const price = Number(form.price);
    const original = Number(form.originalPrice) || price;

    const input: ProductInput = {
      name: form.name.trim(),
      price,
      originalPrice: original,
      category: form.category.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      isNew: form.isNew,
      variants,
    };

    try {
      await onSave(input);
      onClose();
    } catch (err) {
      console.error('Falha ao salvar produto:', err);
      setError('Não foi possível salvar. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`checkout__overlay ${
          open ? 'checkout__overlay--visible' : ''
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`checkout ${open ? 'checkout--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Editar produto' : 'Novo produto'}
        aria-hidden={!open}
      >
        <div className="checkout__header">
          <h2 className="checkout__title">
            {product ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button
            className="checkout__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="checkout__field">
            <label htmlFor="pf-name">Nome</label>
            <input
              id="pf-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="checkout__row">
            <div className="checkout__field">
              <label htmlFor="pf-price">Preço (R$)</label>
              <input
                id="pf-price"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="checkout__field">
              <label htmlFor="pf-original">Preço original (R$)</label>
              <input
                id="pf-original"
                type="number"
                min="0"
                step="0.01"
                value={form.originalPrice}
                onChange={(e) =>
                  setForm({ ...form, originalPrice: e.target.value })
                }
              />
            </div>
          </div>

          <div className="checkout__field">
            <label htmlFor="pf-category">Categoria</label>
            <input
              id="pf-category"
              type="text"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>

          {/* Tamanhos / estoque por variação */}
          <div className="checkout__field">
            <label>Tamanhos e estoque</label>
            <div className="variant-editor">
              {form.variants.map((v, i) => (
                <div className="variant-row" key={i}>
                  <input
                    className="variant-row__size"
                    type="text"
                    placeholder="Tamanho (P, M, 42, Único…)"
                    value={v.size}
                    onChange={(e) => setVariant(i, { size: e.target.value })}
                  />
                  <input
                    className="variant-row__stock"
                    type="number"
                    min="0"
                    placeholder="Estoque"
                    value={v.stock}
                    onChange={(e) => setVariant(i, { stock: e.target.value })}
                  />
                  <button
                    type="button"
                    className="variant-row__remove"
                    onClick={() => removeVariant(i)}
                    disabled={form.variants.length === 1}
                    aria-label="Remover tamanho"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="variant-editor__add"
                onClick={addVariant}
              >
                + Adicionar tamanho
              </button>
            </div>
          </div>

          <div className="checkout__field">
            <label htmlFor="pf-image">URL da imagem</label>
            <input
              id="pf-image"
              type="url"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
          </div>

          <div className="checkout__field">
            <label htmlFor="pf-description">Descrição</label>
            <textarea
              id="pf-description"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <label className="product-form__check">
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
            />
            Marcar como novidade
          </label>

          {error && <p className="checkout__error">{error}</p>}

          <div className="product-form__actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
