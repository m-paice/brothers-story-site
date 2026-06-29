import type { FilterState, SortOption, ViewMode } from '../types/product';
import { FilterPanel } from './FilterPanel';

interface FilterBarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  count: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterOpen: boolean;
  onFilterToggle: () => void;
  activeFilterCount: number;
  availableColors: string[];
  availableSizes: string[];
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Novidades' },
  { value: 'priceAsc', label: 'Menor preço' },
  { value: 'priceDesc', label: 'Maior preço' },
  { value: 'relevance', label: 'Relevância' },
];

export function FilterBar({
  categories,
  activeCategory,
  onCategoryChange,
  sort,
  onSortChange,
  count,
  view,
  onViewChange,
  filters,
  onFiltersChange,
  filterOpen,
  onFilterToggle,
  activeFilterCount,
  availableColors,
  availableSizes,
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

        <div className="toolbar__controls">
          {/* Botão de filtros */}
          <button
            className={`filter-toggle ${activeFilterCount > 0 || filterOpen ? 'filter-toggle--active' : ''}`}
            onClick={onFilterToggle}
            aria-expanded={filterOpen}
            aria-label="Filtros"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtros
            {activeFilterCount > 0 && (
              <span className="filter-toggle__badge">{activeFilterCount}</span>
            )}
          </button>

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
      </div>

      {/* Painel de filtros */}
      {filterOpen && (
        <FilterPanel
          filters={filters}
          onChange={onFiltersChange}
          availableColors={availableColors}
          availableSizes={availableSizes}
          activeCount={activeFilterCount}
        />
      )}

      <div className="toolbar__meta">
        <p className="toolbar__count">
          {count} {count === 1 ? 'Produto' : 'Produtos'}
        </p>

        {/* Alternância de visualização — só no mobile */}
        <div className="view-toggle" role="group" aria-label="Visualização">
          <button
            className={`view-toggle__btn ${view === 'list' ? 'view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('list')}
            aria-label="Ver em lista"
            aria-pressed={view === 'list'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <button
            className={`view-toggle__btn ${view === 'grid' ? 'view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('grid')}
            aria-label="Ver em grade"
            aria-pressed={view === 'grid'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1" />
              <rect x="13" y="4" width="7" height="7" rx="1" />
              <rect x="4" y="13" width="7" height="7" rx="1" />
              <rect x="13" y="13" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
