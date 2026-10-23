"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { settingsFormSchema } from "@/lib/settings-schema";
import { getSettings } from "@/lib/settings";

export interface SettingsState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "");
/** The ImageUploader submits a JSON array; settings keep only the first image URL ("" when none). */
function firstImageUrl(fd: FormData, k: string): string {
  try {
    const arr = JSON.parse(text(fd, k) || "[]");
    return Array.isArray(arr) && typeof arr[0]?.url === "string" ? arr[0].url : "";
  } catch {
    return "";
  }
}
const flag = (fd: FormData, k: string) => fd.get(k) === "on";

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireOwner();

  const parsed = settingsFormSchema.safeParse({
    businessName: text(formData, "businessName"),
    founderName: text(formData, "founderName"),
    address: text(formData, "address"),
    landmark: text(formData, "landmark"),
    whatsappNumber: text(formData, "whatsappNumber"),
    phoneNumber: text(formData, "phoneNumber"),
    email: text(formData, "email"),
    businessHours: text(formData, "businessHours"),
    googleMapsUrl: text(formData, "googleMapsUrl"),
    aboutText: text(formData, "aboutText"),
    whyChooseUs: text(formData, "whyChooseUs"),
    facebook: text(formData, "facebook"),
    instagram: text(formData, "instagram"),
    youtube: text(formData, "youtube"),
    orderSubmissionEnabled: flag(formData, "orderSubmissionEnabled"),
    pickupEnabled: flag(formData, "pickupEnabled"),
    deliveryEnabled: flag(formData, "deliveryEnabled"),
    showStock: flag(formData, "showStock"),
    logoUrl: firstImageUrl(formData, "logoUrl"),
    founderPhotoUrl: firstImageUrl(formData, "founderPhotoUrl"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: "Some fields need attention. Nothing was saved.", fieldErrors };
  }

  const { facebook, instagram, youtube, ...rest } = parsed.data;
  const socialLinks = Object.fromEntries(Object.entries({ facebook, instagram, youtube }).filter(([, v]) => v));
  const next: Record<string, unknown> = { ...rest, socialLinks };

  const before = await getSettings();
  const changed = Object.keys(next).filter((k) => JSON.stringify((before as unknown as Record<string, unknown>)[k]) !== JSON.stringify(next[k]));

  await db.$transaction(
    Object.entries(next).map(([key, value]) =>
      db.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } }),
    ),
  );

  await logAudit({ adminUserId: admin.id, action: "settings.update", entity: "Setting", details: { changed } });
  revalidatePath("/", "layout");
  return { ok: true, message: changed.length ? "Settings saved." : "No changes to save." };
}
