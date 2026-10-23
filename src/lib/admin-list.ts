/** Parses a YYYY-MM-DD query value as the start (or end) of that day in India time. Invalid input gives undefined. */
export function istDayBound(value: string | undefined, end: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const rupees = (paise: number | null | undefined) => (paise == null ? "—" : `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
