"use client";

import { useRef, useState, useTransition } from "react";
import { bulkProductAction, toggleProductActiveAction, type BulkResult } from "@/app/(admin)/admin/(panel)/products/actions";
import { useFormAction } from "@/lib/use-form-action";

const field = "h-10 rounded-md border border-line bg-white px-2 text-sm";

/** Wraps the server-rendered product table (children contain checkboxes named "ids"). */
export function BulkForm({ categories, children }: { categories: { id: string; name: string }[]; children: React.ReactNode }) {
  const { state, pending, onSubmit } = useFormAction<BulkResult | null>(bulkProductAction, null);
  const [op, setOp] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const setAll = (checked: boolean) =>
    formRef.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = checked));

  const needsValue = op === "price_set" || op === "price_percent" || op === "stock_set" || op === "category";

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3">
        <span className="text-sm font-bold">With selected:</span>
        <label className="sr-only" htmlFor="bulk-op">
          Bulk action
        </label>
        <select id="bulk-op" name="op" value={op} onChange={(e) => setOp(e.target.value)} className={field}>
          <option value="">Choose an action</option>
          <option value="price_set">Set price (₹)</option>
          <option value="price_percent">Change prices by %</option>
          <option value="stock_set">Set stock quantity</option>
          <option value="category">Move to category</option>
          <option value="archive">Archive (hide)</option>
          <option value="unarchive">Publish</option>
        </select>
        {needsValue && op !== "category" && (
          <>
            <label className="sr-only" htmlFor="bulk-value">
              Value
            </label>
            <input id="bulk-value" name="value" inputMode="decimal" placeholder={op === "price_percent" ? "e.g. 10 or -5" : op === "stock_set" ? "e.g. 25" : "e.g. 250"} className={`${field} w-32`} />
          </>
        )}
        {op === "category" && (
          <>
            <label className="sr-only" htmlFor="bulk-category">
              Category
            </label>
            <select id="bulk-category" name="value" defaultValue="" className={field}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="submit" disabled={pending || !op} className="min-h-10 rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-50">
          {pending ? "Applying…" : "Apply"}
        </button>
        <span className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setAll(true)} className="font-semibold text-forest underline underline-offset-2">
            Select all on this page
          </button>
          <button type="button" onClick={() => setAll(false)} className="font-semibold text-forest underline underline-offset-2">
            Clear
          </button>
        </span>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={`w-full text-sm font-semibold ${state.ok ? "text-forest" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </div>
      {children}
    </form>
  );
}

/** Per-row archive/publish button. Calls the server action directly so it never triggers the bulk form submit. */
export function ArchiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await toggleProductActiveAction(fd);
        })
      }
      className="rounded border border-line px-2 py-1 text-xs font-semibold hover:border-forest disabled:opacity-50"
    >
      {pending ? "…" : isActive ? "Archive" : "Publish"}
    </button>
  );
}
