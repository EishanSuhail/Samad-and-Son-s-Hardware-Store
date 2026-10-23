"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { PROBLEM_TEXT } from "@/lib/checkout-shared";
import type { PricedCart } from "@/lib/checkout";
import { formatPaise } from "@/lib/money";
import type { CartLine } from "./CartProvider";

interface Props {
  lines: CartLine[];
  priced: PricedCart | null;
  showPrices: boolean;
  onQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function ListLines({ lines, priced, showPrices, onQuantity, onRemove }: Props) {
  const byId = new Map(priced?.lines.map((l) => [l.productId, l]));
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-white">
      {lines.map((l) => {
        const p = byId.get(l.productId);
        const name = p?.name ?? l.name;
        const unit = p?.unit ?? l.unit;
        return (
          <li key={l.productId} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <Link href={`/products/${p?.slug ?? l.slug}`} className="font-semibold text-forest underline underline-offset-4">{name}</Link>
              <p className="text-xs text-muted">{l.sku} · per {unit}</p>
              {showPrices && p && (
                <p className="mt-1 text-sm">
                  {p.unitPricePaise != null ? `${formatPaise(p.unitPricePaise)} per ${unit}` : <span className="font-semibold">Price on Request</span>}
                </p>
              )}
              {p?.problem && (
                <p role="status" className="mt-1 text-sm font-semibold text-danger">
                  {PROBLEM_TEXT[p.problem]}
                  {p.problem === "NOT_ENOUGH_STOCK" && p.availableQuantity != null && ` (${p.availableQuantity} available)`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1" role="group" aria-label={`Quantity for ${name}`}>
              <button type="button" onClick={() => onQuantity(l.productId, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Decrease quantity" className="flex h-11 w-11 items-center justify-center rounded-md border border-line disabled:opacity-40"><Minus className="h-4 w-4" aria-hidden="true" /></button>
              <input
                type="number" inputMode="numeric" min={1} max={9999} value={l.quantity}
                aria-label={`Quantity of ${name}`}
                onChange={(e) => onQuantity(l.productId, Number(e.target.value))}
                className="h-11 w-16 rounded-md border border-line text-center tabular-nums"
              />
              <button type="button" onClick={() => onQuantity(l.productId, l.quantity + 1)} aria-label="Increase quantity" className="flex h-11 w-11 items-center justify-center rounded-md border border-line"><Plus className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              {showPrices && p?.lineTotalPaise != null && <span className="min-w-20 text-right font-bold tabular-nums">{formatPaise(p.lineTotalPaise)}</span>}
              <button type="button" onClick={() => onRemove(l.productId)} aria-label={`Remove ${name}`} className="flex h-11 w-11 items-center justify-center rounded-md text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
