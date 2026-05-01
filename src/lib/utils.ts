import type { ProviderName } from "@/lib/types";

const PROVIDER_LABELS: Record<ProviderName, string> = {
  autopartsplus: "AutoPartsPlus",
  repuestosmax: "RepuestosMax",
  globalparts: "GlobalParts",
};

export function providerLabel(provider: ProviderName): string {
  return PROVIDER_LABELS[provider];
}
