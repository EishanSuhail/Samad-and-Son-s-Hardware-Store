"use client";

import { saveCategoryAction, type CategoryFormState } from "@/app/(admin)/admin/(panel)/categories/actions";
import { useFormAction } from "@/lib/use-form-action";
import { ImageUploader } from "./ImageUploader";

const initial: CategoryFormState = {};
const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm focus:border-forest";

export function CategoryForm({
  category,
}: {
  category: { id?: string; name: string; slug: string; description: string; imageUrl: string; isActive: boolean };
}) {
  const { state, pending, onSubmit } = useFormAction(saveCategoryAction, initial);
  const err = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-white p-5" noValidate>
      {category.id && <input type="hidden" name="id" value={category.id} />}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-bold">Category name</label>
        <input id="name" name="name" defaultValue={category.name} className={input} />
        {err.name && <p className="mt-1 text-xs font-semibold text-danger">{err.name}</p>}
      </div>
      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-bold">Web address (optional)</label>
        <input id="slug" name="slug" defaultValue={category.slug} className={input} />
        <p className="mt-1 text-xs text-muted">Leave empty to create it from the name. Changing it breaks old links to this category.</p>
        {err.slug && <p className="mt-1 text-xs font-semibold text-danger">{err.slug}</p>}
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-bold">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={category.description} className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-forest" />
        {err.description && <p className="mt-1 text-xs font-semibold text-danger">{err.description}</p>}
      </div>
      <ImageUploader name="image" initial={category.imageUrl ? [{ url: category.imageUrl, altText: "" }] : []} max={1} withAlt={false} label="Category photo (optional)" />
      {err.image && <p className="text-xs font-semibold text-danger">{err.image}</p>}
      <label className="flex items-start gap-3">
        <input type="checkbox" name="isActive" defaultChecked={category.isActive} className="mt-0.5 h-5 w-5 accent-forest" />
        <span>
          <span className="block text-sm font-bold">Active</span>
          <span className="block text-xs text-muted">Inactive categories and their products are hidden from the website.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-forest px-6 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-60">
          {pending ? "Saving…" : category.id ? "Save category" : "Create category"}
        </button>
        {state.message && <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-forest" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
