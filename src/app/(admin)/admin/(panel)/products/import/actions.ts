"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { executeImport, loadImportLookups, type ImportSummary } from "@/lib/product-import-db";
import { MAX_IMPORT_BYTES, previewImport, type ImportMode, type ImportPreview } from "@/lib/product-import";

export interface PreviewState {
  step?: "preview" | "done";
  fatal?: string;
  csvText?: string;
  mode?: ImportMode;
  fileName?: string;
  rows?: { rowNumber: number; sku: string; name: string; action: string; errors: string[] }[];
  counts?: ImportPreview["counts"];
  summary?: ImportSummary;
  error?: string;
}

const readMode = (fd: FormData): ImportMode => (fd.get("mode") === "create_only" ? "create_only" : "upsert");

/** Step 1: validate only. Nothing is written. */
export async function previewImportAction(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { fatal: "Choose a CSV file to check." };
  if (file.size > MAX_IMPORT_BYTES) return { fatal: "That file is too large. Split it into files under 500 KB." };
  if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return { fatal: "Upload a .csv file. In Excel or Google Sheets, use Save as / Download as CSV." };

  const csvText = await file.text();
  const mode = readMode(formData);
  const preview = previewImport(csvText, await loadImportLookups(), mode);
  if (preview.fatal) return { fatal: preview.fatal };

  return {
    step: "preview",
    csvText,
    mode,
    fileName: file.name,
    counts: preview.counts,
    rows: preview.rows.map(({ rowNumber, sku, name, action, errors }) => ({ rowNumber, sku, name, action, errors })),
  };
}

/** Step 2: validate AGAIN on the server (the browser copy is never trusted), then write the valid rows. */
export async function runImportAction(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  const admin = await requireAdmin();
  const limit = rateLimit(`import:${admin.id}`, 10, 60 * 60_000);
  if (!limit.ok) return { fatal: "Too many imports this hour. Try again later." };

  const csvText = String(formData.get("csvText") ?? "");
  const mode = readMode(formData);
  const preview = previewImport(csvText, await loadImportLookups(), mode);
  if (preview.fatal) return { fatal: preview.fatal };
  if (preview.counts.create + preview.counts.update === 0) return { fatal: "There are no valid rows to import." };

  try {
    const summary = await executeImport(preview, admin.id);
    await logAudit({ adminUserId: admin.id, action: "product.import", entity: "Product", details: { ...summary, mode } });
    revalidatePath("/admin/products");
    return {
      step: "done",
      summary,
      rows: preview.rows.filter((r) => r.action === "error").map(({ rowNumber, sku, name, action, errors }) => ({ rowNumber, sku, name, action, errors })),
    };
  } catch (error) {
    console.error("Import failed", error);
    return { fatal: "The import failed and nothing was changed. Check the file and try again." };
  }
}
