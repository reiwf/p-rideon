import type { Metadata } from "next";
import { AdminI18nProvider } from "@/lib/adminI18n";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin · P-rideon",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // Admin keeps the light palette regardless of system theme; its screens
    // still use the legacy token names, which alias to light-theme values.
    <div className="theme-light flex min-h-screen flex-col bg-bg text-ink">
      <AdminI18nProvider>
        <AdminShell>{children}</AdminShell>
      </AdminI18nProvider>
    </div>
  );
}
