import type { Metadata } from "next";
import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Add category" };

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl">
      <Link href="/admin/categories" className="text-sm font-semibold text-forest underline underline-offset-4">Back to categories</Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold sm:text-3xl">Add a category</h1>
      <CategoryForm category={{ name: "", slug: "", description: "", imageUrl: "", isActive: true }} />
    </div>
  );
}
