import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/categories" className="text-sm font-semibold text-forest underline underline-offset-4">Back to categories</Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold sm:text-3xl">{category.name}</h1>
      {sp.created && <p role="status" className="mb-4 rounded-md border border-forest/30 bg-forest/5 px-3 py-2 text-sm font-semibold text-forest">Category created.</p>}
      <CategoryForm
        key={category.updatedAt.getTime()}
        category={{ id: category.id, name: category.name, slug: category.slug, description: category.description ?? "", imageUrl: category.imageUrl ?? "", isActive: category.isActive }}
      />
      {admin.role === "OWNER" && (
        <section aria-labelledby="del" className="mt-6 rounded-lg border border-danger/40 bg-white p-5">
          <h2 id="del" className="text-lg font-bold text-danger">Delete category</h2>
          {category._count.products > 0 ? (
            <p className="mt-1 text-sm text-muted">This category has {category._count.products} product(s), so it cannot be deleted. Move the products elsewhere first, or untick Active to hide it.</p>
          ) : (
            <form action={deleteCategoryAction} className="mt-2">
              <input type="hidden" name="id" value={category.id} />
              <p className="mb-3 text-sm text-muted">This category is empty. Deleting it cannot be undone.</p>
              <button type="submit" className="min-h-10 rounded-md border border-danger px-4 text-sm font-semibold text-danger hover:bg-danger hover:text-white">Delete category</button>
            </form>
          )}
          {sp.error === "has-products" && <p role="alert" className="mt-2 text-sm font-semibold text-danger">That category still has products.</p>}
        </section>
      )}
    </div>
  );
}
