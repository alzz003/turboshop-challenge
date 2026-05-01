import type {
  NormalizedProduct,
  Pagination,
  ProductFilters,
} from "@/lib/types";

export function mergeProductsBySku(
  products: NormalizedProduct[],
): NormalizedProduct[] {
  const productsBySku = new Map<string, NormalizedProduct>();

  for (const product of products) {
    const existingProduct = productsBySku.get(product.sku);

    if (!existingProduct) {
      productsBySku.set(product.sku, {
        ...product,
        offers: [...product.offers],
      });
      continue;
    }

    existingProduct.offers.push(...product.offers);
    fillMissingProductFields(existingProduct, product);
  }

  return Array.from(productsBySku.values());
}

export function filterProducts(
  products: NormalizedProduct[],
  filters: ProductFilters,
): NormalizedProduct[] {
  const search = normalizeText(filters.search);
  const brand = normalizeText(filters.brand);
  const model = normalizeText(filters.model);
  const year = normalizeText(filters.year);

  return products.filter((product) => {
    if (search && !matchesSearch(product, search)) {
      return false;
    }

    if (brand && !normalizeText(product.brand).includes(brand)) {
      return false;
    }

    if (model && !normalizeText(product.model).includes(model)) {
      return false;
    }

    if (year && !normalizeText(product.year).includes(year)) {
      return false;
    }

    return true;
  });
}

export function paginateProducts(
  products: NormalizedProduct[],
  page: number,
  limit: number,
): {
  products: NormalizedProduct[];
  pagination: Pagination;
} {
  const safeLimit = Math.max(1, limit);
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safeLimit;
  const paginatedProducts = products.slice(start, start + safeLimit);

  return {
    products: paginatedProducts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

function fillMissingProductFields(
  target: NormalizedProduct,
  source: NormalizedProduct,
): void {
  target.brand ??= source.brand;
  target.model ??= source.model;
  target.year ??= source.year;
  target.category ??= source.category;
  target.description ??= source.description;
  target.imageUrl ??= source.imageUrl;
}

function matchesSearch(product: NormalizedProduct, search: string): boolean {
  return [
    product.sku,
    product.name,
    product.brand,
    product.model,
    product.year,
    product.category,
    product.description,
  ].some((value) => normalizeText(value).includes(search));
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
