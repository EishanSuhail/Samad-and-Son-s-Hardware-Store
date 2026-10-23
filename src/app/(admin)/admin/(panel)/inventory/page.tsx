import type { Metadata } from "next";
import Link from "next/link";
import { StockAdjuster } from "@/components/admin/StockAdjuster";
import type { Prisma } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/admin-lookups";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Inventory" };

const VIEWS = [
  { key: "all", label: "All tracked" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "all";
  const q = (sp.q ?? "").trim().slice(0, 100);

  const where: Prisma.ProductWhereInput = { trackInventory: true, isActive: true };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }];
  if (view === "out") where.stockQuantity = { lte: 0 };
  if (view === "low") {
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "isActive" AND "trackInventory" AND "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold"`;
    where.id = { in: rows.map((r) => r.id) };
  }

  const [products, counts, movements, untracked] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ stockQuantity: "asc" }, { name: "asc" }], take: 100 }),
    db.$queryRaw<{ low: bigint; out: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold")::bigint AS low,
             COUNT(*) FILTER (WHERE "stockQuantity" <= 0)::bigint AS out
      FROM "Product" WHERE "isActive" AND "trackInventory"`,
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { product: { select: { name: true, sku: true } }, adminUser: { select: { name: true } } } }),
    db.product.count({ where: { isActive: true, trackInventory: false } }),
  ]);
  const low = Number(counts[0]?.low ?? 0);
  const out = Number(counts[0]?.out ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Inventory</h1>
      <p className="mb-5 mt-2 max-w-[62ch] text-sm text-muted">
        Only products with stock tracking turned on are listed. {untracked > 0 && <>{untracked} published product{untracked === 1 ? " is" : "s are"} not tracked; turn tracking on in the product page.</>}
      </p>

      <nav aria-label="Inventory views" className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/admin/inventory?view=${v.key}`} aria-current={view === v.key ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${view === v.key ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest"}`}>
            {v.label}
            {v.key === "low" && ` (${low})`}
            {v.key === "out" && ` (${out})`}
          </Link>
        ))}
      </nav>

      <form method="get" role="search" className="mb-4 flex gap-2">
        <input type="hidden" name="view" value={view} />
        <label htmlFor="q" className="sr-only">Search inventory</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name or SKU" className="h-10 w-64 rounded-md border border-line bg-white px-3 text-sm" />
        <button type="submit" className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">Search</button>
      </form>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-10 text-center text-muted">
          {view === "low" ? "Nothing is running low right now." : view === "out" ? "Nothing is out of stock." : "No tracked products yet."}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {products.map((p) => {
            const isOut = p.stockQuantity <= 0;
            const isLow = !isOut && p.stockQuantity <= p.lowStockThreshold;
            return (
              <li key={p.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <Link href={`/admin/products/${p.id}`} className="font-semibold text-forest underline underline-offset-4">{p.name}</Link>
                  <p className="text-xs text-muted">{p.sku} · sold per {p.unit}</p>
                  <p className="mt-2 text-sm">
                    In stock: <span className={`text-xl font-extrabold tabular-nums ${isOut ? "text-danger" : isLow ? "text-[#8a5a00]" : ""}`}>{p.stockQuantity}</span>
                    {isOut && <span className="ml-2 rounded bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">Out of stock</span>}
                    {isLow && <span className="ml-2 rounded bg-tape/40 px-2 py-0.5 text-xs font-bold">Low stock</span>}
                  </p>
                </div>
                <StockAdjuster productId={p.id} name={p.name} threshold={p.lowStockThreshold} />
              </li>
            );
          })}
        </ul>
      )}

      <section aria-labelledby="movements" className="mt-10 rounded-lg border border-line bg-white p-5">
        <h2 id="movements" className="text-lg font-bold">Recent stock movements</h2>
        {movements.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No stock changes recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th scope="col" className="pb-2">When</th><th scope="col" className="pb-2">Product</th><th scope="col" className="pb-2">Change</th><th scope="col" className="pb-2">Now</th><th scope="col" className="pb-2">Reason</th><th scope="col" className="pb-2">By</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3 text-xs text-muted">{formatDateTime(m.createdAt)}</td>
                    <td className="py-2 pr-3">{m.product.name}</td>
                    <td className={`py-2 pr-3 font-bold tabular-nums ${m.quantityChange < 0 ? "text-danger" : "text-forest"}`}>{m.quantityChange > 0 ? "+" : ""}{m.quantityChange}</td>
                    <td className="py-2 pr-3 tabular-nums">{m.quantityAfter}</td>
                    <td className="py-2 pr-3">{m.reason ?? m.type.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="py-2 text-xs text-muted">{m.adminUser?.name ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
