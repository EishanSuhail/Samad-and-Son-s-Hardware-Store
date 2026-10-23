"use client";

/* eslint-disable react-hooks/set-state-in-effect -- this hook synchronises component state with a server request that depends on the list */

import { useEffect, useMemo, useState } from "react";
import { priceLinesAction } from "@/app/(site)/checkout-actions";
import type { PricedCart } from "@/lib/checkout";
import type { CartLine } from "./CartProvider";

/** Asks the server for trusted prices/stock whenever the product ids or quantities change. */
export function usePricedList(lines: CartLine[], ready: boolean) {
  const [cart, setCart] = useState<PricedCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const key = useMemo(() => JSON.stringify(lines.map((l) => [l.productId, l.quantity])), [lines]);

  useEffect(() => {
    if (!ready) return;
    const payload = (JSON.parse(key) as [string, number][]).map(([productId, quantity]) => ({ productId, quantity }));
    if (payload.length === 0) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      priceLinesAction(payload)
        .then((r) => {
          if (cancelled) return;
          if (r.ok) { setCart(r.cart); setError(null); } else setError(r.message);
        })
        .catch(() => !cancelled && setError("Could not check current prices. Check your connection."))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [key, ready]);

  // An empty list never shows stale prices or errors from a previous list.
  const empty = key === "[]";
  return { cart: empty ? null : cart, error: empty ? null : error, loading: empty ? false : loading };
}
