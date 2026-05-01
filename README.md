# Marketplace de repuestos

## Qué hace la app

Esta app es un marketplace web de repuestos que consulta catálogos de varios proveedores públicos brindados por Turboshop, normaliza sus respuestas y muestra un catálogo unificado con búsqueda, filtros básicos, paginación, precio, stock y proveedores disponibles.

También permite entrar al detalle de un producto por SKU para ver información consolidada y ofertas por proveedor. Los precios y stocks se actualizan sin recargar la página usando polling desde el frontend contra endpoints internos propios.

## Cómo correrla localmente

Requisitos:

- Node.js 20 o superior
- npm

Variables de entorno:

```bash
PROVIDERS_BASE_URL=https://web-production-84144.up.railway.app
```

Si no se define `PROVIDERS_BASE_URL`, la app usa ese valor por defecto.

Comandos:

```bash
npm install
npm run dev
```

Abrir:

```text
http://127.0.0.1:3000
```

Validación:

```bash
npm run typecheck
npm run build
```

## Variables de entorno

### `PROVIDERS_BASE_URL`

URL base de las APIs públicas de proveedores de Turboshop.

Valor por defecto:

```text
https://web-production-84144.up.railway.app
```

La variable se usa solo del lado del backend interno. El frontend nunca llama directamente a esta URL.

## Diagrama de flujo

```text
Frontend → /api/products → adapters → APIs de Turboshop
```

## Arquitectura

La solución usa Next.js con TypeScript en un solo proyecto. Los route handlers de Next.js funcionan como backend Node.js propio, y las páginas/componentes funcionan como frontend React.

Elegi esta arquitectura en lugar de un backend separado con Express o NestJS porque el challenge se puede resolver de forma más simple con una sola app: menos configuración, menos scripts y un despliegue más directo. La separación importante igual se mantiene: el frontend consume endpoints internos, los endpoints internos llaman adapters, y los adapters conocen los formatos reales de cada proveedor.

El frontend no consume las APIs externas directamente. Esto permite cambiar o arreglar un proveedor sin tocar la UI, siempre que mantengamos estable nuestro contrato normalizado.

## Endpoints propios

### `GET /api/products`

Devuelve el catálogo unificado.

Parámetros soportados:

- `page`: página solicitada
- `limit`: cantidad de productos por página
- `search`: búsqueda por texto
- `brand`: filtro por marca
- `model`: filtro por modelo
- `year`: filtro por año

Respuesta:

```ts
{
  products: NormalizedProduct[];
  pagination: Pagination;
  errors: ProviderError[];
}
```

El endpoint consulta los tres catálogos de proveedores, normaliza productos, agrupa por SKU exacto, aplica búsqueda/filtros en backend y pagina el resultado final.

### `GET /api/products/[sku]`

Devuelve el detalle consolidado de un producto por SKU.

Respuesta:

```ts
{
  product: NormalizedProduct | null;
  errors: ProviderError[];
}
```

El endpoint consulta el SKU en cada proveedor usando el parámetro correspondiente de cada API externa: `sku`, `codigo` o `partNumber`. Si más de un proveedor devuelve el mismo SKU exacto, sus ofertas se muestran dentro del mismo producto.

## Normalización

La UI trabaja con un contrato propio y no con los formatos crudos de proveedores.

`NormalizedProduct` representa el producto consolidado:

```ts
type NormalizedProduct = {
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
```

`ProviderOffer` representa una oferta concreta de un proveedor:

```ts
type ProviderOffer = {
  provider: "autopartsplus" | "repuestosmax" | "globalparts";
  providerProductId?: string;
  price: number | null;
  currency?: string;
  stock: number | null;
  available: boolean;
  rawUpdatedAt?: string;
};
```

Cada adapter transforma su formato externo al contrato normalizado. Por ejemplo, AutoPartsPlus usa `unit_price` y `qty_available`, RepuestosMax usa `precio.valor` e `inventario.cantidad`, y GlobalParts usa `PricingInfo.ListPrice.Amount` y `AvailabilityInfo.QuantityInfo.AvailableQuantity`.

## Manejo de fallos parciales

Los endpoints internos usan `Promise.allSettled` para consultar proveedores en paralelo. No se usa `Promise.all`, porque un proveedor lento o caído no debería romper todo el catálogo.

Si un proveedor falla, responde lento o supera el timeout, el backend devuelve los productos disponibles de los proveedores que sí respondieron. Los errores se informan en el campo `errors`.

Ejemplo:

```ts
{
  products: [...],
  errors: [
    {
      provider: "globalparts",
      message: "El proveedor no respondió dentro del tiempo esperado.",
      timedOut: true
    }
  ]
}
```

Los endpoints devuelven HTTP `200` cuando nuestro backend pudo construir una respuesta controlada. El frontend distingue fallos de proveedores leyendo `errors`, no por el status HTTP. Esto evita ruido innecesario durante el polling.

## Actualizaciones en vivo

Las actualizaciones en vivo se implementan con polling para mantener la solución simple y robusta dentro del alcance del challenge.

El catálogo refresca datos aproximadamente cada 20 segundos. La vista de detalle refresca ofertas aproximadamente cada 15 segundos. En ambos casos, el polling se pausa si el tab no está visible usando `document.visibilityState`, para evitar requests innecesarios.

Las actualizaciones se implementan mediante polling periódico desde el frontend contra endpoints internos. Para el alcance del challenge, esta estrategia mantiene precio y stock actualizados sin recargar la página y conserva una arquitectura simple de operar y desplegar.

## Tradeoffs conocidos

La paginación del catálogo opera sobre una muestra combinada. En cada request se consulta una muestra de cada proveedor, se concatenan los resultados normalizados, se aplican búsqueda y filtros en backend, y luego se pagina el array resultante. Esto significa que la búsqueda y los filtros no cubren necesariamente todo el catálogo histórico de cada proveedor, sino la muestra consultada.

La compatibilidad de vehículos está simplificada al primer vehículo compatible encontrado. Los proveedores devuelven estructuras distintas y a veces listas de compatibilidad largas; para mantener la UI simple, el catálogo muestra un modelo/año representativo.

El matching entre proveedores se hace solo por coincidencia exacta de SKU. No se hace matching por nombre, marca, categoría ni similitud textual, porque podría agrupar repuestos distintos de forma incorrecta. Si el mismo SKU aparece en más de un proveedor, se muestra un único `NormalizedProduct` con varias `offers`; si solo aparece en un proveedor, se muestra con una sola oferta.

Como mejora futura, agregaría validación runtime en cada adapter para detectar cambios de contrato en las APIs externas de forma más explícita. Hoy los adapters aíslan el impacto de esos cambios, pero una capa de validación permitiría reportar errores más precisos si un proveedor renombra campos críticos como SKU, precio o stock.
