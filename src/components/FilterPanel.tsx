import type { FilterState } from '../types/product';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableColors: string[];
  availableSizes: string[];
  activeCount: number;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function FilterPanel({
  filters,
  onChange,
  availableColors,
  availableSizes,
  activeCount,
}: FilterPanelProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="filter-panel">
      {/* Status */}
      <div className="filter-section">
        <span className="filter-section__label">Status</span>
        <div className="filter-chips">
          <button
            className={`filter-chip ${filters.onlyNew ? 'filter-chip--active' : ''}`}
            onClick={() => set({ onlyNew: !filters.onlyNew })}
          >
            Novidade
          </button>
          <button
            className={`filter-chip ${filters.onlySale ? 'filter-chip--active' : ''}`}
            onClick={() => set({ onlySale: !filters.onlySale })}
          >
            Em promoção
          </button>
          <button
            className={`filter-chip ${filters.onlyInStock ? 'filter-chip--active' : ''}`}
            onClick={() => set({ onlyInStock: !filters.onlyInStock })}
          >
            Em estoque
          </button>
        </div>
      </div>

      {/* Preço */}
      <div className="filter-section">
        <span className="filter-section__label">Preço</span>
        <div className="filter-price">
          <input
            className="filter-price__input"
            type="number"
            min={0}
            placeholder="Mín"
            value={filters.priceMin}
            onChange={(e) => set({ priceMin: e.target.value })}
          />
          <span className="filter-price__sep">–</span>
          <input
            className="filter-price__input"
            type="number"
            min={0}
            placeholder="Máx"
            value={filters.priceMax}
            onChange={(e) => set({ priceMax: e.target.value })}
          />
        </div>
      </div>

      {/* Cores */}
      {availableColors.length > 0 && (
        <div className="filter-section">
          <span className="filter-section__label">Cor</span>
          <div className="filter-chips">
            {availableColors.map((color) => (
              <button
                key={color}
                className={`filter-chip ${filters.colors.includes(color) ? 'filter-chip--active' : ''}`}
                onClick={() => set({ colors: toggle(filters.colors, color) })}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tamanhos */}
      {availableSizes.length > 0 && (
        <div className="filter-section">
          <span className="filter-section__label">Tamanho</span>
          <div className="filter-chips">
            {availableSizes.map((size) => (
              <button
                key={size}
                className={`filter-chip ${filters.sizes.includes(size) ? 'filter-chip--active' : ''}`}
                onClick={() => set({ sizes: toggle(filters.sizes, size) })}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Limpar */}
      {activeCount > 0 && (
        <button
          className="filter-clear"
          onClick={() =>
            onChange({
              onlySale: false,
              onlyNew: false,
              onlyInStock: false,
              priceMin: '',
              priceMax: '',
              colors: [],
              sizes: [],
            })
          }
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
