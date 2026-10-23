import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/admin-lookups";
import { rupees } from "@/lib/admin-list";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABEL, allowedNextStatuses } from "@/lib/orders";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { saveOrderNotesAction, updateOrderStatusAction } from "../actions";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const order = await db.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { slug: true } } } } } });
  if (!order) notFound();
  const movements = await db.inventoryMovement.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" }, include: { product: { select: { name: true } } } });
  const next = allowedNextStatuses(order.status, order.fulfilment);
  const wa = buildWhatsappLink(`Assalamu Alaikum ${order.customerName}, this is about your order ${order.reference} with Samad and Son's Hardware Store.`, order.phone);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/orders" className="text-sm font-semibold text-forest underline underline-offset-4">Back to orders</Link>
      <h1 className="mb-1 mt-2 text-2xl font-extrabold sm:text-3xl">Order {order.reference}</h1>
      <p className="text-sm text-muted">Received {formatDateTime(order.createdAt)} · {ORDER_STATUS_LABEL[order.status]}</p>
      {sp.ok && <p role="status" className="mt-3 rounded-md border border-forest/30 bg-forest/5 px-3 py-2 text-sm font-semibold text-forest">{sp.ok}</p>}
      {sp.err && <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{sp.err}</p>}

      <section aria-labelledby="cust" className="mt-5 rounded-lg border border-line bg-white p-5">
        <h2 id="cust" className="mb-2 text-lg font-bold">Customer</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Name</dt><dd className="font-semibold">{order.customerName}</dd></div>
          <div><dt className="text-xs text-muted">Phone</dt><dd className="font-semibold"><a href={`tel:+${order.phone}`} className="underline underline-offset-4">+{order.phone}</a>{wa && <> · <a href={wa} className="text-wa-deep underline underline-offset-4">WhatsApp</a></>}</dd></div>
          <div><dt className="text-xs text-muted">Receiving by</dt><dd className="font-semibold">{order.fulfilment === "DELIVERY" ? "Delivery" : "Pickup from shop"}</dd></div>
          {order.address && <div><dt className="text-xs text-muted">Delivery address</dt><dd className="whitespace-pre-line font-semibold">{order.address}</dd></div>}
          {order.notes && <div className="sm:col-span-2"><dt className="text-xs text-muted">Customer notes</dt><dd className="whitespace-pre-line">{order.notes}</dd></div>}
        </dl>
      </section>

      <section aria-labelledby="items" className="mt-5 rounded-lg border border-line bg-white p-5">
        <h2 id="items" className="mb-2 text-lg font-bold">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th scope="col" className="pb-2">Product</th><th scope="col" className="pb-2">Qty</th><th scope="col" className="pb-2">Price at order</th><th scope="col" className="pb-2 text-right">Line total</th></tr></thead>
            <tbody className="divide-y divide-line">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-3">{i.product ? <Link href={`/admin/products/${i.productId}`} className="font-semibold text-forest underline underline-offset-4">{i.productName}</Link> : i.productName}<br /><span className="text-xs text-muted">{i.sku}</span></td>
                  <td className="py-2 pr-3 tabular-nums">{i.quantity} {i.unit}</td>
                  <td className="py-2 pr-3 tabular-nums">{i.unitPricePaise != null ? rupees(i.unitPricePaise) : "Price on Request"}</td>
                  <td className="py-2 text-right tabular-nums">{i.unitPricePaise != null ? rupees(i.unitPricePaise * i.quantity) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-right text-sm">Estimated subtotal: <strong className="tabular-nums">{rupees(order.subtotalPaise)}</strong>{order.hasUnpricedItems && <span className="text-xs text-muted"> (excludes Price on Request items)</span>}</p>
        <p className="mt-1 text-right text-xs text-muted">Prices were copied when the customer ordered. The final amount is agreed with the customer.</p>
      </section>

      <section aria-labelledby="status" className="mt-5 rounded-lg border border-line bg-white p-5">
        <h2 id="status" className="mb-2 text-lg font-bold">Update status</h2>
        {next.length === 0 ? (
          <p className="text-sm text-muted">This order is {ORDER_STATUS_LABEL[order.status].toLowerCase()} and can no longer be changed.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted">Stock is taken off the shelf when you confirm an order, and put back if you cancel it afterwards.</p>
            <div className="flex flex-wrap gap-2">
              {next.filter((s) => s !== "CANCELLED").map((s) => (
                <form key={s} action={updateOrderStatusAction}>
                  <input type="hidden" name="id" value={order.id} /><input type="hidden" name="to" value={s} />
                  <button type="submit" className="min-h-10 rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">Mark as {ORDER_STATUS_LABEL[s].toLowerCase()}</button>
                </form>
              ))}
            </div>
            <form action={updateOrderStatusAction} className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <input type="hidden" name="id" value={order.id} /><input type="hidden" name="to" value="CANCELLED" />
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="confirmCancel" className="accent-danger" /> Yes, cancel this order</label>
              <button type="submit" className="min-h-10 rounded-md border border-danger px-4 text-sm font-semibold text-danger hover:bg-danger hover:text-white">Cancel order</button>
            </form>
          </div>
        )}
        {movements.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="mb-1 text-sm font-bold">Stock changes for this order</h3>
            <ul className="text-sm">{movements.map((m) => <li key={m.id}>{m.product.name}: {m.quantityChange > 0 ? "+" : ""}{m.quantityChange} (now {m.quantityAfter})</li>)}</ul>
          </div>
        )}
      </section>

      <form action={saveOrderNotesAction} className="mt-5 rounded-lg border border-line bg-white p-5">
        <input type="hidden" name="id" value={order.id} />
        <label htmlFor="internalNotes" className="mb-1 block text-lg font-bold">Internal notes</label>
        <p className="mb-2 text-xs text-muted">Only staff see these. The customer never does.</p>
        <textarea id="internalNotes" name="internalNotes" rows={4} maxLength={2000} defaultValue={order.internalNotes ?? ""} className="w-full rounded-md border border-line px-3 py-2 text-sm" />
        <button type="submit" className="mt-2 min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">Save notes</button>
      </form>
    </div>
  );
}
