import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import { ArchiveToggle, BulkForm } from "@/components/admin/BulkForm";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { stockStatus } from "@/lib/product-helpers";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 25;
type SP = Promise<Record<string, string | undefined>>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = ["published", "archived"].includes(sp.status ?? "") ? sp.status : "";
  const stock = ["low", "out"].includes(sp.stock ?? "") ? sp.stock : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const and: Prisma.ProductWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (sp.category) and.push({ categoryId: sp.category });
  if (status) and.push({ isActive: status === "published" });
  if (stock === "out") and.push({ trackInventory: true, stockQuantity: { lte: 0 } });

  // "Low stock" compares two columns, so resolve the matching ids with SQL first.
  if (stock === "low") {
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "trackInventory" AND "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold"`;
    and.push({ id: { in: rows.map((r) => r.id) } });
  }
  const where: Prisma.ProductWhereInput = and.length ? { AND: and } : {};

  const [total, products, categories, flash] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } } },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }], select: { id: true, name: true } }),
    Promise.resolve(sp.deleted ? "Product deleted." : ""),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category: sp.category, status, stock, page, ...over })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const field = "h-10 rounded-md border border-line bg-white px-2 text-sm";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/import" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest hover:text-white">
            <Upload className="h-4 w-4" aria-hidden="true" /> Import CSV
          </Link>
          <a href="/api/admin/products/export" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest hover:text-white">
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
          <Link href="/admin/products/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add product
          </Link>
        </div>
      </div>
      {flash && <p role="status" className="mt-3 rounded-md border border-forest/30 bg-forest/5 px-3 py-2 text-sm font-semibold text-forest">{flash}</p>}

      <form method="get" className="mt-5 flex flex-wrap items-end gap-2" role="search" aria-label="Filter products">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-bold">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, SKU or brand" className={`${field} w-56`} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs font-bold">Category</label>
          <select id="category" name="category" defaultValue={sp.category ?? ""} className={field}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-bold">Status</label>
          <select id="status" name="status" defaultValue={status} className={field}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="stock" className="mb-1 block text-xs font-bold">Stock</label>
          <select id="stock" name="stock" defaultValue={stock} className={field}>
            <option value="">All</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
        <button type="submit" className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">Filter</button>
        {(q || sp.category || status || stock) && <Link href="/admin/products" className="min-h-10 py-2 text-sm font-semibold text-forest underline underline-offset-4">Clear</Link>}
      </form>

      <p className="mb-3 mt-4 text-sm text-muted" aria-live="polite">{total} product{total === 1 ? "" : "s"}{pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}</p>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-10 text-center text-muted">No products match. <Link href="/admin/products/new" className="font-semibold text-forest underline underline-offset-4">Add a product</Link> or <Link href="/admin/products/import" className="font-semibold text-forest underline underline-offset-4">import a CSV</Link>.</p>
      ) : (
        <BulkForm categories={categories}>
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-stone text-xs">
                <tr>
                  <th scope="col" className="w-10 p-3"><span className="sr-only">Select</span></th>
                  <th scope="col" className="p-3">Product</th>
                  <th scope="col" className="p-3">Category</th>
                  <th scope="col" className="p-3">Price</th>
                  <th scope="col" className="p-3">Stock</th>
                  <th scope="col" className="p-3">Status</th>
                  <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => {
                  const st = stockStatus(p);
                  return (
                    <tr key={p.id} className={p.isActive ? "" : "bg-stone/70 text-muted"}>
                      <td className="p-3"><input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} className="h-5 w-5 accent-forest" /></td>
                      <td className="p-3">
                        <Link href={`/admin/products/${p.id}`} className="font-semibold text-forest underline underline-offset-4">{p.name}</Link>
                        <div className="text-xs text-muted">{p.sku}{p.isSample ? " · sample data" : ""}{p.isFeatured ? " · featured" : ""}</div>
                      </td>
                      <td className="p-3">{p.category.name}</td>
                      <td className="p-3 tabular-nums">{p.pricingMode === "FIXED" && p.pricePaise != null ? formatPaise(p.salePricePaise ?? p.pricePaise) : <span className="text-muted">On request</span>}</td>
                      <td className="p-3 tabular-nums">
                        {st === "NOT_TRACKED" ? <span className="text-muted">Not tracked</span> : (
                          <span className={st === "OUT_OF_STOCK" ? "font-bold text-danger" : st === "LOW_STOCK" ? "font-bold text-[#8a5a00]" : ""}>{p.stockQuantity}{st === "LOW_STOCK" ? " (low)" : st === "OUT_OF_STOCK" ? " (out)" : ""}</span>
                        )}
                      </td>
                      <td className="p-3">{p.isActive ? "Published" : "Archived"}</td>
                      <td className="p-3 text-right">
                        <ArchiveToggle id={p.id} isActive={p.isActive} />
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BulkForm>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between">
          {page > 1 ? <Link href={`/admin/products${qs({ page: page - 1 })}`} className="rounded-md border border-forest px-4 py-2 text-sm font-semibold text-forest">Previous</Link> : <span />}
          {page < pageCount ? <Link href={`/admin/products${qs({ page: page + 1 })}`} className="rounded-md border border-forest px-4 py-2 text-sm font-semibold text-forest">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
