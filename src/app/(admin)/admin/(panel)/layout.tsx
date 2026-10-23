import Link from "next/link";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "./actions";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Server-side authorisation for every page in the panel (the proxy only does a quick pre-check).
  const [admin, settings] = await Promise.all([requireAdmin(), getSettings()]);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-line bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 p-4 md:block">
          <Logo name={settings.businessName} logoUrl={settings.logoUrl} />
        </div>
        <div className="px-3 pb-3 md:px-3 md:pb-6">
          <AdminNav role={admin.role} />
        </div>
        <div className="hidden border-t border-line p-4 md:block">
          <p className="truncate text-sm font-bold">{admin.name}</p>
          <p className="truncate text-xs text-muted">
            {admin.email} · {admin.role === "OWNER" ? "Owner" : "Staff"}
          </p>
          <Link href="/" target="_blank" className="mt-3 block text-sm font-semibold text-forest underline underline-offset-4">
            View website
          </Link>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold hover:border-forest">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-stone/60">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{children}</div>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-white p-3 md:hidden">
          <span className="truncate text-xs text-muted">{admin.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
