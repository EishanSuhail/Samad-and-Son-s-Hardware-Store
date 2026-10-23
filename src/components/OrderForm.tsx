"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { submitOrderAction, type OrderState } from "@/app/(site)/checkout-actions";
import { formatPaise } from "@/lib/money";
import { useFormAction } from "@/lib/use-form-action";
import { useCart } from "./CartProvider";
import { WhatsAppLink } from "./WhatsAppLink";

interface Props {
  lines: { productId: string; quantity: number }[];
  fulfilment: "PICKUP" | "DELIVERY";
  address: string;
  notes: string;
  defaultName: string;
  disabled: boolean;
  whatsappNumber: string;
  onDone: (state: OrderState) => void;
}

/** Sends the order to the shop's system. Shows success only when the server confirms it saved the order. */
export function OrderForm({ lines, fulfilment, address, notes, defaultName, disabled, whatsappNumber, onDone }: Props) {
  const { clear } = useCart();
  const { state, pending, onSubmit } = useFormAction<OrderState>(submitOrderAction, {});
  const done = useRef(false);

  useEffect(() => {
    if (state.ok && state.reference && !done.current) {
      done.current = true;
      clear("cart");
      onDone(state);
    }
  }, [state, clear, onDone]);

  const fe = state.fieldErrors ?? {};
  void whatsappNumber;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 border-t border-line pt-4">
      <h3 className="text-sm font-bold">Or send your order to the shop</h3>
      <p className="text-xs text-muted">This sends an order request to the shop. You pay nothing online. The order is final only after the shop confirms it with you.</p>
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="fulfilment" value={fulfilment} />
      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="notes" value={notes} />
      <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div>
        <label htmlFor="oname" className="mb-1 block text-sm font-bold">Name</label>
        <input id="oname" name="customerName" defaultValue={defaultName} required maxLength={100} autoComplete="name" aria-invalid={!!fe.customerName} className="h-11 w-full rounded-md border border-line px-3" />
        {fe.customerName && <p className="mt-1 text-sm text-danger">{fe.customerName}</p>}
      </div>
      <div>
        <label htmlFor="ophone" className="mb-1 block text-sm font-bold">Phone number</label>
        <input id="ophone" name="phone" type="tel" inputMode="tel" required maxLength={30} autoComplete="tel" aria-invalid={!!fe.phone} className="h-11 w-full rounded-md border border-line px-3" />
        {fe.phone && <p className="mt-1 text-sm text-danger">{fe.phone}</p>}
      </div>
      {(fe.address || fe.fulfilment || fe.notes) && <p role="alert" className="text-sm text-danger">{fe.address ?? fe.fulfilment ?? fe.notes}</p>}
      {state.message && !state.ok && !Object.keys(fe).length && <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{state.message}</p>}
      <button type="submit" disabled={pending || disabled} className="min-h-11 w-full rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Sending…" : "Send order to shop"}
      </button>
    </form>
  );
}

export function OrderConfirmation({ state, whatsappNumber }: { state: OrderState; whatsappNumber: string }) {
  return (
    <div role="status" className="space-y-4 rounded-lg border border-forest/40 bg-white p-6">
      <h2 className="text-xl font-extrabold text-forest">Order request received</h2>
      <p>Your reference number is <strong className="text-lg tracking-wide">{state.reference}</strong>. Please keep it.</p>
      {state.subtotalPaise != null && (
        <p className="text-sm">Estimated subtotal: <strong>{formatPaise(state.subtotalPaise)}</strong>{state.hasUnpricedItems && " (Price on Request items not included)"}. The final amount is confirmed by the shop.</p>
      )}
      <p className="text-sm text-muted">The shop will contact you to confirm availability and the final amount. Your order is not final until then, and nothing has been paid.</p>
      <div className="flex flex-wrap gap-3">
        <WhatsAppLink number={whatsappNumber} message={state.whatsappText} label="Message the shop on WhatsApp" />
        <Link href="/products" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold">Keep browsing</Link>
      </div>
    </div>
  );
}
