import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { buildQuery } from "@/lib/admin-list";
import { formatDateTime } from "@/lib/admin-lookups";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Activity log" };
const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireOwner();
  const sp = await searchParams;
  const entity = (sp.entity ?? "").slice(0, 40);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.AuditLogWhereInput = entity ? { entity } : {};

  const [total, rows, entities] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { adminUser: { select: { name: true, email: true } } } }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Activity log</h1>
      <p className="mb-4 mt-2 max-w-[62ch] text-sm text-muted">A record of who changed what. Only the owner can see it. Entries cannot be edited.</p>
      <form method="get" className="mb-4 flex items-end gap-2" aria-label="Filter activity">
        <div>
          <label htmlFor="entity" className="mb-1 block text-xs font-bold">Area</label>
          <select id="entity" name="entity" defaultValue={entity} className="h-10 rounded-md border border-line bg-white px-2 text-sm">
            <option value="">Everything</option>
            {entities.map((e) => <option key={e.entity} value={e.entity}>{e.entity}</option>)}
          </select>
        </div>
        <button type="submit" className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">Filter</button>
      </form>
      <p className="mb-3 text-sm text-muted">{total} entr{total === 1 ? "y" : "ies"}{pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}</p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-10 text-center text-muted">Nothing recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-stone text-xs"><tr><th scope="col" className="p-3">When</th><th scope="col" className="p-3">Who</th><th scope="col" className="p-3">Action</th><th scope="col" className="p-3">Details</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="p-3 text-xs text-muted">{formatDateTime(r.createdAt)}</td>
                  <td className="p-3">{r.adminUser ? r.adminUser.name : <span className="text-muted">Unknown or removed</span>}</td>
                  <td className="p-3 font-semibold">{r.action}</td>
                  <td className="p-3 break-words text-xs text-muted">{r.details ? JSON.stringify(r.details).slice(0, 300) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && (
        <nav aria-label="Pages" className="mt-4 flex gap-3 text-sm font-semibold">
          {page > 1 && <Link href={`/admin/audit${buildQuery({ entity, page: page - 1 })}`} className="text-forest underline underline-offset-4">Previous</Link>}
          {page < pageCount && <Link href={`/admin/audit${buildQuery({ entity, page: page + 1 })}`} className="text-forest underline underline-offset-4">Next</Link>}
        </nav>
      )}
    </div>
  );
}
