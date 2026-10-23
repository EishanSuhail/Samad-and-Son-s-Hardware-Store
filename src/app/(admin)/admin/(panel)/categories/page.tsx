import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { moveCategoryAction, toggleCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line hover:border-forest disabled:opacity-40";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Categories</h1>
        <Link href="/admin/categories/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add category
        </Link>
      </div>
      <p className="mb-5 mt-2 max-w-[62ch] text-sm text-muted">The order here is the order on the website. Use the arrows to move a category up or down.</p>

      <ul className="divide-y divide-line rounded-lg border border-line bg-white">
        {categories.map((c, i) => (
          <li key={c.id} className={`flex flex-wrap items-center gap-3 p-3 ${c.isActive ? "" : "bg-stone/70 text-muted"}`}>
            <div className="flex gap-1">
              <form action={moveCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="dir" value="up" />
                <button type="submit" disabled={i === 0} aria-label={`Move ${c.name} up`} className={btn}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
              </form>
              <form action={moveCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="dir" value="down" />
                <button type="submit" disabled={i === categories.length - 1} aria-label={`Move ${c.name} down`} className={btn}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
              </form>
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/categories/${c.id}`} className="font-semibold text-forest underline underline-offset-4">{c.name}</Link>
              <p className="text-xs text-muted">{c._count.products} product{c._count.products === 1 ? "" : "s"} · /categories/{c.slug}</p>
            </div>
            <span className="text-xs font-semibold">{c.isActive ? "Active" : "Inactive"}</span>
            <form action={toggleCategoryAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="rounded border border-line px-2.5 py-1.5 text-xs font-semibold hover:border-forest">{c.isActive ? "Deactivate" : "Activate"}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
