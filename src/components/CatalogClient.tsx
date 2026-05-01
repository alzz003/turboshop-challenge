"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { SearchFilters } from "@/components/SearchFilters";
import type {
  NormalizedProduct,
  Pagination,
  ProductFilters,
  ProviderError,
  ProductsResponse,
} from "@/lib/types";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 400;
const CATALOG_POLLING_MS = 20000;
const CLIENT_REQUEST_TIMEOUT_MS = 8000;

type CatalogState = {
  products: NormalizedProduct[];
  pagination: Pagination | null;
  providerErrors: ProviderError[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
};

const initialFilters: ProductFilters = {
  search: "",
  brand: "",
  model: "",
  year: "",
};

export function CatalogClient() {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search ?? "");
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<CatalogState>({
    products: [],
    pagination: null,
    providerErrors: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(filters.search ?? "");
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.brand, filters.model, filters.year]);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });

    setOptionalParam(params, "search", debouncedSearch);
    setOptionalParam(params, "brand", filters.brand);
    setOptionalParam(params, "model", filters.model);
    setOptionalParam(params, "year", filters.year);

    return params.toString();
  }, [debouncedSearch, filters.brand, filters.model, filters.year, page]);

  useEffect(() => {
    let isFetching = false;
    let activeController: AbortController | null = null;

    async function loadProducts(options: { silent?: boolean } = {}) {
      if (isFetching) {
        return;
      }

      isFetching = true;
      const isSilentRefresh = Boolean(options.silent);
      const controller = new AbortController();
      activeController = controller;
      let didTimeout = false;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, CLIENT_REQUEST_TIMEOUT_MS);

      setState((currentState) => ({
        ...currentState,
        isLoading: !isSilentRefresh && currentState.products.length === 0,
        isRefreshing: currentState.products.length > 0,
        error: null,
      }));

      try {
        const response = await fetch(`/api/products?${query}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as ProductsResponse;

        if (!response.ok || data.products.length === 0 && data.errors.length > 0) {
          throw new Error("No pudimos cargar el catálogo.");
        }

        setState((currentState) => ({
          products: data.products,
          pagination:
            isSilentRefresh && currentState.pagination
              ? currentState.pagination
              : data.pagination,
          providerErrors: data.errors,
          isLoading: false,
          isRefreshing: false,
          error: null,
        }));
      } catch {
        if (controller.signal.aborted && !didTimeout) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          products: currentState.products.length > 0 ? currentState.products : [],
          pagination:
            currentState.products.length > 0 ? currentState.pagination : null,
          providerErrors: currentState.providerErrors,
          isLoading: false,
          isRefreshing: false,
          error: getUserFriendlyCatalogError(
            didTimeout,
            controller.signal.aborted,
            currentState.products.length > 0,
          ),
        }));
      } finally {
        window.clearTimeout(timeoutId);
        isFetching = false;
      }
    }

    loadProducts();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadProducts({ silent: true });
      }
    }, CATALOG_POLLING_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadProducts({ silent: true });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activeController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [query, retryKey]);

  const hasProducts = state.products.length > 0;
  const paginationRange = getPaginationRange(state.pagination);

  return (
    <main className="catalog-shell" aria-busy={state.isLoading}>
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Repuestos en vivo</p>
          <h1>Catálogo de repuestos</h1>
        </div>
        <div className="catalog-count" aria-live="polite">
          {state.pagination
            ? `${state.pagination.totalItems} productos`
            : "Sin resultados"}
        </div>
      </header>

      <SearchFilters
        filters={filters}
        isLoading={state.isLoading}
        onChange={(nextFilters) => setFilters(nextFilters)}
        onReset={() => {
          setFilters(initialFilters);
          setPage(1);
        }}
      />

      <FloatingCatalogStatus
        error={state.error}
        isRefreshing={state.isRefreshing}
        providerErrors={state.providerErrors}
        onRetry={() => setRetryKey((currentKey) => currentKey + 1)}
      />

      {state.error && !hasProducts ? (
        <section className="error-panel" role="alert">
          <div>
            <h2>No se pudo cargar el catálogo</h2>
            <p>{state.error}</p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => setRetryKey((currentKey) => currentKey + 1)}
          >
            Reintentar
          </button>
        </section>
      ) : null}

      {!state.error && state.isLoading && !hasProducts ? (
        <CatalogSkeleton />
      ) : null}

      {!state.error && !state.isLoading && !hasProducts ? (
        <section className="empty-state">
          <h2>No encontramos productos</h2>
          <p>Probá ajustar la búsqueda o limpiar los filtros.</p>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setFilters(initialFilters);
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        </section>
      ) : null}

      {hasProducts ? (
        <>
          <section className="product-grid" aria-label="Resultados de catálogo">
            {state.products.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </section>

          {state.pagination ? (
            <PaginationControls
              pagination={state.pagination}
              rangeLabel={paginationRange}
              isRefreshing={state.isRefreshing}
              onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              onNext={() => setPage((currentPage) => currentPage + 1)}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function PaginationControls({
  pagination,
  rangeLabel,
  isRefreshing,
  onPrevious,
  onNext,
}: {
  pagination: Pagination;
  rangeLabel: string;
  isRefreshing: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="pagination-controls" aria-label="Paginación">
      <button
        className="pagination-button"
        type="button"
        onClick={onPrevious}
        disabled={isRefreshing || !pagination.hasPreviousPage}
      >
        Anterior
      </button>
      <div className="page-indicator" aria-live="polite">
        <strong>
          Página {pagination.page} de {pagination.totalPages}
        </strong>
        <span>{rangeLabel}</span>
        {isRefreshing ? <em>Actualizando datos...</em> : null}
      </div>
      <button
        className="pagination-button primary"
        type="button"
        onClick={onNext}
        disabled={isRefreshing || !pagination.hasNextPage}
      >
        Siguiente
      </button>
    </nav>
  );
}

function FloatingCatalogStatus({
  error,
  isRefreshing,
  providerErrors,
  onRetry,
}: {
  error: string | null;
  isRefreshing: boolean;
  providerErrors: ProviderError[];
  onRetry: () => void;
}) {
  const hasProviderErrors = !error && providerErrors.length > 0;

  if (!error && !isRefreshing && !hasProviderErrors) {
    return null;
  }

  return (
    <div className="floating-status-stack" aria-live="polite">
      {error ? (
        <section className="floating-status error" role="alert">
          <div>
            <strong>No se pudo actualizar</strong>
            <span>{error}</span>
          </div>
          <button className="button primary compact" type="button" onClick={onRetry}>
            Reintentar
          </button>
        </section>
      ) : null}

      {hasProviderErrors ? (
        <section className="floating-status warning" role="status">
          <div>
            <strong>Resultados parciales</strong>
            <span>{formatProviderErrors(providerErrors)}</span>
          </div>
        </section>
      ) : null}

      {isRefreshing ? (
        <section className="floating-status info" role="status">
          <div>
            <strong>Actualizando catálogo</strong>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <section className="product-grid" aria-label="Cargando productos">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="skeleton-card" aria-hidden="true" key={index}>
          <div className="skeleton-line short" />
          <div className="skeleton-line title" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-row">
            <div className="skeleton-pill" />
            <div className="skeleton-pill" />
          </div>
        </article>
      ))}
    </section>
  );
}

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value?: string,
) {
  const cleanValue = value?.trim();

  if (cleanValue) {
    params.set(key, cleanValue);
  }
}

function formatProviderErrors(errors: ProviderError[]): string {
  const providerNames = errors.map((error) => providerLabel(error.provider));

  return `${providerNames.join(", ")} no respondieron correctamente. El total puede variar.`;
}

function getUserFriendlyCatalogError(
  didTimeout: boolean,
  wasAborted: boolean,
  hasCurrentProducts: boolean,
): string {
  if (didTimeout || wasAborted) {
    return hasCurrentProducts
      ? "La actualización tardó más de lo esperado. Podés seguir viendo estos resultados o tocar Reintentar."
      : "La consulta tardó más de lo esperado. Probá tocar Reintentar en unos segundos.";
  }

  return hasCurrentProducts
    ? "No pudimos actualizar el catálogo. Podés seguir viendo estos resultados o tocar Reintentar."
    : "No pudimos cargar el catálogo en este momento. Probá tocar Reintentar.";
}

function providerLabel(provider: ProviderError["provider"]): string {
  const labels: Record<ProviderError["provider"], string> = {
    autopartsplus: "AutoPartsPlus",
    repuestosmax: "RepuestosMax",
    globalparts: "GlobalParts",
  };

  return labels[provider];
}

function getPaginationRange(pagination: Pagination | null): string {
  if (!pagination || pagination.totalItems === 0) {
    return "Sin productos para mostrar";
  }

  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.totalItems);

  return `Mostrando ${start}-${end} de ${pagination.totalItems}`;
}
