import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/admin-lookups";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { paiseToRupeesString } from "@/lib/money";
import { QUOTATION_STATUS_LABEL } from "@/lib/quotations";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { saveQuotationAction } from "../actions";

export const metadata: Metadata = { title: "Quotation request" };

export default async function QuotationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const q = await db.quotation.findUnique({ where: { id }, include: { items: { include: { product: { select: { pricingMode: true, pricePaise: true, salePricePaise: true } } } } } });
  if (!q) notFound();
  const wa = buildWhatsappLink(`Assalamu Alaikum ${q.customerName}, this is about your quotation request ${q.reference} with Samad and Son's Hardware Store.`, q.phone);
  const input = "w-full rounded-md border border-line px-3 py-2 text-sm";

  return (
    <div className="max-w-4xl">
      <Link href="/admin/quotations" className="text-sm font-semibold text-forest underline underline-offset-4">Back to quotations</Link>
      <h1 className="mb-1 mt-2 text-2xl font-extrabold sm:text-3xl">Quotation {q.reference}</h1>
      <p className="text-sm text-muted">Received {formatDateTime(q.createdAt)}</p>
      {sp.ok && <p role="status" className="mt-3 rounded-md border border-forest/30 bg-forest/5 px-3 py-2 text-sm font-semibold text-forest">{sp.ok}</p>}
      {sp.err && <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{sp.err}</p>}

      <section aria-labelledby="cust" className="mt-5 rounded-lg border border-line bg-white p-5">
        <h2 id="cust" className="mb-2 text-lg font-bold">Customer</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Name</dt><dd className="font-semibold">{q.customerName}</dd></div>
          <div><dt className="text-xs text-muted">Phone</dt><dd className="font-semibold"><a href={`tel:+${q.phone}`} className="underline underline-offset-4">+{q.phone}</a>{wa && <> · <a href={wa} className="text-wa-deep underline underline-offset-4">WhatsApp</a></>}</dd></div>
          <div><dt className="text-xs text-muted">Prefers</dt><dd className="font-semibold">{q.preferredContact === "PHONE" ? "Phone call" : "WhatsApp"}</dd></div>
          {q.notes && <div className="sm:col-span-2"><dt className="text-xs text-muted">Customer notes</dt><dd className="whitespace-pre-line">{q.notes}</dd></div>}
        </dl>
      </section>

      <section aria-labelledby="items" className="mt-5 rounded-lg border border-line bg-white p-5">
        <h2 id="items" className="mb-2 text-lg font-bold">Requested items</h2>
        <ul className="divide-y divide-line text-sm">
          {q.items.map((i) => (
            <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{i.productId ? <Link href={`/admin/products/${i.productId}`} className="font-semibold text-forest underline underline-offset-4">{i.productName}</Link> : i.productName} <span className="text-xs text-muted">{i.sku}</span></span>
              <span className="font-semibold tabular-nums">{i.quantity} {i.unit}</span>
            </li>
          ))}
        </ul>
      </section>

      <form action={saveQuotationAction} className="mt-5 space-y-4 rounded-lg border border-line bg-white p-5">
        <input type="hidden" name="id" value={q.id} />
        <h2 className="text-lg font-bold">Your response</h2>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-bold">Status</label>
          <select id="status" name="status" defaultValue={q.status} className="h-11 rounded-md border border-line px-2 text-sm">
            {Object.entries(QUOTATION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="quotedTotal" className="mb-1 block text-sm font-bold">Quoted total (₹, optional)</label>
          <input id="quotedTotal" name="quotedTotal" inputMode="decimal" defaultValue={paiseToRupeesString(q.quotedTotalPaise)} className="h-11 w-48 rounded-md border border-line px-3 text-sm" />
        </div>
        <div>
          <label htmlFor="adminResponse" className="mb-1 block text-sm font-bold">Message to the customer</label>
          <p className="mb-1 text-xs text-muted">Write the quotation details here, then send it to the customer yourself by WhatsApp or phone. Saving does not send anything.</p>
          <textarea id="adminResponse" name="adminResponse" rows={5} maxLength={3000} defaultValue={q.adminResponse ?? ""} className={input} />
        </div>
        <div>
          <label htmlFor="internalNotes" className="mb-1 block text-sm font-bold">Internal notes</label>
          <textarea id="internalNotes" name="internalNotes" rows={3} maxLength={2000} defaultValue={q.internalNotes ?? ""} className={input} />
        </div>
        <button type="submit" className="min-h-11 rounded-md bg-forest px-6 text-sm font-semibold text-white hover:bg-forest-deep">Save</button>
      </form>
    </div>
  );
}
