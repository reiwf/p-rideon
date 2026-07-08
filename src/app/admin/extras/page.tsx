"use client";

import { useState } from "react";
import { useAdminData, type Extra } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Badge, Field, Modal, PageHeader, inputCls, yen } from "@/components/admin/ui";
import { TranslationsPanel } from "@/components/admin/Translatable";

function emptyExtra(): Extra {
  return { id: "", name: "", description: "", pricePerDay: 550, maxQty: 1, sort: 0, active: true, i18n: {} };
}

export default function ExtrasPage() {
  const { data, saveExtra, removeExtra } = useAdminData();
  const { t } = useAdminT();
  const [editing, setEditing] = useState<Extra | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirm, setConfirm] = useState<Extra | null>(null);

  return (
    <>
      <PageHeader title={t.extras.title} sub={t.extras.sub} action={<Button onClick={() => { setEditing(emptyExtra()); setIsNew(true); }}>{t.extras.add}</Button>} />

      {data.extras.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm text-stone">{t.extras.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {data.extras.map((x) => (
            <div key={x.id} className="flex flex-col rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[1.1rem] font-bold text-ink">{x.name || t.common.untitled}</h3>
                {x.active ? <Badge tone="ok">{t.common.active}</Badge> : <Badge tone="off">{t.common.off}</Badge>}
              </div>
              <p className="mt-1 flex-1 text-sm text-stone">{x.description}</p>
              <p className="mt-3 font-display text-[1.4rem] font-extrabold text-ink">
                +{yen(x.pricePerDay)}<span className="text-sm font-medium text-stone">{t.extras.each}</span>
              </p>
              <p className="mt-1 text-[0.8rem] text-stone">{t.extras.maxQty.replace("{n}", String(x.maxQty))}</p>
              <div className="mt-4 flex gap-1.5">
                <Button variant="ghost" className="px-3 py-1.5" onClick={() => { setEditing({ ...x }); setIsNew(false); }}>{t.common.edit}</Button>
                <Button variant="subtle" className="px-3 py-1.5" onClick={() => setConfirm(x)}>{t.common.delete}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ExtraForm key={editing.id || "new"} value={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={async (x) => { if (await saveExtra(x)) setEditing(null); }} />
      )}

      {confirm && (
        <Modal
          title={t.extras.deleteTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" onClick={async () => { if (await removeExtra(confirm.id)) setConfirm(null); }}>{t.common.delete}</Button></>}
        >
          <p className="text-sm text-ink">{t.extras.deleteBody}</p>
        </Modal>
      )}
    </>
  );
}

function ExtraForm({ value, isNew, onClose, onSave }: { value: Extra; isNew: boolean; onClose: () => void; onSave: (x: Extra) => void }) {
  const { t } = useAdminT();
  const [x, setX] = useState<Extra>(value);
  const set = <K extends keyof Extra>(k: K, val: Extra[K]) => setX((s) => ({ ...s, [k]: val }));

  return (
    <Modal
      title={isNew ? t.extras.formAdd : t.extras.formEdit}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="extra-form">{isNew ? t.extras.saveAdd : t.extras.saveEdit}</Button></>}
    >
      <form id="extra-form" onSubmit={(e) => { e.preventDefault(); if (x.name.trim()) onSave(x); }} className="space-y-4">
        <Field label={t.extras.name}><input className={inputCls} value={x.name} onChange={(e) => set("name", e.target.value)} placeholder={t.extras.namePh} /></Field>
        <Field label={t.extras.description}><input className={inputCls} value={x.description} onChange={(e) => set("description", e.target.value)} placeholder={t.extras.descPh} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.extras.price} hint={t.extras.priceHint}>
            <input type="number" min={0} step={50} className={inputCls} value={x.pricePerDay} onChange={(e) => set("pricePerDay", +e.target.value)} />
          </Field>
          <Field label={t.extras.qty} hint={t.extras.qtyHint}>
            <input type="number" min={1} max={9} className={inputCls} value={x.maxQty} onChange={(e) => set("maxQty", Math.max(1, +e.target.value))} />
          </Field>
        </div>
        <Field label={t.extras.sort} hint={t.extras.sortHint}>
          <input type="number" className={inputCls} value={x.sort} onChange={(e) => set("sort", +e.target.value)} />
        </Field>
        <TranslationsPanel
          i18n={x.i18n}
          onChange={(v) => set("i18n", v)}
          fields={[
            { key: "name", label: t.extras.name, base: x.name },
            { key: "description", label: t.extras.description, base: x.description },
          ]}
        />
        <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
          <input type="checkbox" checked={x.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
          <span className="text-sm text-ink">{t.extras.activeLabel}</span>
        </label>
      </form>
    </Modal>
  );
}
