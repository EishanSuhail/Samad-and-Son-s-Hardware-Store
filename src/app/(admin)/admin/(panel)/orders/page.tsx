import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";
import { buildQuery, istDayBound, rupees } from "@/lib/admin-list";
import { formatDateTime } from "@/lib/admin-lookups";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };
const PAGE_SIZE = 25;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = (Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).find((s) => s === sp.status);
  const from = istDayBound(sp.from, false);
  const to = istDayBound(sp.to, true);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (q) where.OR = [{ reference: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || "~~none~~" } }];
  if (status) where.status = status;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { items: true } } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const field = "h-10 rounded-md border border-line bg-white px-2 text-sm";
  const base = { q, status, from: sp.from, to: sp.to };

  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Orders</h1>
      <form method="get" role="search" aria-label="Filter orders" className="mt-5 flex flex-wrap items-end gap-2">
        <div><label htmlFor="q" className="mb-1 block text-xs font-bold">Reference, name or phone</label><input id="q" name="q" defaultValue={q} className={`${field} w-56`} /></div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-bold">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className={field}>
            <option value="">All</option>
            {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label htmlFor="from" className="mb-1 block text-xs font-bold">From</label><input id="from" type="date" name="from" defaultValue={sp.from} className={field} /></div>
        <div><label htmlFor="to" className="mb-1 block text-xs font-bold">To</label><input id="to" type="date" name="to" defaultValue={sp.to} className={field} /></div>
        <button type="submit" className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">Filter</button>
        {(q || status || sp.from || sp.to) && <Link href="/admin/orders" className="py-2 text-sm font-semibold text-forest underline underline-offset-4">Clear</Link>}
      </form>

      <p className="mb-3 mt-4 text-sm text-muted" aria-live="polite">{total} order{total === 1 ? "" : "s"}{pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}</p>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-10 text-center text-muted">{total === 0 && !q && !status ? "No orders yet. Orders sent from the website appear here." : "No orders match these filters."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone text-xs"><tr><th scope="col" className="p-3">Reference</th><th scope="col" className="p-3">Received</th><th scope="col" className="p-3">Customer</th><th scope="col" className="p-3">Items</th><th scope="col" className="p-3">Estimate</th><th scope="col" className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest underline underline-offset-4">{o.reference}</Link></td>
                  <td className="p-3 text-xs text-muted">{formatDateTime(o.createdAt)}</td>
                  <td className="p-3">{o.customerName}<br /><span className="text-xs text-muted">{o.phone}</span></td>
                  <td className="p-3 tabular-nums">{o._count.items}</td>
                  <td className="p-3 tabular-nums">{rupees(o.subtotalPaise)}{o.hasUnpricedItems && <span className="text-xs text-muted"> +POR</span>}</td>
                  <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-bold ${o.status === "PENDING" ? "bg-tape/40" : o.status === "CANCELLED" ? "bg-danger/10 text-danger" : "bg-forest/10 text-forest"}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && (
        <nav aria-label="Pages" className="mt-4 flex gap-3 text-sm font-semibold">
          {page > 1 && <Link href={`/admin/orders${buildQuery({ ...base, page: page - 1 })}`} className="text-forest underline underline-offset-4">Previous</Link>}
          {page < pageCount && <Link href={`/admin/orders${buildQuery({ ...base, page: page + 1 })}`} className="text-forest underline underline-offset-4">Next</Link>}
        </nav>
      )}
    </div>
  );
}
