import type { NormalizedProduct, ProviderName } from "@/lib/types";
import { autopartsPlusAdapter } from "./autopartsplus";
import { globalPartsAdapter } from "./globalparts";
import { repuestosMaxAdapter } from "./repuestosmax";

export type ProviderAdapter = {
  provider: ProviderName;
  getCatalog: (page: number, limit: number) => Promise<NormalizedProduct[]>;
  getBySku: (sku: string) => Promise<NormalizedProduct[]>;
};

export const providerAdapters: ProviderAdapter[] = [
  autopartsPlusAdapter,
  repuestosMaxAdapter,
  globalPartsAdapter,
];

export {
  autopartsPlusAdapter,
  globalPartsAdapter,
  repuestosMaxAdapter,
};
