"use client";

import { useState } from "react";
import { useAdminData, type Branch } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Badge, Field, Modal, PageHeader, inputCls } from "@/components/admin/ui";

function emptyBranch(nextSort: number): Branch {
  return { id: "", name: "", address: "", sort: nextSort, active: true };
}

export default function BranchesPage() {
  const { data, saveBranch, removeBranch } = useAdminData();
  const { t } = useAdminT();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirm, setConfirm] = useState<Branch | null>(null);

  const nextSort = data.branches.length ? Math.max(...data.branches.map((b) => b.sort)) + 1 : 0;

  return (
    <>
      <PageHeader title={t.branches.title} sub={t.branches.sub} action={<Button onClick={() => { setEditing(emptyBranch(nextSort)); setIsNew(true); }}>{t.branches.add}</Button>} />

      <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="border-b border-mist bg-paper-dim/40 text-left text-[0.72rem] uppercase tracking-wide text-stone">
            <tr>
              <th className="px-4 py-3 font-semibold">{t.branches.thBranch}</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t.branches.thAddress}</th>
              <th className="px-4 py-3 font-semibold">{t.common.status}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {data.branches.map((b) => (
              <tr key={b.id} className="hover:bg-paper-dim/30">
                <td className="px-4 py-3 font-semibold text-ink">{b.name || t.common.untitled}</td>
                <td className="hidden px-4 py-3 text-stone sm:table-cell">{b.address || "—"}</td>
                <td className="px-4 py-3">{b.active ? <Badge tone="ok">{t.common.shown}</Badge> : <Badge tone="off">{t.common.hidden}</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" className="px-2.5 py-1.5" onClick={() => { setEditing({ ...b }); setIsNew(false); }}>{t.common.edit}</Button>
                    <Button variant="subtle" className="px-2.5 py-1.5" onClick={() => setConfirm(b)}>{t.common.delete}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {data.branches.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-stone">{t.branches.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <BranchForm key={editing.id || "new"} value={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={async (b) => { if (await saveBranch(b)) setEditing(null); }} />
      )}

      {confirm && (
        <Modal
          title={t.branches.deleteTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" onClick={async () => { if (await removeBranch(confirm.id)) setConfirm(null); }}>{t.common.delete}</Button></>}
        >
          <p className="text-sm text-ink">{t.branches.deleteBody}</p>
        </Modal>
      )}
    </>
  );
}

function BranchForm({ value, isNew, onClose, onSave }: { value: Branch; isNew: boolean; onClose: () => void; onSave: (b: Branch) => void }) {
  const { t } = useAdminT();
  const [b, setB] = useState<Branch>(value);
  const set = <K extends keyof Branch>(k: K, v: Branch[K]) => setB((s) => ({ ...s, [k]: v }));

  return (
    <Modal
      title={isNew ? t.branches.formAdd : t.branches.formEdit}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="branch-form">{isNew ? t.branches.saveAdd : t.branches.saveEdit}</Button></>}
    >
      <form id="branch-form" onSubmit={(e) => { e.preventDefault(); if (b.name.trim()) onSave(b); }} className="space-y-4">
        <Field label={t.branches.name} hint={t.branches.nameHint}>
          <input className={inputCls} value={b.name} onChange={(e) => set("name", e.target.value)} placeholder={t.branches.namePh} autoFocus />
        </Field>
        <Field label={t.branches.address} hint={t.branches.addressHint}>
          <input className={inputCls} value={b.address} onChange={(e) => set("address", e.target.value)} placeholder={t.branches.addressPh} />
        </Field>
        <Field label={t.branches.sort} hint={t.branches.sortHint}>
          <input type="number" className={inputCls} value={b.sort} onChange={(e) => set("sort", +e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
          <input type="checkbox" checked={b.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
          <span className="text-sm text-ink">{t.branches.shownLabel}</span>
        </label>
      </form>
    </Modal>
  );
}
