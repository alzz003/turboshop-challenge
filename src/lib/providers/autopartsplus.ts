import { fetchProviderJson } from "@/lib/http";
import type { NormalizedProduct } from "@/lib/types";

type AutoPartsPlusPart = {
  part_id?: string;
  sku?: string;
  title?: string;
  desc?: string;
  brand_name?: string;
  category_name?: string;
  unit_price?: number | null;
  currency_code?: string;
  qty_available?: number | null;
  img_urls?: string[];
  fits_vehicles?: string[];
};

type AutoPartsPlusListResponse = {
  timestamp?: string;
  parts?: AutoPartsPlusPart[];
};

export const autopartsPlusAdapter = {
  provider: "autopartsplus" as const,

  async getCatalog(page: number, limit: number): Promise<NormalizedProduct[]> {
    const response = await fetchProviderJson<AutoPartsPlusListResponse>(
      "/api/autopartsplus/catalog",
      {
        query: { page, limit },
      },
    );

    return normalizeAutoPartsPlusParts(response.parts ?? [], response.timestamp);
  },

  async getBySku(sku: string): Promise<NormalizedProduct[]> {
    const response = await fetchProviderJson<AutoPartsPlusListResponse>(
      "/api/autopartsplus/parts",
      {
        query: { sku },
      },
    );

    return normalizeAutoPartsPlusParts(response.parts ?? [], response.timestamp);
  },
};

function normalizeAutoPartsPlusParts(
  parts: AutoPartsPlusPart[],
  rawUpdatedAt?: string,
): NormalizedProduct[] {
  return parts.flatMap((part) => {
    if (!part.sku) {
      return [];
    }

    const stock = typeof part.qty_available === "number" ? part.qty_available : null;
    const price = typeof part.unit_price === "number" ? part.unit_price : null;
    const vehicle = parseAutoPartsVehicle(part.fits_vehicles?.[0]);

    return [
      {
        sku: part.sku,
        name: part.title ?? part.sku,
        brand: part.brand_name,
        model: vehicle.model,
        year: vehicle.year,
        category: part.category_name,
        description: part.desc,
        imageUrl: part.img_urls?.[0],
        offers: [
          {
            provider: "autopartsplus",
            providerProductId: part.part_id,
            price,
            currency: part.currency_code,
            stock,
            available: stock !== null ? stock > 0 : false,
            rawUpdatedAt,
          },
        ],
      },
    ];
  });
}

function parseAutoPartsVehicle(vehicle?: string): {
  model?: string;
  year?: string;
} {
  if (!vehicle) {
    return {};
  }

  const yearMatch = vehicle.match(/\b\d{4}(?:-\d{4})?\b/);

  if (!yearMatch) {
    return { model: vehicle };
  }

  return {
    model: vehicle.slice(0, yearMatch.index).trim() || vehicle,
    year: yearMatch[0],
  };
}
