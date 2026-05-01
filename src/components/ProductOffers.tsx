import type { NormalizedProduct, ProviderOffer } from "@/lib/types";

export function ProductOffers({ product }: { product: NormalizedProduct }) {
  const sortedOffers = [...product.offers].sort((firstOffer, secondOffer) => {
    if (firstOffer.price === null) {
      return 1;
    }

    if (secondOffer.price === null) {
      return -1;
    }

    return firstOffer.price - secondOffer.price;
  });

  return (
    <section className="offers-panel" aria-labelledby="offers-heading">
      <div className="offers-heading-row">
        <h2 id="offers-heading">Ofertas por proveedor</h2>
        <span>{sortedOffers.length} oferta{sortedOffers.length === 1 ? "" : "s"}</span>
      </div>

      <ul className="detail-offers">
        {sortedOffers.map((offer) => (
          <li key={`${product.sku}-${offer.provider}`}>
            <div>
              <strong>{providerLabel(offer.provider)}</strong>
              <span>{offer.providerProductId ?? "Sin ID externo"}</span>
            </div>
            <div>
              <span>Precio</span>
              <strong>{formatPrice(offer)}</strong>
            </div>
            <div>
              <span>Stock</span>
              <strong>{formatStock(offer)}</strong>
            </div>
            <div>
              <span>Estado</span>
              <strong>{offer.available ? "Disponible" : "No disponible"}</strong>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatPrice(offer: ProviderOffer): string {
  if (offer.price === null) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: offer.currency ?? "CLP",
    maximumFractionDigits: 0,
  }).format(offer.price);
}

function formatStock(offer: ProviderOffer): string {
  return offer.stock === null ? "Sin dato" : String(offer.stock);
}

function providerLabel(provider: ProviderOffer["provider"]): string {
  const labels: Record<ProviderOffer["provider"], string> = {
    autopartsplus: "AutoPartsPlus",
    repuestosmax: "RepuestosMax",
    globalparts: "GlobalParts",
  };

  return labels[provider];
}
