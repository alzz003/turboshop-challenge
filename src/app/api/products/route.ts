import { NextResponse } from "next/server";
import { toProviderError } from "@/lib/errors";
import {
  filterProducts,
  mergeProductsBySku,
  paginateProducts,
} from "@/lib/normalize";
import { providerAdapters } from "@/lib/providers";
import type {
  NormalizedProduct,
  ProductFilters,
  ProviderError,
  ProductsResponse,
} from "@/lib/types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 60;
const MAX_PROVIDER_SAMPLE_LIMIT = 120;
const PROVIDER_SAMPLE_PAGE_MULTIPLIER = 4;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE);
  const limit = Math.min(
    parsePositiveInteger(searchParams.get("limit"), DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const filters: ProductFilters = {
    search: searchParams.get("search") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    model: searchParams.get("model") ?? undefined,
    year: searchParams.get("year") ?? undefined,
  };
  const providerSampleLimit = Math.min(
    limit * PROVIDER_SAMPLE_PAGE_MULTIPLIER,
    MAX_PROVIDER_SAMPLE_LIMIT,
  );

  const providerResults = await Promise.allSettled(
    providerAdapters.map(async (adapter) => ({
      provider: adapter.provider,
      products: await adapter
        .getCatalog(1, providerSampleLimit)
        .catch((error: unknown) => {
          throw {
            provider: adapter.provider,
            error,
          };
        }),
    })),
  );

  const products: NormalizedProduct[] = [];
  const errors: ProviderError[] = [];

  for (const result of providerResults) {
    if (result.status === "fulfilled") {
      products.push(...result.value.products);
      continue;
    }

    errors.push(toProviderError(result.reason));
  }

  const mergedProducts = mergeProductsBySku(products);
  const filteredProducts = filterProducts(mergedProducts, filters);
  const paginated = paginateProducts(filteredProducts, page, limit);

  const response: ProductsResponse = {
    products: paginated.products,
    pagination: paginated.pagination,
    errors,
  };

  return NextResponse.json(response, {
    status: 200,
  });
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}
