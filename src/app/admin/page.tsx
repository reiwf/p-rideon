"use client";

import Link from "next/link";
import { useAdminData } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { PageHeader, yen } from "@/components/admin/ui";

export default function AdminDashboard() {
  const { data } = useAdminData();
  const { t } = useAdminT();

  const activeVehicles = data.vehicles.filter((v) => v.active);
  const prices = activeVehicles.map((v) => v.pricePerDay);
  const lowest = prices.length ? Math.min(...prices) : 0;

  const stats = [
    { label: t.dashboard.vehicles, value: data.vehicles.length, sub: `${activeVehicles.length} ${t.dashboard.published}`, href: "/admin/vehicles" },
    { label: t.dashboard.ratePlans, value: data.ratePlans.filter((p) => p.active).length, sub: t.dashboard.activeDiscounts, href: "/admin/plans" },
    { label: t.dashboard.insurance, value: data.insurances.filter((i) => i.active).length, sub: t.dashboard.offered, href: "/admin/insurance" },
    { label: t.dashboard.lowestRate, value: yen(lowest), sub: t.dashboard.fromFleet, href: "/admin/vehicles" },
  ];

  return (
    <>
      <PageHeader title={t.dashboard.title} sub={t.dashboard.sub} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
            <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-stone">{s.label}</p>
            <p className="mt-2 font-display text-[1.9rem] font-extrabold leading-none text-ink">{s.value}</p>
            <p className="mt-1 text-[0.78rem] text-stone">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[1.05rem] font-bold text-ink">{t.dashboard.publishedFleet}</h2>
            <Link href="/admin/vehicles" className="text-sm font-semibold text-expressway hover:underline">{t.dashboard.manage}</Link>
          </div>
          <ul className="mt-3 divide-y divide-mist">
            {activeVehicles.slice(0, 6).map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-ink">{v.name}</span>
                <span className="text-sm font-semibold text-ink tabular-nums">{yen(v.pricePerDay)}<span className="text-stone">{t.common.perDay}</span></span>
              </li>
            ))}
            {activeVehicles.length === 0 && <li className="py-3 text-sm text-stone">{t.dashboard.noVehicles}</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-mist bg-ink p-5 text-paper shadow-[var(--shadow-card)]">
          <h2 className="font-display text-[1.05rem] font-bold">{t.dashboard.gettingStarted}</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-paper/85">
            <li className="flex gap-2.5"><span className="font-mono text-gold">1</span> {t.dashboard.step1}</li>
            <li className="flex gap-2.5"><span className="font-mono text-gold">2</span> {t.dashboard.step2}</li>
            <li className="flex gap-2.5"><span className="font-mono text-gold">3</span> {t.dashboard.step3}</li>
          </ol>
          <p className="mt-4 text-[0.75rem] text-paper/55">{t.dashboard.savedNote}</p>
        </div>
      </div>
    </>
  );
}
