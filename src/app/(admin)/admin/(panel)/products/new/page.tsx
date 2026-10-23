import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getProductFormLookups } from "@/lib/admin-lookups";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  const lookups = await getProductFormLookups();
  return (
    <div>
      <Link href="/admin/products" className="text-sm font-semibold text-forest underline underline-offset-4">Back to products</Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold sm:text-3xl">Add a product</h1>
      <ProductForm
        {...lookups}
        product={{
          name: "", sku: "", slug: "", categoryId: "", subcategory: "", brand: "", shortDescription: "", description: "",
          unit: lookups.units.includes("Piece") ? "Piece" : lookups.units[0] ?? "Piece",
          pricingMode: "PRICE_ON_REQUEST", price: "", salePrice: "", trackInventory: false, stockQuantity: 0,
          lowStockThreshold: 5, isFeatured: false, isActive: true, isSample: false, attributes: [], images: [],
        }}
      />
    </div>
  );
}
