"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon; ownerOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/quotations", label: "Quotations", icon: ClipboardList },
  { href: "/admin/audit", label: "Activity log", icon: FileText, ownerOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function AdminNav({ role }: { role: "OWNER" | "STAFF" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.filter((i) => !i.ownerOnly || role === "OWNER").map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold ${
              active ? "bg-forest text-white" : "text-ink hover:bg-stone"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
