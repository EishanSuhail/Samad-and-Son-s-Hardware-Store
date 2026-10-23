"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { submitQuotationAction, type QuotationState } from "@/app/(site)/checkout-actions";
import { useFormAction } from "@/lib/use-form-action";
import { useCart } from "./CartProvider";
import { ListLines } from "./ListLines";
import { usePricedList } from "./usePricedList";
import { WhatsAppLink } from "./WhatsAppLink";

export function QuotationView({ whatsappNumber }: { whatsappNumber: string }) {
  const { quote, ready, setQuantity, remove, clear } = useCart();
  const { cart: priced, error } = usePricedList(quote, ready);
  const { state, pending, onSubmit } = useFormAction<QuotationState>(submitQuotationAction, {});
  const cleared = useRef(false);

  // The list is emptied only AFTER the server has confirmed it saved the request.
  useEffect(() => {
    if (state.ok && state.reference && !cleared.current) {
      cleared.current = true;
      clear("quote");
    }
  }, [state, clear]);

  if (state.ok && state.reference) {
    return (
      <div role="status" className="space-y-4 rounded-lg border border-forest/40 bg-white p-6">
        <h2 className="text-xl font-extrabold text-forest">Quotation request received</h2>
        <p>Your reference number is <strong className="text-lg tracking-wide">{state.reference}</strong>. Please keep it.</p>
        <p className="text-sm text-muted">The shop will review your list and contact you. This is a request for a price; it is not an order.</p>
        <div className="flex flex-wrap gap-3">
          <WhatsAppLink number={whatsappNumber} message={state.whatsappText} label="Continue on WhatsApp" />
          <Link href="/products" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold">Keep browsing</Link>
        </div>
      </div>
    );
  }

  if (!ready) return <p className="text-muted">Loading your list…</p>;
  if (quote.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
        <p className="text-lg font-semibold">Your quotation list is empty</p>
        <p className="mt-1 text-muted">Use “Request quotation” on a product to add it here. Handy for bulk or Price on Request items.</p>
        <Link href="/products" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-forest px-5 font-semibold text-white">Browse products</Link>
      </div>
    );
  }

  const fe = state.fieldErrors ?? {};
  const usable = priced ? priced.lines.filter((l) => l.problem !== "UNAVAILABLE") : [];
  const payload = JSON.stringify(quote.map((l) => ({ productId: l.productId, quantity: l.quantity })));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <ListLines lines={quote} priced={priced} showPrices={false} onQuantity={(id, q) => setQuantity("quote", id, q)} onRemove={(id) => remove("quote", id)} />
        {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
      </div>
      <form onSubmit={onSubmit} noValidate className="h-fit space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Your details</h2>
        <input type="hidden" name="lines" value={payload} />
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <div>
          <label htmlFor="qname" className="mb-1 block text-sm font-bold">Name</label>
          <input id="qname" name="customerName" required maxLength={100} autoComplete="name" aria-invalid={!!fe.customerName} aria-describedby={fe.customerName ? "qname-e" : undefined} className="h-11 w-full rounded-md border border-line px-3" />
          {fe.customerName && <p id="qname-e" className="mt-1 text-sm text-danger">{fe.customerName}</p>}
        </div>
        <div>
          <label htmlFor="qphone" className="mb-1 block text-sm font-bold">Phone number</label>
          <input id="qphone" name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" aria-invalid={!!fe.phone} aria-describedby={fe.phone ? "qphone-e" : undefined} className="h-11 w-full rounded-md border border-line px-3" />
          {fe.phone && <p id="qphone-e" className="mt-1 text-sm text-danger">{fe.phone}</p>}
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-bold">Contact me by</legend>
          <label className="mr-5 inline-flex items-center gap-2 text-sm"><input type="radio" name="preferredContact" value="WHATSAPP" defaultChecked className="accent-forest" /> WhatsApp</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="preferredContact" value="PHONE" className="accent-forest" /> Phone call</label>
        </fieldset>
        <div>
          <label htmlFor="qnotes" className="mb-1 block text-sm font-bold">Notes (optional)</label>
          <textarea id="qnotes" name="notes" rows={3} maxLength={1000} className="w-full rounded-md border border-line px-3 py-2" />
          {fe.notes && <p className="mt-1 text-sm text-danger">{fe.notes}</p>}
        </div>
        {state.message && !state.ok && <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{state.message}</p>}
        <button type="submit" disabled={pending || !priced || usable.length === 0} className="min-h-11 w-full rounded-md bg-forest px-5 font-semibold text-white hover:bg-forest-deep disabled:opacity-50">
          {pending ? "Sending…" : "Send quotation request"}
        </button>
        <p className="text-xs text-muted">We use your name and phone number only to reply to this request.</p>
      </form>
    </div>
  );
}
