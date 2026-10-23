import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOwner();
  const settings = await getSettings();
  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Website settings</h1>
      <p className="mb-6 mt-2 max-w-[62ch] text-muted">Change business details, contact numbers and ordering options without touching any code. Changes go live immediately.</p>
      <SettingsForm settings={settings} />
    </div>
  );
}
