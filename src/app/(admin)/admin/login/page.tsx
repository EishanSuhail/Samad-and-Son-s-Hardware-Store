import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-stone px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="ruler" aria-hidden="true" />
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-extrabold">Store admin</h1>
            <p className="mb-6 mt-1 text-sm text-muted">{BUSINESS.name}. Authorised staff only.</p>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
