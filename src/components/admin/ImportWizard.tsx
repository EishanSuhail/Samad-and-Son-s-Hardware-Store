"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { previewImportAction, runImportAction, type PreviewState } from "@/app/(admin)/admin/(panel)/products/import/actions";

const ACTION_LABEL: Record<string, { text: string; cls: string }> = {
  create: { text: "Will be added", cls: "bg-forest/10 text-forest" },
  update: { text: "Will update", cls: "bg-tape/40" },
  skip: { text: "Skipped (exists)", cls: "bg-stone text-muted" },
  error: { text: "Has errors", cls: "bg-danger/10 text-danger" },
};

function ErrorReportButton({ rows }: { rows: NonNullable<PreviewState["rows"]> }) {
  const errors = rows.filter((r) => r.action === "error");
  if (errors.length === 0) return null;
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = ["row,sku,name,problems", ...errors.map((r) => [r.rowNumber, esc(r.sku), esc(r.name), esc(r.errors.join(" | "))].join(","))].join("\r\n");
  return (
    <a href={`data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + csv)}`} download="import-errors.csv" className="inline-flex min-h-10 items-center rounded-md border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest hover:text-white">
      Download error report
    </a>
  );
}

export function ImportWizard() {
  const [preview, previewAction, previewPending] = useActionState(previewImportAction, {} as PreviewState);
  const [result, runAction, runPending] = useActionState(runImportAction, {} as PreviewState);
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState("upsert");

  if (result.step === "done" && result.summary) {
    const s = result.summary;
    return (
      <div className="space-y-4 rounded-lg border border-forest/40 bg-white p-5">
        <h2 className="text-lg font-bold text-forest">Import finished</h2>
        <ul className="text-sm">
          <li>{s.created} product{s.created === 1 ? "" : "s"} added</li>
          <li>{s.updated} product{s.updated === 1 ? "" : "s"} updated</li>
          <li>{s.skipped} skipped because the SKU already exists</li>
          <li>{s.failed} row{s.failed === 1 ? "" : "s"} not imported because of errors</li>
        </ul>
        {result.rows && result.rows.length > 0 && <ErrorReportButton rows={result.rows} />}
        <div className="flex gap-3">
          <Link href="/admin/products" className="inline-flex min-h-10 items-center rounded-md bg-forest px-4 text-sm font-semibold text-white">View products</Link>
          <Link href="/admin/products/import" className="inline-flex min-h-10 items-center rounded-md border border-line px-4 text-sm font-semibold">Import another file</Link>
        </div>
      </div>
    );
  }

  const importable = (preview.counts?.create ?? 0) + (preview.counts?.update ?? 0);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => previewAction(fd));
        }}
        className="space-y-4 rounded-lg border border-line bg-white p-5"
      >
        <div>
          <label htmlFor="file" className="mb-1 block text-sm font-bold">CSV file</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-md file:border file:border-forest file:bg-white file:px-4 file:font-semibold file:text-forest" />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-bold">If a SKU already exists</legend>
          <label className="mr-6 inline-flex items-center gap-2 text-sm"><input type="radio" name="mode" value="upsert" checked={mode === "upsert"} onChange={() => setMode("upsert")} className="accent-forest" /> Update it</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="mode" value="create_only" checked={mode === "create_only"} onChange={() => setMode("create_only")} className="accent-forest" /> Skip it (only add new products)</label>
        </fieldset>
        <button type="submit" disabled={previewPending} className="min-h-11 rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-60">{previewPending ? "Checking…" : "Check file"}</button>
        <p className="text-xs text-muted">Checking does not change anything. You will see every row and any problems before you confirm.</p>
      </form>

      {(preview.fatal || result.fatal) && <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">{result.fatal ?? preview.fatal}</p>}

      {preview.step === "preview" && preview.rows && preview.counts && (
        <section aria-labelledby="pv" className="space-y-4 rounded-lg border border-line bg-white p-5">
          <h2 id="pv" className="text-lg font-bold">Preview: {preview.fileName}</h2>
          <p className="text-sm">
            <strong>{preview.counts.create}</strong> to add, <strong>{preview.counts.update}</strong> to update, <strong>{preview.counts.skip}</strong> skipped, <strong className={preview.counts.error ? "text-danger" : ""}>{preview.counts.error}</strong> with errors.
            {preview.counts.error > 0 && " Rows with errors are left out; fix them in your spreadsheet and import them again."}
          </p>
          <div className="max-h-96 overflow-auto rounded-md border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="sticky top-0 bg-stone text-xs"><tr><th scope="col" className="p-2">Row</th><th scope="col" className="p-2">SKU</th><th scope="col" className="p-2">Name</th><th scope="col" className="p-2">Result</th></tr></thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className="align-top">
                    <td className="p-2 tabular-nums">{r.rowNumber}</td>
                    <td className="p-2">{r.sku}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${ACTION_LABEL[r.action].cls}`}>{ACTION_LABEL[r.action].text}</span>
                      {r.errors.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-danger">{r.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ErrorReportButton rows={preview.rows} />
            <form action={runAction}>
              <input type="hidden" name="csvText" value={preview.csvText} />
              <input type="hidden" name="mode" value={preview.mode} />
              <button type="submit" disabled={runPending || importable === 0} className="min-h-11 rounded-md bg-forest px-6 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-50">
                {runPending ? "Importing…" : importable === 0 ? "Nothing to import" : `Import ${importable} product${importable === 1 ? "" : "s"}`}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
