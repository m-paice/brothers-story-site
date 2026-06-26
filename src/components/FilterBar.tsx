import type { SortOption } from '../types/product';

interface FilterBarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  count: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Novidades' },
  { value: 'priceAsc', label: 'Menor preço' },
  { value: 'priceDesc', label: 'Maior preço' },
  { value: 'relevance', label: 'Relevância' },
];

/**
 * Barra de filtros horizontal: abas de categoria (esquerda) e ordenação (direita).
 * Os tabs rolam horizontalmente no mobile.
 */
export function FilterBar({
  categories,
  activeCategory,
  onCategoryChange,
  sort,
  onSortChange,
  count,
}: FilterBarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar__row">
        {/* Abas de categoria */}
        <div className="tabs" role="tablist" aria-label="Categorias">
          {categories.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={activeCategory === category}
              className={`tabs__item ${
                activeCategory === category ? 'tabs__item--active' : ''
              }`}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Ordenação */}
        <label className="sort">
          <span className="sort__label">Ordenar:</span>
          <select
            className="sort__select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Ordenar produtos"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="toolbar__count">
        {count} {count === 1 ? 'Produto' : 'Produtos'}
      </p>
    </div>
  );
}
