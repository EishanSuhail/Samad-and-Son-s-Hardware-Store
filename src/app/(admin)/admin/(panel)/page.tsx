import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for pickup",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

async function loadMetrics() {
  const [totalProducts, activeProducts, lowStock, outOfStock, totalOrders, pendingOrders, newQuotations, recentOrders, recentActivity] =
    await Promise.all([
      db.product.count(),
      db.product.count({ where: { isActive: true } }),
      // Comparing two columns is not expressible in Prisma's where-input, so use a counted raw query.
      db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "Product"
        WHERE "isActive" AND "trackInventory" AND "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold"`,
      db.product.count({ where: { isActive: true, trackInventory: true, stockQuantity: { lte: 0 } } }),
      db.order.count(),
      db.order.count({ where: { status: "PENDING" } }),
      db.quotation.count({ where: { status: "NEW" } }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reference: true, customerName: true, status: true, createdAt: true } }),
      db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { adminUser: { select: { name: true } } } }),
    ]);
  return {
    totalProducts,
    activeProducts,
    lowStock: Number(lowStock[0]?.count ?? 0),
    outOfStock,
    totalOrders,
    pendingOrders,
    newQuotations,
    recentOrders,
    recentActivity,
  };
}

function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "warn" }) {
  const body = (
    <div className={`rounded-lg border bg-white p-4 ${tone === "warn" && value > 0 ? "border-tape" : "border-line"}`}>
      <p className="text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:[&>div]:border-forest">
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin();
  const [m, sp] = await Promise.all([loadMetrics(), searchParams]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Welcome, {admin.name}</h1>
      {sp.denied && (
        <p role="alert" className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          That page is for the store owner only.
        </p>
      )}

      <section aria-label="Key numbers" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total products" value={m.totalProducts} href="/admin/products" />
        <Stat label="Active products" value={m.activeProducts} href="/admin/products" />
        <Stat label="Low-stock products" value={m.lowStock} href="/admin/inventory" tone="warn" />
        <Stat label="Out-of-stock products" value={m.outOfStock} href="/admin/inventory" tone="warn" />
        <Stat label="Total orders" value={m.totalOrders} href="/admin/orders" />
        <Stat label="Pending orders" value={m.pendingOrders} href="/admin/orders?status=PENDING" tone="warn" />
        <Stat label="New quotation requests" value={m.newQuotations} href="/admin/quotations?status=NEW" tone="warn" />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-orders" className="rounded-lg border border-line bg-white p-4">
          <h2 id="recent-orders" className="text-lg font-bold">
            Recent orders
          </h2>
          {m.recentOrders.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No orders yet. Website orders appear here once customers submit them.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {m.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest underline underline-offset-4">
                    {o.reference}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-muted">{o.customerName}</span>
                  <span className="shrink-0 rounded bg-stone px-2 py-0.5 text-xs font-semibold">{ORDER_STATUS_LABEL[o.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-activity" className="rounded-lg border border-line bg-white p-4">
          <h2 id="recent-activity" className="text-lg font-bold">
            Recent activity
          </h2>
          {m.recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {m.recentActivity.map((a) => (
                <li key={a.id} className="py-2.5">
                  <span className="font-semibold">{a.action}</span>
                  <span className="text-muted"> · {a.adminUser?.name ?? "System / visitor"}</span>
                  <br />
                  <time dateTime={a.createdAt.toISOString()} className="text-xs text-muted">
                    {a.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
