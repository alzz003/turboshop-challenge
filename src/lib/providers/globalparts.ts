import { fetchProviderJson } from "@/lib/http";
import type { NormalizedProduct } from "@/lib/types";

type GlobalPartsItem = {
  ItemHeader?: {
    InternalId?: string;
    ExternalReferences?: {
      SKU?: {
        Value?: string;
      };
    };
  };
  ProductDetails?: {
    NameInfo?: {
      DisplayName?: string;
    };
    Description?: {
      FullText?: string;
    };
    BrandInfo?: {
      BrandName?: string;
    };
    CategoryInfo?: {
      PrimaryCategory?: {
        Name?: string;
      };
    };
  };
  PricingInfo?: {
    ListPrice?: {
      Amount?: number | null;
      CurrencyCode?: string;
    };
  };
  AvailabilityInfo?: {
    QuantityInfo?: {
      AvailableQuantity?: number | null;
    };
  };
  MediaAssets?: {
    Images?: Array<{
      ImageUrl?: string;
      IsPrimary?: boolean;
    }>;
  };
  VehicleCompatibility?: {
    CompatibleVehicles?: Array<{
      Model?: {
        Name?: string;
      };
      YearRange?: {
        StartYear?: number;
        EndYear?: number;
      };
    }>;
  };
};

type GlobalPartsCatalogResponse = {
  ResponseEnvelope?: {
    Header?: {
      Timestamp?: string;
    };
    Body?: {
      CatalogListing?: {
        Items?: GlobalPartsItem[];
      };
    };
  };
};

type GlobalPartsSearchResponse = {
  ResponseEnvelope?: {
    Header?: {
      Timestamp?: string;
    };
    Body?: {
      SearchResults?: {
        Items?: GlobalPartsItem[];
      };
    };
  };
};

export const globalPartsAdapter = {
  provider: "globalparts" as const,

  async getCatalog(page: number, limit: number): Promise<NormalizedProduct[]> {
    const response = await fetchProviderJson<GlobalPartsCatalogResponse>(
      "/api/globalparts/inventory/catalog",
      {
        query: { page, itemsPerPage: limit },
      },
    );

    return normalizeGlobalPartsItems(
      response.ResponseEnvelope?.Body?.CatalogListing?.Items ?? [],
      response.ResponseEnvelope?.Header?.Timestamp,
    );
  },

  async getBySku(sku: string): Promise<NormalizedProduct[]> {
    const response = await fetchProviderJson<GlobalPartsSearchResponse>(
      "/api/globalparts/inventory/search",
      {
        query: { partNumber: sku },
      },
    );

    return normalizeGlobalPartsItems(
      response.ResponseEnvelope?.Body?.SearchResults?.Items ?? [],
      response.ResponseEnvelope?.Header?.Timestamp,
    );
  },
};

function normalizeGlobalPartsItems(
  items: GlobalPartsItem[],
  rawUpdatedAt?: string,
): NormalizedProduct[] {
  return items.flatMap((item) => {
    const sku = item.ItemHeader?.ExternalReferences?.SKU?.Value;

    if (!sku) {
      return [];
    }

    const stock =
      typeof item.AvailabilityInfo?.QuantityInfo?.AvailableQuantity === "number"
        ? item.AvailabilityInfo.QuantityInfo.AvailableQuantity
        : null;
    const price =
      typeof item.PricingInfo?.ListPrice?.Amount === "number"
        ? item.PricingInfo.ListPrice.Amount
        : null;
    const vehicle = item.VehicleCompatibility?.CompatibleVehicles?.[0];
    const image =
      item.MediaAssets?.Images?.find((candidate) => candidate.IsPrimary)
        ?.ImageUrl ?? item.MediaAssets?.Images?.[0]?.ImageUrl;

    return [
      {
        sku,
        name: item.ProductDetails?.NameInfo?.DisplayName ?? sku,
        brand: item.ProductDetails?.BrandInfo?.BrandName,
        model: vehicle?.Model?.Name,
        year: formatYearRange(
          vehicle?.YearRange?.StartYear,
          vehicle?.YearRange?.EndYear,
        ),
        category: item.ProductDetails?.CategoryInfo?.PrimaryCategory?.Name,
        description: item.ProductDetails?.Description?.FullText,
        imageUrl: image,
        offers: [
          {
            provider: "globalparts",
            providerProductId: item.ItemHeader?.InternalId,
            price,
            currency: item.PricingInfo?.ListPrice?.CurrencyCode,
            stock,
            available: stock !== null ? stock > 0 : false,
            rawUpdatedAt,
          },
        ],
      },
    ];
  });
}

function formatYearRange(
  startYear?: number,
  endYear?: number,
): string | undefined {
  if (startYear && endYear) {
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  }

  return startYear ? String(startYear) : undefined;
}
