"use client";

import { useState } from "react";
import { useAdminData, type Insurance } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Badge, Field, Modal, PageHeader, inputCls, yen } from "@/components/admin/ui";
import { TranslationsPanel } from "@/components/admin/Translatable";

function emptyInsurance(): Insurance {
  return { id: "", name: "", description: "", pricePerDay: 1000, features: [], featured: false, active: true, i18n: {} };
}

export default function InsurancePage() {
  const { data, saveInsurance, removeInsurance } = useAdminData();
  const { t } = useAdminT();
  const [editing, setEditing] = useState<Insurance | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirm, setConfirm] = useState<Insurance | null>(null);

  return (
    <>
      <PageHeader title={t.insurance.title} sub={t.insurance.sub} action={<Button onClick={() => { setEditing(emptyInsurance()); setIsNew(true); }}>{t.insurance.add}</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        {data.insurances.map((i) => (
          <div key={i.id} className={`flex flex-col rounded-xl border p-5 shadow-[var(--shadow-card)] ${i.featured ? "border-expressway bg-white" : "border-mist bg-white"}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-[1.1rem] font-bold text-ink">{i.name || t.common.untitled}</h3>
              <div className="flex flex-col items-end gap-1">
                {i.active ? <Badge tone="ok">{t.insurance.on}</Badge> : <Badge tone="off">{t.common.off}</Badge>}
                {i.featured && <Badge tone="star">{t.insurance.featured}</Badge>}
              </div>
            </div>
            <p className="mt-1 text-sm text-stone">{i.description}</p>
            <p className="mt-3 font-display text-[1.4rem] font-extrabold text-ink">
              {i.pricePerDay === 0 ? <span className="text-expressway">{t.insurance.included}</span> : <>+{yen(i.pricePerDay)}<span className="text-sm font-medium text-stone">{t.common.perDay}</span></>}
            </p>
            <ul className="mt-3 flex-1 space-y-1.5 text-[0.85rem] text-ink/85">
              {i.features.map((f) => <li key={f} className="flex gap-2"><span className="text-expressway">✓</span>{f}</li>)}
            </ul>
            <div className="mt-4 flex gap-1.5">
              <Button variant="ghost" className="px-3 py-1.5" onClick={() => { setEditing({ ...i }); setIsNew(false); }}>{t.common.edit}</Button>
              <Button variant="subtle" className="px-3 py-1.5" onClick={() => setConfirm(i)}>{t.common.delete}</Button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <InsuranceForm key={editing.id || "new"} value={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={async (i) => { if (await saveInsurance(i)) setEditing(null); }} />
      )}

      {confirm && (
        <Modal
          title={t.insurance.deleteTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" onClick={async () => { if (await removeInsurance(confirm.id)) setConfirm(null); }}>{t.common.delete}</Button></>}
        >
          <p className="text-sm text-ink">{t.insurance.deleteBody}</p>
        </Modal>
      )}
    </>
  );
}

function InsuranceForm({ value, isNew, onClose, onSave }: { value: Insurance; isNew: boolean; onClose: () => void; onSave: (i: Insurance) => void }) {
  const { t } = useAdminT();
  const [i, setI] = useState<Insurance>(value);
  const set = <K extends keyof Insurance>(k: K, val: Insurance[K]) => setI((s) => ({ ...s, [k]: val }));

  return (
    <Modal
      title={isNew ? t.insurance.formAdd : t.insurance.formEdit}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="ins-form">{isNew ? t.insurance.saveAdd : t.insurance.saveEdit}</Button></>}
    >
      <form id="ins-form" onSubmit={(e) => { e.preventDefault(); if (i.name.trim()) onSave(i); }} className="space-y-4">
        <Field label={t.insurance.name}><input className={inputCls} value={i.name} onChange={(e) => set("name", e.target.value)} placeholder={t.insurance.namePh} /></Field>
        <Field label={t.insurance.description}><input className={inputCls} value={i.description} onChange={(e) => set("description", e.target.value)} placeholder={t.insurance.descPh} /></Field>
        <Field label={t.insurance.price} hint={t.insurance.priceHint}>
          <input type="number" min={0} step={50} className={inputCls} value={i.pricePerDay} onChange={(e) => set("pricePerDay", +e.target.value)} />
        </Field>
        <Field label={t.insurance.covered} hint={t.insurance.coveredHint}>
          <textarea className={`${inputCls} h-24 resize-none`} value={i.features.join("\n")} onChange={(e) => set("features", e.target.value.split("\n").map((f) => f.trim()).filter(Boolean))} placeholder={"Reduced deductible\nRoadside assistance"} />
        </Field>
        <TranslationsPanel
          i18n={i.i18n}
          onChange={(v) => set("i18n", v)}
          fields={[
            { key: "name", label: t.insurance.name, base: i.name },
            { key: "description", label: t.insurance.description, base: i.description },
            { key: "features", label: t.insurance.covered, base: i.features, list: true },
          ]}
        />
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
            <input type="checkbox" checked={i.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
            <span className="text-sm text-ink">{t.insurance.offerLabel}</span>
          </label>
          <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
            <input type="checkbox" checked={i.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
            <span className="text-sm text-ink">{t.insurance.featuredLabel}</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
