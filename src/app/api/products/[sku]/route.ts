import { NextResponse } from "next/server";
import { ProviderHttpError, ProviderTimeoutError } from "@/lib/http";
import { mergeProductsBySku } from "@/lib/normalize";
import { providerAdapters } from "@/lib/providers";
import type {
  NormalizedProduct,
  ProductDetailResponse,
  ProviderError,
  ProviderName,
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

function toProviderError(error: unknown): ProviderError {
  const provider = getProviderFromRejectedValue(error);
  const originalError = getOriginalError(error);

  if (originalError instanceof ProviderTimeoutError) {
    return {
      provider,
      message: "El proveedor no respondió dentro del tiempo esperado.",
      timedOut: true,
    };
  }

  if (originalError instanceof ProviderHttpError) {
    return {
      provider,
      message: "El proveedor respondió con un error HTTP.",
      status: originalError.status,
    };
  }

  return {
    provider,
    message:
      originalError instanceof Error ? originalError.message : "Error desconocido.",
  };
}

function getProviderFromRejectedValue(error: unknown): ProviderName {
  if (
    typeof error === "object" &&
    error !== null &&
    "provider" in error &&
    typeof error.provider === "string" &&
    isProviderName(error.provider)
  ) {
    return error.provider;
  }

  return "autopartsplus";
}

function getOriginalError(error: unknown): unknown {
  if (typeof error === "object" && error !== null && "error" in error) {
    return error.error;
  }

  return error;
}

function isProviderName(provider: string): provider is ProviderName {
  return providerAdapters.some((adapter) => adapter.provider === provider);
}
