import { NextResponse } from "next/server";
import { toProviderError } from "@/lib/errors";
import { mergeProductsBySku } from "@/lib/normalize";
import { providerAdapters } from "@/lib/providers";
import type {
  NormalizedProduct,
  ProductDetailResponse,
  ProviderError,
} from "@/lib/types";

type ProductDetailRouteContext = {
  params: Promise<{
    sku: string;
  }>;
};

export async function GET(
  _request: Request,
  context: ProductDetailRouteContext,
) {
  const { sku } = await context.params;
  const decodedSku = decodeURIComponent(sku);

  const providerResults = await Promise.allSettled(
    providerAdapters.map(async (adapter) => ({
      provider: adapter.provider,
      products: await adapter.getBySku(decodedSku).catch((error: unknown) => {
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
      products.push(
        ...result.value.products.filter((product) => product.sku === decodedSku),
      );
      continue;
    }

    errors.push(toProviderError(result.reason));
  }

  const [product] = mergeProductsBySku(products);
  const response: ProductDetailResponse = {
    product: product ?? null,
    errors,
  };

  return NextResponse.json(response, {
    status: 200,
  });
}
