"use client";

/* eslint-disable react-hooks/set-state-in-effect -- the cart is loaded from localStorage after mount; it cannot exist during server rendering */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Client-side cart / quotation list. Prices stored here are for DISPLAY only;
// the server always recomputes prices and totals from the database.
export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  /** Display-only snapshot of the price per unit in paise (null = price on request). */
  pricePaise: number | null;
}

type ListKey = "cart" | "quote";

interface CartContextValue {
  ready: boolean;
  cart: CartLine[];
  quote: CartLine[];
  add: (list: ListKey, line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (list: ListKey, productId: string, quantity: number) => void;
  remove: (list: ListKey, productId: string) => void;
  clear: (list: ListKey) => void;
}

const STORAGE_KEY = "samad-hardware-lists-v1";
const MAX_QTY = 9999;

const CartContext = createContext<CartContextValue | null>(null);

function clampQty(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.floor(n)));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lists, setLists] = useState<{ cart: CartLine[]; quote: CartLine[] }>({ cart: [], quote: [] });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.cart) && Array.isArray(parsed?.quote)) setLists(parsed);
      }
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
    // Reading localStorage is only possible after mount (it does not exist during server rendering).
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      /* ignore */
    }
  }, [lists, ready]);

  const add = useCallback<CartContextValue["add"]>((list, line, quantity = 1) => {
    setLists((prev) => {
      const existing = prev[list].find((l) => l.productId === line.productId);
      const next = existing
        ? prev[list].map((l) =>
            l.productId === line.productId ? { ...l, ...line, quantity: clampQty(l.quantity + quantity) } : l,
          )
        : [...prev[list], { ...line, quantity: clampQty(quantity) }];
      return { ...prev, [list]: next };
    });
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>((list, productId, quantity) => {
    setLists((prev) => ({
      ...prev,
      [list]: prev[list].map((l) => (l.productId === productId ? { ...l, quantity: clampQty(quantity) } : l)),
    }));
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((list, productId) => {
    setLists((prev) => ({ ...prev, [list]: prev[list].filter((l) => l.productId !== productId) }));
  }, []);

  const clear = useCallback<CartContextValue["clear"]>((list) => {
    setLists((prev) => ({ ...prev, [list]: [] }));
  }, []);

  const value = useMemo(
    () => ({ ready, cart: lists.cart, quote: lists.quote, add, setQuantity, remove, clear }),
    [ready, lists, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
