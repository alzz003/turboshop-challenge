"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductOffers } from "@/components/ProductOffers";
import type {
  NormalizedProduct,
  ProductDetailResponse,
  ProviderError,
} from "@/lib/types";
import { providerLabel } from "@/lib/utils";

const DETAIL_POLLING_MS = 15000;
const CLIENT_REQUEST_TIMEOUT_MS = 10000;

type DetailState = {
  product: NormalizedProduct | null;
  providerErrors: ProviderError[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
};

export function ProductDetailClient({ sku }: { sku: string }) {
  const hasLoadedProductRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<DetailState>({
    product: null,
    providerErrors: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    lastUpdatedAt: null,
  });

  useEffect(() => {
    let isFetching = false;
    let activeController: AbortController | null = null;

    async function loadProduct(options: { silent?: boolean } = {}) {
      if (isFetching) {
        return;
      }

      isFetching = true;
      const controller = new AbortController();
      activeController = controller;
      let didTimeout = false;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, CLIENT_REQUEST_TIMEOUT_MS);

      setState((currentState) => ({
        ...currentState,
        isLoading: !options.silent && !currentState.product,
        isRefreshing: Boolean(options.silent) && Boolean(currentState.product),
        error: null,
      }));

      try {
        const response = await fetch(`/api/products/${encodeURIComponent(sku)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as ProductDetailResponse;

        if (!response.ok) {
          throw new Error("No pudimos cargar el detalle del producto.");
        }

        if (!data.product && data.errors.length > 0) {
          throw new Error("No pudimos cargar el detalle del producto.");
        }

        hasLoadedProductRef.current = Boolean(data.product);

        setState({
          product: data.product,
          providerErrors: data.errors,
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastUpdatedAt: new Date().toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        });
      } catch (error) {
        if (controller.signal.aborted && !didTimeout) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          isLoading: false,
          isRefreshing: false,
          error: currentState.product
            ? null
            : detailErrorMessage(error, didTimeout, controller.signal.aborted),
        }));
      } finally {
        window.clearTimeout(timeoutId);
        isFetching = false;
      }
    }

    loadProduct();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && hasLoadedProductRef.current) {
        loadProduct({ silent: true });
      }
    }, DETAIL_POLLING_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && hasLoadedProductRef.current) {
        loadProduct({ silent: true });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activeController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sku, reloadKey]);

  return (
    <main className="detail-shell" aria-busy={state.isLoading || state.isRefreshing}>
      <Link className="back-link" href="/">
        Volver al catálogo
      </Link>

      {state.isLoading ? <DetailSkeleton /> : null}

      {state.error ? (
        <section className="error-panel" role="alert">
          <div>
            <h1>No se pudo cargar el producto</h1>
            <p>{state.error}</p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => setReloadKey((currentKey) => currentKey + 1)}
          >
            Reintentar
          </button>
        </section>
      ) : null}

      {!state.isLoading && !state.error && !state.product ? (
        <section className="empty-state">
          <h1>Producto no encontrado</h1>
          <p>No encontramos ofertas para el SKU {sku}.</p>
          <Link className="button secondary" href="/">
            Volver al catálogo
          </Link>
        </section>
      ) : null}

      {state.product ? (
        <>
          <header className="detail-header">
            <div>
              <p className="eyebrow">{state.product.sku}</p>
              <h1>{state.product.name}</h1>
              <p>{state.product.description ?? "Sin descripción disponible."}</p>
            </div>
            <div className="detail-status" aria-live="polite">
              {state.isRefreshing
                ? "Actualizando ofertas..."
                : state.lastUpdatedAt
                  ? `Actualizado ${state.lastUpdatedAt}`
                  : "Actualizando"}
            </div>
          </header>

          {state.providerErrors.length > 0 ? (
            <section className="partial-warning" role="status">
              <strong>Resultados parciales</strong>
              <span>{formatProviderErrors(state.providerErrors)}</span>
            </section>
          ) : null}

          <section className="detail-layout">
            <article className="detail-summary">
              <h2>Información del repuesto</h2>
              <dl className="detail-meta">
                <MetaItem label="Marca" value={state.product.brand} />
                <MetaItem label="Modelo" value={state.product.model} />
                <MetaItem label="Año" value={state.product.year} />
                <MetaItem label="Categoría" value={state.product.category} />
              </dl>
              <button
                className="button secondary"
                type="button"
                disabled={state.isLoading || state.isRefreshing}
                onClick={() => setReloadKey((currentKey) => currentKey + 1)}
              >
                Actualizar ahora
              </button>
            </article>

            <ProductOffers product={state.product} />
          </section>
        </>
      ) : null}
    </main>
  );
}

function DetailSkeleton() {
  return (
    <section className="detail-skeleton" aria-label="Cargando detalle">
      <div className="skeleton-line short" />
      <div className="skeleton-line title" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-row">
        <div className="skeleton-pill" />
        <div className="skeleton-pill" />
      </div>
    </section>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "-"}</dd>
    </div>
  );
}

function formatProviderErrors(errors: ProviderError[]): string {
  const providerNames = errors.map((error) => providerLabel(error.provider));

  return `${providerNames.join(", ")} no respondieron correctamente. La información puede estar incompleta.`;
}

function detailErrorMessage(
  error: unknown,
  didTimeout: boolean,
  wasAborted: boolean,
): string {
  if (didTimeout || wasAborted) {
    return "La consulta tardó más de lo esperado. Probá tocar Reintentar en unos segundos.";
  }

  return "No pudimos cargar el producto en este momento. Probá tocar Reintentar.";
}
