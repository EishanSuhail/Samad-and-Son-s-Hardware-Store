"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireAdmin, requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { uniqueViolationInfo } from "@/lib/db-errors";
import { slugify } from "@/lib/slug";
import { isAllowedImageUrl } from "@/lib/uploads";

export interface CategoryFormState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter the category name.").max(100),
  slug: z.string().trim().max(100).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and hyphens only."),
  description: z.string().trim().max(400, "Keep the description under 400 characters."),
  image: z.string().transform((raw, ctx) => {
    try {
      const list = z.array(z.object({ url: z.string().refine(isAllowedImageUrl) })).max(1).parse(JSON.parse(raw || "[]"));
      return list[0]?.url ?? null;
    } catch {
      ctx.addIssue({ code: "custom", message: "That image is not valid." });
      return z.NEVER;
    }
  }),
  isActive: z.boolean(),
});

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function saveCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const id = str(formData, "id") || undefined;
  const parsed = schema.safeParse({
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    description: str(formData, "description"),
    image: str(formData, "image"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Some fields need attention. Nothing was saved.", fieldErrors };
  }
  const v = parsed.data;
  const slug = v.slug || slugify(v.name);
  if (!slug) return { ok: false, message: "Nothing was saved.", fieldErrors: { name: "Use letters or numbers in the name." } };

  try {
    let savedId = id;
    if (id) {
      await db.category.update({ where: { id }, data: { name: v.name, slug, description: v.description || null, imageUrl: v.image, isActive: v.isActive } });
    } else {
      const last = await db.category.aggregate({ _max: { sortOrder: true } });
      const created = await db.category.create({
        data: { name: v.name, slug, description: v.description || null, imageUrl: v.image, isActive: v.isActive, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
      savedId = created.id;
    }
    await logAudit({ adminUserId: admin.id, action: id ? "category.update" : "category.create", entity: "Category", entityId: savedId, details: { name: v.name } });
    revalidatePath("/admin/categories");
    if (!id) redirect(`/admin/categories/${savedId}?created=1`);
    return { ok: true, message: "Category saved." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = uniqueViolationInfo(error);
      return { ok: false, message: "Nothing was saved.", fieldErrors: target.includes("slug") ? { slug: "Another category uses this web address." } : { name: "Another category already has this name." } };
    }
    throw error;
  }
}

export async function moveCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  await db.$transaction(async (tx) => {
    const all = await tx.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const i = all.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    // Rewrite a clean 0..n-1 order so ties can never make a move look like it did nothing.
    for (const [index, c] of all.entries()) await tx.category.update({ where: { id: c.id }, data: { sortOrder: index } });
  });
  await logAudit({ adminUserId: admin.id, action: "category.reorder", entity: "Category", entityId: id, details: { dir } });
  revalidatePath("/admin/categories");
}

export async function toggleCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = str(formData, "id");
  const c = await db.category.findUnique({ where: { id }, select: { isActive: true, name: true } });
  if (!c) return;
  await db.category.update({ where: { id }, data: { isActive: !c.isActive } });
  await logAudit({ adminUserId: admin.id, action: c.isActive ? "category.deactivate" : "category.activate", entity: "Category", entityId: id, details: { name: c.name } });
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requireOwner();
  const id = str(formData, "id");
  const c = await db.category.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
  if (!c) redirect("/admin/categories");
  if (c._count.products > 0) redirect(`/admin/categories/${id}?error=has-products`);
  await db.category.delete({ where: { id } });
  await logAudit({ adminUserId: admin.id, action: "category.delete", entity: "Category", entityId: id, details: { name: c.name } });
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
