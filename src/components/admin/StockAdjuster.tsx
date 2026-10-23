"use client";

import { adjustStockAction, updateThresholdAction, type AdjustState } from "@/app/(admin)/admin/(panel)/inventory/actions";
import { useFormAction } from "@/lib/use-form-action";

const initial: AdjustState = {};
const field = "h-9 rounded-md border border-line bg-white px-2 text-sm";

export function StockAdjuster({ productId, name, threshold }: { productId: string; name: string; threshold: number }) {
  const adjust = useFormAction(adjustStockAction, initial);
  const thr = useFormAction(updateThresholdAction, initial);
  return (
    <div className="space-y-2">
      <form onSubmit={adjust.onSubmit} className="flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="id" value={productId} />
        <label className="sr-only" htmlFor={`mode-${productId}`}>Adjustment type for {name}</label>
        <select id={`mode-${productId}`} name="mode" defaultValue="add" className={field}>
          <option value="add">Add / remove</option>
          <option value="set">Set to</option>
        </select>
        <label className="sr-only" htmlFor={`amt-${productId}`}>Amount for {name}</label>
        <input id={`amt-${productId}`} name="amount" inputMode="numeric" placeholder="e.g. 10 or -3" className={`${field} w-24`} />
        <label className="sr-only" htmlFor={`why-${productId}`}>Reason for {name}</label>
        <input id={`why-${productId}`} name="reason" placeholder="Reason (optional)" maxLength={200} className={`${field} w-40`} />
        <button type="submit" disabled={adjust.pending} className="h-9 rounded-md bg-forest px-3 text-sm font-semibold text-white disabled:opacity-60">{adjust.pending ? "…" : "Apply"}</button>
      </form>
      {adjust.state.message && <p role={adjust.state.ok ? "status" : "alert"} className={`text-xs font-semibold ${adjust.state.ok ? "text-forest" : "text-danger"}`}>{adjust.state.message}</p>}
      <form onSubmit={thr.onSubmit} className="flex items-center gap-1.5 text-xs">
        <input type="hidden" name="id" value={productId} />
        <label htmlFor={`thr-${productId}`} className="text-muted">Low-stock warning at</label>
        <input id={`thr-${productId}`} name="threshold" inputMode="numeric" defaultValue={threshold} className={`${field} w-16`} />
        <button type="submit" disabled={thr.pending} className="h-9 rounded-md border border-line px-2.5 font-semibold hover:border-forest disabled:opacity-60">Save</button>
        {thr.state.message && <span role={thr.state.ok ? "status" : "alert"} className={`font-semibold ${thr.state.ok ? "text-forest" : "text-danger"}`}>{thr.state.message}</span>}
      </form>
    </div>
  );
}
