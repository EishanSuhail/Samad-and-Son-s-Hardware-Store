import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryCard } from "@/components/CategoryCard";
import { getActiveCategories } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Product Categories",
  description: "All product categories at Samad and Son's Hardware Store: paints, PVC and PPR pipes, plywood, wall putty, POP, tools and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getActiveCategories();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Product categories</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id}>
            <CategoryCard category={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
