import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductFormLookups, formatDateTime } from "@/lib/admin-lookups";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { paiseToRupeesString } from "@/lib/money";
import { deleteProductAction } from "../actions";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const product = await db.product.findUnique({
    where: { id },
    include: { brand: true, attributes: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) notFound();

  const [lookups, movements] = await Promise.all([
    getProductFormLookups(),
    db.inventoryMovement.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 8, include: { adminUser: { select: { name: true } } } }),
  ]);

  return (
    <div>
      <Link href="/admin/products" className="text-sm font-semibold text-forest underline underline-offset-4">Back to products</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{product.name}</h1>
        {product.isActive && (
          <Link href={`/products/${product.slug}`} target="_blank" className="text-sm font-semibold text-forest underline underline-offset-4">View on website</Link>
        )}
      </div>
      {sp.created && <p role="status" className="mb-4 rounded-md border border-forest/30 bg-forest/5 px-3 py-2 text-sm font-semibold text-forest">Product created.</p>}

      <ProductForm
        key={product.updatedAt.getTime()}
        {...lookups}
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          slug: product.slug,
          categoryId: product.categoryId,
          subcategory: product.subcategory ?? "",
          brand: product.brand?.name ?? "",
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          unit: product.unit,
          pricingMode: product.pricingMode,
          price: paiseToRupeesString(product.pricePaise),
          salePrice: paiseToRupeesString(product.salePricePaise),
          trackInventory: product.trackInventory,
          stockQuantity: product.stockQuantity,
          lowStockThreshold: product.lowStockThreshold,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
          isSample: product.isSample,
          attributes: product.attributes.map((a) => ({ name: a.name, value: a.value })),
          images: product.images.map((i) => ({ url: i.url, altText: i.altText ?? "" })),
        }}
      />

      <section aria-labelledby="mv" className="mt-10 rounded-lg border border-line bg-white p-5">
        <h2 id="mv" className="text-lg font-bold">Recent stock changes</h2>
        {movements.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No stock changes recorded for this product yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className={`w-14 font-bold tabular-nums ${m.quantityChange < 0 ? "text-danger" : "text-forest"}`}>{m.quantityChange > 0 ? "+" : ""}{m.quantityChange}</span>
                <span className="text-muted">now {m.quantityAfter}</span>
                <span>{m.reason ?? m.type.replaceAll("_", " ").toLowerCase()}</span>
                <span className="ml-auto text-xs text-muted">{m.adminUser?.name ?? "System"} · {formatDateTime(m.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin.role === "OWNER" && (
        <section aria-labelledby="danger" className="mt-6 rounded-lg border border-danger/40 bg-white p-5">
          <h2 id="danger" className="text-lg font-bold text-danger">Delete product</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted">Deleting removes the product, its photos and its stock history for good. Past orders keep their own copy of the name and price. If you only want to hide it from the website, untick Published above instead.</p>
          {sp.error === "confirm" && <p role="alert" className="mt-2 text-sm font-semibold text-danger">Tick the box to confirm.</p>}
          <form action={deleteProductAction} className="mt-3 flex flex-wrap items-center gap-4">
            <input type="hidden" name="id" value={product.id} />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="confirm" className="h-5 w-5 accent-danger" /> Yes, delete this product permanently
            </label>
            <button type="submit" className="min-h-10 rounded-md border border-danger px-4 text-sm font-semibold text-danger hover:bg-danger hover:text-white">Delete product</button>
          </form>
        </section>
      )}
    </div>
  );
}
