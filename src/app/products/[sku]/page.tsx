import { ProductDetailClient } from "@/components/ProductDetailClient";

type ProductDetailPageProps = {
  params: Promise<{
    sku: string;
  }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { sku } = await params;

  return <ProductDetailClient sku={decodeURIComponent(sku)} />;
}
