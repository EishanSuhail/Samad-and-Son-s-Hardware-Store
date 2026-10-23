"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { productEnquiryMessage } from "@/lib/whatsapp";
import { AddToListButtons } from "./AddToListButtons";
import { WhatsAppLink } from "./WhatsAppLink";

interface Props {
  product: { id: string; slug: string; name: string; sku: string; unit: string; pricePaise: number | null };
  outOfStock: boolean;
  whatsappNumber: string;
}

export function ProductPurchasePanel({ product, outOfStock, whatsappNumber }: Props) {
  const [qty, setQty] = useState(1);
  const inputId = useId();
  const clamp = (n: number) => (Number.isFinite(n) ? Math.min(9999, Math.max(1, Math.floor(n))) : 1);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={inputId} className="mb-1 block text-sm font-bold">
          Quantity ({product.unit})
        </label>
        <div className="inline-flex items-center rounded-md border border-line">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => clamp(q - 1))}
            className="inline-flex h-11 w-11 items-center justify-center hover:bg-stone"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            value={qty}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className="h-11 w-16 border-x border-line text-center text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => clamp(q + 1))}
            className="inline-flex h-11 w-11 items-center justify-center hover:bg-stone"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <AddToListButtons product={product} quantity={qty} outOfStock={outOfStock} size="full" />

      <WhatsAppLink
        number={whatsappNumber}
        variant="outline"
        label="Enquire on WhatsApp"
        message={productEnquiryMessage({ name: product.name, sku: product.sku, unit: product.unit, quantity: qty, pricePaise: product.pricePaise })}
        className="w-full sm:w-auto"
      />
      <p className="max-w-[52ch] text-xs text-muted">
        Opening WhatsApp only prepares a message. Your enquiry is sent once you press send in WhatsApp, and the store confirms availability and the final price.
      </p>
    </div>
  );
}
