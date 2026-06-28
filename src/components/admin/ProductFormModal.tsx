import { useState, type FormEvent } from 'react';
import type { Product } from '../../types/product';
import type { ProductInput } from '../../lib/products';
import { resolveImageUrl } from '../../utils/image';
import { uploadProductImage } from '../../lib/storage';

interface ProductFormModalProps {
  open: boolean;
  /** Produto em edição; null para criação. */
  product: Product | null;
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
}

interface VariantRow {
  color: string;
  size: string;
  stock: string;
}

interface FormState {
  name: string;
  price: string;
  originalPrice: string;
  category: string;
  description: string;
  images: string[];
  cover: number;
  isNew: boolean;
  weight: string;
  height: string;
  width: string;
  length: string;
  variants: VariantRow[];
}

const emptyForm = (): FormState => ({
  name: '',
  price: '',
  originalPrice: '',
  category: '',
  description: '',
  images: [''],
  cover: 0,
  isNew: false,
  weight: '',
  height: '',
  width: '',
  length: '',
  variants: [{ color: '', size: '', stock: '' }],
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
  const [uploading, setUploading] = useState<Set<number>>(new Set());

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
              images:
                product.images.length > 0
                  ? product.images
                  : product.image
                  ? [product.image]
                  : [''],
              cover: Math.max(
                0,
                (product.images.length > 0
                  ? product.images
                  : [product.image]
                ).indexOf(product.image)
              ),
              isNew: product.isNew,
              weight: String(product.weight),
              height: String(product.height),
              width: String(product.width),
              length: String(product.length),
              variants:
                product.variants.length > 0
                  ? product.variants.map((v) => ({
                      color: v.color,
                      size: v.size,
                      stock: String(v.stock),
                    }))
                  : [{ color: '', size: '', stock: '' }],
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
    setForm((f) => ({ ...f, variants: [...f.variants, { color: '', size: '', stock: '' }] }));

  const removeVariant = (index: number) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));

  const setImage = (index: number, url: string) =>
    setForm((f) => ({
      ...f,
      images: f.images.map((u, i) => (i === index ? url : u)),
    }));

  const addImage = () =>
    setForm((f) => ({ ...f, images: [...f.images, ''] }));

  const removeImage = (index: number) =>
    setForm((f) => {
      const images = f.images.filter((_, i) => i !== index);
      const cover = f.cover >= images.length ? Math.max(0, images.length - 1) : f.cover;
      return { ...f, images: images.length ? images : [''], cover };
    });

  const setCover = (index: number) => setForm((f) => ({ ...f, cover: index }));

  const handleUpload = async (index: number, file: File) => {
    setUploading((prev) => new Set(prev).add(index));
    try {
      const url = await uploadProductImage(file);
      setImage(index, url);
    } catch (err) {
      console.error('Falha ao enviar imagem:', err);
      setError('Não foi possível enviar a imagem. Tente novamente.');
    } finally {
      setUploading((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const variants = form.variants
      .map((v) => ({
        color: v.color.trim(),
        size: v.size.trim(),
        stock: Number(v.stock) || 0,
      }))
      .filter((v) => v.size !== '');

    if (variants.length === 0) {
      setError('Adicione ao menos um tamanho.');
      return;
    }

    // Galeria: remove vazios; capa = a escolhida (ou a primeira).
    const coverUrl = (form.images[form.cover] ?? '').trim();
    const images = form.images.map((u) => u.trim()).filter(Boolean);
    const image = coverUrl && images.includes(coverUrl) ? coverUrl : images[0] ?? '';

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
      image,
      images,
      isNew: form.isNew,
      weight: Number(form.weight) || 0,
      height: Number(form.height) || 0,
      width: Number(form.width) || 0,
      length: Number(form.length) || 0,
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
                    className="variant-row__color"
                    type="text"
                    placeholder="Cor (opcional)"
                    value={v.color}
                    onChange={(e) => setVariant(i, { color: e.target.value })}
                  />
                  <input
                    className="variant-row__size"
                    type="text"
                    placeholder="Tamanho"
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

          {/* Imagens (galeria) — escolha a capa */}
          <div className="checkout__field">
            <label>Imagens (escolha a capa)</label>
            <div className="img-editor">
              {form.images.map((url, i) => (
                <div className="img-row" key={i}>
                  <span className="img-row__preview">
                    {url.trim() ? (
                      <img src={resolveImageUrl(url, 120)} alt="" />
                    ) : (
                      <span className="img-row__ph">sem imagem</span>
                    )}
                  </span>
                  <label
                    className={`img-row__upload ${uploading.has(i) ? 'img-row__upload--loading' : ''}`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploading.has(i)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(i, file);
                        e.target.value = ''; // permite re-selecionar o mesmo arquivo
                      }}
                    />
                    {uploading.has(i) ? 'Enviando…' : '↑ Upload'}
                  </label>
                  <label
                    className={`img-row__cover ${
                      form.cover === i ? 'img-row__cover--active' : ''
                    }`}
                    title="Definir como capa"
                  >
                    <input
                      type="radio"
                      name="cover"
                      checked={form.cover === i}
                      onChange={() => setCover(i)}
                    />
                    Capa
                  </label>
                  <button
                    type="button"
                    className="variant-row__remove"
                    onClick={() => removeImage(i)}
                    disabled={form.images.length === 1}
                    aria-label="Remover imagem"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="variant-editor__add"
                onClick={addImage}
              >
                + Adicionar imagem
              </button>
            </div>
          </div>

          {/* Frete: peso e dimensões */}
          <div className="checkout__row">
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="pf-weight">Peso (kg)</label>
              <input
                id="pf-weight"
                type="number"
                min="0"
                step="0.01"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="pf-height">Altura (cm)</label>
              <input
                id="pf-height"
                type="number"
                min="0"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="pf-width">Largura (cm)</label>
              <input
                id="pf-width"
                type="number"
                min="0"
                value={form.width}
                onChange={(e) => setForm({ ...form, width: e.target.value })}
              />
            </div>
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="pf-length">Compr. (cm)</label>
              <input
                id="pf-length"
                type="number"
                min="0"
                value={form.length}
                onChange={(e) => setForm({ ...form, length: e.target.value })}
              />
            </div>
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
