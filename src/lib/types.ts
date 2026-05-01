export const PROVIDERS = [
  "autopartsplus",
  "repuestosmax",
  "globalparts",
] as const;

export type ProviderName = (typeof PROVIDERS)[number];

export type ProviderOffer = {
  provider: ProviderName;
  providerProductId?: string;
  price: number | null;
  currency?: string;
  stock: number | null;
  available: boolean;
  rawUpdatedAt?: string;
};

export type NormalizedProduct = {
  sku: string;
  name: string;
  brand?: string;
  model?: string;
  year?: number | string;
  category?: string;
  description?: string;
  imageUrl?: string;
  offers: ProviderOffer[];
};

export type ProductFilters = {
  search?: string;
  brand?: string;
  model?: string;
  year?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ProviderError = {
  provider: ProviderName;
  message: string;
  status?: number;
  timedOut?: boolean;
};

export type ProductsResponse = {
  products: NormalizedProduct[];
  pagination: Pagination;
  errors: ProviderError[];
};

export type ProductDetailResponse = {
  product: NormalizedProduct | null;
  errors: ProviderError[];
};
