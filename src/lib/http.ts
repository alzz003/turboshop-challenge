export const DEFAULT_PROVIDER_TIMEOUT_MS = 8000;

const DEFAULT_PROVIDERS_BASE_URL = "https://web-production-84144.up.railway.app";

export const PROVIDERS_BASE_URL = (
  process.env.PROVIDERS_BASE_URL ?? DEFAULT_PROVIDERS_BASE_URL
).replace(/\/$/, "");

type QueryValue = string | number | boolean | null | undefined;

type ProviderRequestOptions = {
  query?: Record<string, QueryValue>;
  timeoutMs?: number;
  headers?: HeadersInit;
};

export class ProviderHttpError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`Provider request failed with ${status} ${statusText}: ${url}`);
    this.name = "ProviderHttpError";
  }
}

export class ProviderTimeoutError extends Error {
  constructor(
    public readonly url: string,
    public readonly timeoutMs: number,
  ) {
    super(`Provider request timed out after ${timeoutMs}ms: ${url}`);
    this.name = "ProviderTimeoutError";
  }
}

export async function fetchProviderJson<T>(
  path: string,
  options: ProviderRequestOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  const url = buildProviderUrl(path, options.query);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ProviderHttpError(url, response.status, response.statusText);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ProviderHttpError(url, response.status, "Invalid JSON response");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderTimeoutError(url, timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildProviderUrl(
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${PROVIDERS_BASE_URL}${normalizedPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}
