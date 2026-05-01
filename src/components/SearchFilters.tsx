import type { ProductFilters } from "@/lib/types";

type SearchFiltersProps = {
  filters: ProductFilters;
  isLoading: boolean;
  onChange: (filters: ProductFilters) => void;
  onReset: () => void;
};

export function SearchFilters({
  filters,
  isLoading,
  onChange,
  onReset,
}: SearchFiltersProps) {
  return (
    <form
      className="filters-panel"
      role="search"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="field search-field">
        <label htmlFor="search">Buscar</label>
        <input
          id="search"
          name="search"
          type="search"
          value={filters.search ?? ""}
          placeholder="SKU, nombre, marca o categoría"
          onChange={(event) =>
            onChange({ ...filters, search: event.currentTarget.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="brand">Marca</label>
        <input
          id="brand"
          name="brand"
          type="text"
          value={filters.brand ?? ""}
          onChange={(event) =>
            onChange({ ...filters, brand: event.currentTarget.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="model">Modelo</label>
        <input
          id="model"
          name="model"
          type="text"
          value={filters.model ?? ""}
          onChange={(event) =>
            onChange({ ...filters, model: event.currentTarget.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="year">Año</label>
        <input
          id="year"
          name="year"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={4}
          value={filters.year ?? ""}
          onChange={(event) =>
            onChange({ ...filters, year: event.currentTarget.value })
          }
        />
      </div>

      <button
        className="button secondary"
        type="button"
        onClick={onReset}
        disabled={isLoading}
      >
        Limpiar
      </button>
    </form>
  );
}
