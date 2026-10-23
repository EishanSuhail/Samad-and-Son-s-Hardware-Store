"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderState } from "@/app/(site)/checkout-actions";
import { formatPaise } from "@/lib/money";
import { cartOrderMessage } from "@/lib/whatsapp";
import { useCart } from "./CartProvider";
import { ListLines } from "./ListLines";
import { OrderConfirmation, OrderForm } from "./OrderForm";
import { usePricedList } from "./usePricedList";
import { WhatsAppLink } from "./WhatsAppLink";

interface Props {
  whatsappNumber: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  orderSubmissionEnabled: boolean;
}

export function CartView({ whatsappNumber, pickupEnabled, deliveryEnabled, orderSubmissionEnabled }: Props) {
  const { cart, ready, setQuantity, remove, clear } = useCart();
  const { cart: priced, error, loading } = usePricedList(cart, ready);
  const [name, setName] = useState("");
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">(pickupEnabled || !deliveryEnabled ? "PICKUP" : "DELIVERY");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [placed, setPlaced] = useState<OrderState | null>(null);

  if (placed) return <OrderConfirmation state={placed} whatsappNumber={whatsappNumber} />;
  if (!ready) return <p className="text-muted">Loading your cart…</p>;
  if (cart.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <p className="mt-1 text-muted">Add products from the catalogue, then order on WhatsApp.</p>
        <Link href="/products" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-forest px-5 font-semibold text-white">Browse products</Link>
      </div>
    );
  }

  // Message is built from SERVER-checked data only. Unavailable products are left out.
  const usable = (priced?.lines ?? []).filter((l) => l.problem !== "UNAVAILABLE");
  const message = priced
    ? cartOrderMessage({
        customerName: name,
        items: usable.map((l) => ({ name: l.name, sku: l.sku, unit: l.unit, quantity: l.quantity, pricePaise: l.unitPricePaise })),
        estimatedSubtotalPaise: priced.hasUnpricedItems && priced.subtotalPaise === 0 ? null : priced.subtotalPaise,
        fulfilment,
        address,
        notes,
      })
    : undefined;
  const blocked = !priced || usable.length === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <ListLines lines={cart} priced={priced} showPrices onQuantity={(id, q) => setQuantity("cart", id, q)} onRemove={(id) => remove("cart", id)} />
        <button type="button" onClick={() => clear("cart")} className="text-sm font-semibold text-danger underline underline-offset-4">Empty the cart</button>
        {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        {priced?.hasProblems && <p role="status" className="rounded-md bg-tape/30 px-3 py-2 text-sm">Some items are unavailable or short on stock. Adjust them, or ask us on WhatsApp.</p>}
      </div>

      <aside aria-labelledby="summary" className="h-fit space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 id="summary" className="text-lg font-bold">Order summary</h2>
        <dl className="text-sm">
          <div className="flex justify-between"><dt>Estimated subtotal</dt><dd className="font-bold tabular-nums">{priced ? formatPaise(priced.subtotalPaise) : loading ? "…" : "—"}</dd></div>
        </dl>
        {priced?.hasUnpricedItems && <p className="text-xs text-muted">Some products are Price on Request and are not in this total.</p>}
        <p className="text-xs text-muted">This total is an estimate from current shop prices. The final amount is confirmed by the shop after checking availability.</p>

        <div>
          <label htmlFor="cname" className="mb-1 block text-sm font-bold">Your name (optional)</label>
          <input id="cname" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className="h-11 w-full rounded-md border border-line px-3" />
        </div>
        {(pickupEnabled || deliveryEnabled) && (
          <fieldset>
            <legend className="mb-1 text-sm font-bold">How will you receive it?</legend>
            {pickupEnabled && <label className="mr-5 inline-flex items-center gap-2 text-sm"><input type="radio" name="f" checked={fulfilment === "PICKUP"} onChange={() => setFulfilment("PICKUP")} className="accent-forest" /> Pickup from shop</label>}
            {deliveryEnabled && <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="f" checked={fulfilment === "DELIVERY"} onChange={() => setFulfilment("DELIVERY")} className="accent-forest" /> Delivery enquiry</label>}
          </fieldset>
        )}
        {fulfilment === "DELIVERY" && (
          <div>
            <label htmlFor="addr" className="mb-1 block text-sm font-bold">Delivery address</label>
            <textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={400} rows={3} className="w-full rounded-md border border-line px-3 py-2" />
            <p className="mt-1 text-xs text-muted">Delivery availability and charges are confirmed by the shop.</p>
          </div>
        )}
        <div>
          <label htmlFor="cnotes" className="mb-1 block text-sm font-bold">Notes (optional)</label>
          <textarea id="cnotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} className="w-full rounded-md border border-line px-3 py-2" />
        </div>

        {blocked ? (
          <p className="text-sm text-muted">{loading ? "Checking current prices…" : "Fix the items above to continue."}</p>
        ) : (
          <WhatsAppLink number={whatsappNumber} message={message} label="Order on WhatsApp" className="w-full" />
        )}
        {orderSubmissionEnabled && (
          <OrderForm
            lines={cart.map((l) => ({ productId: l.productId, quantity: l.quantity }))}
            fulfilment={fulfilment}
            address={address}
            notes={notes}
            defaultName={name}
            disabled={blocked || !!priced?.hasProblems}
            whatsappNumber={whatsappNumber}
            onDone={setPlaced}
          />
        )}
        <p className="text-xs text-muted">
          Opening WhatsApp does <strong>not</strong> place an order. Your order is only with us once you press send in WhatsApp and we confirm it.
        </p>
      </aside>
    </div>
  );
}
