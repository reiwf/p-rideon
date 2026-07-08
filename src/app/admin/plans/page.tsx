"use client";

import { useState } from "react";
import { useAdminData, type RatePlan } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Badge, Field, Modal, PageHeader, inputCls } from "@/components/admin/ui";
import { TranslationsPanel } from "@/components/admin/Translatable";

function emptyPlan(): RatePlan {
  return { id: "", name: "", description: "", minDays: 3, discountPct: 10, active: true, i18n: {} };
}

export default function PlansPage() {
  const { data, savePlan, removePlan } = useAdminData();
  const { t } = useAdminT();
  const [editing, setEditing] = useState<RatePlan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirm, setConfirm] = useState<RatePlan | null>(null);

  return (
    <>
      <PageHeader title={t.plans.title} sub={t.plans.sub} action={<Button onClick={() => { setEditing(emptyPlan()); setIsNew(true); }}>{t.plans.add}</Button>} />

      <div className="grid gap-4 sm:grid-cols-2">
        {data.ratePlans.map((p) => (
          <div key={p.id} className="rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-[1.1rem] font-bold text-ink">{p.name || t.common.untitled}</h3>
              {p.active ? <Badge tone="ok">{t.common.active}</Badge> : <Badge tone="off">{t.common.off}</Badge>}
            </div>
            <p className="mt-1 text-sm text-stone">{p.description}</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-[1.7rem] font-extrabold text-expressway">-{p.discountPct}%</span>
              <span className="text-sm text-stone">{t.plans.forDays.replace("{n}", String(p.minDays))}</span>
            </div>
            <div className="mt-4 flex gap-1.5">
              <Button variant="ghost" className="px-3 py-1.5" onClick={() => { setEditing({ ...p }); setIsNew(false); }}>{t.common.edit}</Button>
              <Button variant="subtle" className="px-3 py-1.5" onClick={() => setConfirm(p)}>{t.common.delete}</Button>
            </div>
          </div>
        ))}
        {data.ratePlans.length === 0 && <p className="text-sm text-stone">{t.plans.empty}</p>}
      </div>

      {editing && (
        <PlanForm key={editing.id || "new"} value={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={async (p) => { if (await savePlan(p)) setEditing(null); }} />
      )}

      {confirm && (
        <Modal
          title={t.plans.deleteTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" onClick={async () => { if (await removePlan(confirm.id)) setConfirm(null); }}>{t.common.delete}</Button></>}
        >
          <p className="text-sm text-ink">{t.plans.deleteBody}</p>
        </Modal>
      )}
    </>
  );
}

function PlanForm({ value, isNew, onClose, onSave }: { value: RatePlan; isNew: boolean; onClose: () => void; onSave: (p: RatePlan) => void }) {
  const { t } = useAdminT();
  const [p, setP] = useState<RatePlan>(value);
  const set = <K extends keyof RatePlan>(k: K, val: RatePlan[K]) => setP((s) => ({ ...s, [k]: val }));

  return (
    <Modal
      title={isNew ? t.plans.formAdd : t.plans.formEdit}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="plan-form">{isNew ? t.plans.saveAdd : t.plans.saveEdit}</Button></>}
    >
      <form id="plan-form" onSubmit={(e) => { e.preventDefault(); if (p.name.trim()) onSave(p); }} className="space-y-4">
        <Field label={t.plans.name}><input className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} placeholder={t.plans.namePh} /></Field>
        <Field label={t.plans.description}><input className={inputCls} value={p.description} onChange={(e) => set("description", e.target.value)} placeholder={t.plans.descPh} /></Field>
        <TranslationsPanel
          i18n={p.i18n}
          onChange={(v) => set("i18n", v)}
          fields={[
            { key: "name", label: t.plans.name, base: p.name },
            { key: "description", label: t.plans.description, base: p.description },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.plans.minDays}><input type="number" min={1} className={inputCls} value={p.minDays} onChange={(e) => set("minDays", +e.target.value)} /></Field>
          <Field label={t.plans.discount}><input type="number" min={0} max={100} className={inputCls} value={p.discountPct} onChange={(e) => set("discountPct", +e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
          <input type="checkbox" checked={p.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
          <span className="text-sm text-ink">{t.plans.activeLabel}</span>
        </label>
      </form>
    </Modal>
  );
}
