import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ImportWizard } from "@/components/admin/ImportWizard";
import { requireAdmin } from "@/lib/auth";
import { IMPORT_COLUMNS, REQUIRED_COLUMNS } from "@/lib/product-import";

export const metadata: Metadata = { title: "Import products" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div>
      <Link href="/admin/products" className="text-sm font-semibold text-forest underline underline-offset-4">Back to products</Link>
      <h1 className="mb-2 mt-2 text-2xl font-extrabold sm:text-3xl">Import products from a spreadsheet</h1>
      <div className="mb-6 max-w-[68ch] space-y-3 text-sm text-muted">
        <p>
          Save your spreadsheet as <strong>CSV</strong> (Excel: Save As, CSV UTF-8; Google Sheets: File, Download, CSV), then upload it here. Use the template so the columns match.
        </p>
        <p>
          Required columns: <strong>{REQUIRED_COLUMNS.join(", ")}</strong>. Category must match an existing category name and unit must be one of your units.
          Put specifications in one cell like <code>Thickness=18 mm; Grade=BWP</code>. Leave price empty for Price on Request.
          When updating an existing SKU, blank cells keep the current value.
        </p>
        <p>All columns: {IMPORT_COLUMNS.join(", ")}.</p>
        <a href="/api/admin/products/export?template=1" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-forest px-3 font-semibold text-forest hover:bg-forest hover:text-white">
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV template
        </a>
      </div>
      <ImportWizard />
    </div>
  );
}
