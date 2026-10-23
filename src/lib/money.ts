// All money in the app is integer paise. Convert only at the edges (display / admin input).

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Parses an admin-entered rupee amount like "1,250.50" into paise. Returns null if invalid. */
export function rupeesToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const cleaned = String(input).replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function paiseToRupeesString(paise: number | null | undefined): string {
  if (paise == null) return "";
  return (paise / 100).toFixed(2);
}

/** The price a customer pays per unit: sale price when set and lower, else the regular price. */
export function effectivePricePaise(p: {
  pricingMode: "FIXED" | "PRICE_ON_REQUEST";
  pricePaise: number | null;
  salePricePaise: number | null;
}): number | null {
  if (p.pricingMode !== "FIXED" || p.pricePaise == null) return null;
  if (p.salePricePaise != null && p.salePricePaise < p.pricePaise) return p.salePricePaise;
  return p.pricePaise;
}
