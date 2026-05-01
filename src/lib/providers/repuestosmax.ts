import { fetchProviderJson } from "@/lib/http";
import type { NormalizedProduct } from "@/lib/types";

type RepuestosMaxProduct = {
  identificacion?: {
    codigoInterno?: string;
    sku?: string;
  };
  informacionBasica?: {
    nombre?: string;
    descripcion?: string;
    marca?: {
      nombre?: string;
    };
    categoria?: {
      nombre?: string;
    };
  };
  precio?: {
    valor?: number | null;
    moneda?: string;
  };
  inventario?: {
    cantidad?: number | null;
  };
  multimedia?: {
    imagenes?: Array<{
      url?: string;
    }>;
  };
  compatibilidad?: {
    vehiculos?: Array<{
      modelo?: string;
      anios?: {
        desde?: number;
        hasta?: number;
      };
    }>;
  };
};

type RepuestosMaxCatalogResponse = {
  consulta?: {
    fechaHora?: string;
  };
  productos?: RepuestosMaxProduct[];
};

type RepuestosMaxSearchResponse = {
  consulta?: {
    fechaHora?: string;
  };
  resultado?: {
    productos?: RepuestosMaxProduct[];
  };
};

export const repuestosMaxAdapter = {
  provider: "repuestosmax" as const,

  async getCatalog(page: number, limit: number): Promise<NormalizedProduct[]> {
    const response = await fetchProviderJson<RepuestosMaxCatalogResponse>(
      "/api/repuestosmax/catalogo",
      {
        query: { pagina: page, limite: limit },
      },
    );

    return normalizeRepuestosMaxProducts(
      response.productos ?? [],
      response.consulta?.fechaHora,
    );
  },

  async getBySku(sku: string): Promise<NormalizedProduct[]> {
    const response = await fetchProviderJson<RepuestosMaxSearchResponse>(
      "/api/repuestosmax/productos",
      {
        query: { codigo: sku },
      },
    );

    return normalizeRepuestosMaxProducts(
      response.resultado?.productos ?? [],
      response.consulta?.fechaHora,
    );
  },
};

function normalizeRepuestosMaxProducts(
  products: RepuestosMaxProduct[],
  rawUpdatedAt?: string,
): NormalizedProduct[] {
  return products.flatMap((product) => {
    const sku = product.identificacion?.sku;

    if (!sku) {
      return [];
    }

    const stock =
      typeof product.inventario?.cantidad === "number"
        ? product.inventario.cantidad
        : null;
    const price =
      typeof product.precio?.valor === "number" ? product.precio.valor : null;
    const vehicle = product.compatibilidad?.vehiculos?.[0];

    return [
      {
        sku,
        name: product.informacionBasica?.nombre ?? sku,
        brand: product.informacionBasica?.marca?.nombre,
        model: vehicle?.modelo,
        year: formatYearRange(vehicle?.anios?.desde, vehicle?.anios?.hasta),
        category: product.informacionBasica?.categoria?.nombre,
        description: product.informacionBasica?.descripcion,
        imageUrl: product.multimedia?.imagenes?.[0]?.url,
        offers: [
          {
            provider: "repuestosmax",
            providerProductId: product.identificacion?.codigoInterno,
            price,
            currency: product.precio?.moneda,
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
