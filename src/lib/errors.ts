import { ProviderHttpError, ProviderTimeoutError } from "@/lib/http";
import { PROVIDERS, type ProviderError, type ProviderName } from "@/lib/types";

export function toProviderError(error: unknown): ProviderError {
  const provider = extractProviderName(error);
  const originalError = extractOriginalError(error);

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

function extractProviderName(error: unknown): ProviderName {
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

function extractOriginalError(error: unknown): unknown {
  if (typeof error === "object" && error !== null && "error" in error) {
    return error.error;
  }

  return error;
}

function isProviderName(provider: string): provider is ProviderName {
  return PROVIDERS.includes(provider as ProviderName);
}
