import Link from "next/link";
import type { NormalizedProduct, ProviderOffer } from "@/lib/types";
import { providerLabel } from "@/lib/utils";

export function ProductCard({ product }: { product: NormalizedProduct }) {
  const bestOffer = getBestOffer(product.offers);
  const totalStock = formatTotalStock(product.offers);

  return (
    <article className="product-card">
      <div className="product-card-top">
        <span className="sku-label">{product.sku}</span>
        <span className="offer-count">
          {product.offers.length} proveedor{product.offers.length === 1 ? "" : "es"}
        </span>
      </div>

      <h2>{product.name}</h2>

      <dl className="product-meta">
        <MetaItem label="Marca" value={product.brand} />
        <MetaItem label="Modelo" value={product.model} />
        <MetaItem label="Año" value={product.year} />
      </dl>

      <p className="product-description">
        {product.description ?? "Sin descripción disponible."}
      </p>

      <div className="price-row">
        <div>
          <span className="price-label">Mejor precio</span>
          <strong>{formatPrice(bestOffer)}</strong>
        </div>
        <div>
          <span className="price-label">Stock total</span>
          <strong>{totalStock}</strong>
        </div>
      </div>

      <ul className="offer-list" aria-label={`Ofertas para ${product.name}`}>
        {product.offers.map((offer) => (
          <li key={`${product.sku}-${offer.provider}`}>
            <span>{providerLabel(offer.provider)}</span>
            <span>{formatOfferSummary(offer)}</span>
          </li>
        ))}
      </ul>

      <Link
        className="button secondary card-link"
        href={`/products/${encodeURIComponent(product.sku)}`}
      >
        Ver detalle
      </Link>
    </article>
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

function getBestOffer(offers: ProviderOffer[]): ProviderOffer | undefined {
  return offers
    .filter((offer) => typeof offer.price === "number")
    .sort((firstOffer, secondOffer) => {
      return (firstOffer.price ?? 0) - (secondOffer.price ?? 0);
    })[0];
}

function formatPrice(offer?: ProviderOffer): string {
  if (!offer || offer.price === null) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: offer.currency ?? "CLP",
    maximumFractionDigits: 0,
  }).format(offer.price);
}

function formatOfferSummary(offer: ProviderOffer): string {
  const price = formatPrice(offer);
  const stock = offer.stock === null ? "stock sin dato" : `${offer.stock} en stock`;

  return `${price} - ${stock}`;
}

function formatTotalStock(offers: ProviderOffer[]): string {
  if (offers.every((offer) => offer.stock === null)) {
    return "Consultar";
  }

  const totalStock = offers.reduce((total, offer) => total + (offer.stock ?? 0), 0);

  return String(totalStock);
}
