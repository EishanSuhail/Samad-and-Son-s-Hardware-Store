import type { Metadata } from "next";

// The admin area must never appear in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: { default: "Store admin", template: "%s | Store admin" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
}
