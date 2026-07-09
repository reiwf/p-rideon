"use client";

import { useState } from "react";
import { useAdminData, vehicleClasses, classHue, type AdminVehicle } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { supabase } from "@/lib/supabaseClient";
import { T_LOCALES, type TLocale } from "@/lib/i18nContent";
import { CarMark } from "@/components/icons";
import { Button, Badge, Field, Modal, PageHeader, inputCls, yen } from "@/components/admin/ui";
import { TranslationsPanel } from "@/components/admin/Translatable";
import { ImageUploader } from "@/components/admin/ImageUploader";

function emptyVehicle(): AdminVehicle {
  return {
    id: "",
    name: "",
    jp: "",
    cls: "compact",
    seats: 5,
    bags: 2,
    transmission: "AT",
    fuel: "Petrol",
    pricePerDay: 8000,
    extensionPerHour: 0,
    tags: [],
    hue: classHue.compact,
    active: true,
    i18n: {},
    images: [],
  };
}

export default function VehiclesPage() {
  const { data, saveVehicle, removeVehicle } = useAdminData();
  const { t } = useAdminT();
  const [editing, setEditing] = useState<AdminVehicle | null>(null);
  const [confirm, setConfirm] = useState<AdminVehicle | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [trBusy, setTrBusy] = useState(false);
  const [trMsg, setTrMsg] = useState("");

  function openNew() { setEditing(emptyVehicle()); setIsNew(true); }
  function openEdit(v: AdminVehicle) { setEditing({ ...v }); setIsNew(false); }

  /** Fill missing ja/zh/ko translations of tags + fuel for every vehicle (DeepL).
      Existing translations are preserved. */
  async function translateAllVehicles() {
    if (trBusy) return;
    setTrBusy(true);
    setTrMsg("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? "";
      const total = data.vehicles.length;
      let processed = 0;
      let changed = 0;

      for (const v of data.vehicles) {
        processed++;
        setTrMsg(t.vehicles.translatingAll.replace("{done}", String(processed)).replace("{total}", String(total)));

        const tags = v.tags ?? [];
        const fuel = (v.fuel ?? "").trim();
        const tagsDone = (loc: TLocale) => {
          const a = v.i18n.tags?.[loc];
          return !!a && a.length === tags.length && a.every((s) => s && s.trim());
        };
        const fuelDone = (loc: TLocale) => !!v.i18n.fuel?.[loc]?.trim();
        const needed = T_LOCALES.filter((loc) => (tags.length > 0 && !tagsDone(loc)) || (fuel && !fuelDone(loc)));
        if (needed.length === 0) continue;

        const payload = [...tags, fuel];
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: payload, targets: needed }),
        });
        const json = (await res.json()) as { translations?: Record<string, string[]>; error?: string };
        if (!res.ok) throw new Error(json.error || t.tr.failed);

        let nextI18n = { ...v.i18n };
        for (const loc of needed) {
          const arr = json.translations?.[loc];
          if (!arr) continue;
          if (tags.length > 0 && !tagsDone(loc)) nextI18n = { ...nextI18n, tags: { ...(nextI18n.tags ?? {}), [loc]: arr.slice(0, tags.length) } };
          if (fuel && !fuelDone(loc)) nextI18n = { ...nextI18n, fuel: { ...(nextI18n.fuel ?? {}), [loc]: arr[tags.length] ?? "" } };
        }
        await saveVehicle({ ...v, i18n: nextI18n });
        changed++;
      }
      setTrMsg(changed === 0 ? t.vehicles.translateNone : t.vehicles.translateDone.replace("{n}", String(changed)));
    } catch (e) {
      setTrMsg((e as Error).message);
    } finally {
      setTrBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t.vehicles.title}
        sub={t.vehicles.sub}
        action={
          <div className="flex items-center gap-2">
            {trMsg && <span className="text-[0.72rem] text-stone">{trMsg}</span>}
            <Button variant="ghost" disabled={trBusy || data.vehicles.length === 0} onClick={translateAllVehicles}>{t.vehicles.translateAll}</Button>
            <Button onClick={openNew}>{t.vehicles.add}</Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="border-b border-mist bg-paper-dim/40 text-left text-[0.72rem] uppercase tracking-wide text-stone">
            <tr>
              <th className="px-4 py-3 font-semibold">{t.vehicles.thVehicle}</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t.vehicles.thClass}</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">{t.vehicles.thSeats}</th>
              <th className="px-4 py-3 text-right font-semibold">{t.vehicles.thRate}</th>
              <th className="px-4 py-3 font-semibold">{t.common.status}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {data.vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-paper-dim/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-16 shrink-0 place-items-center rounded-md border border-mist bg-paper">
                      <CarMark cls={v.cls} hue={v.hue} className="h-8 w-12" />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">{v.name || t.common.untitled}</span>
                      <span className="block text-[0.75rem] text-stone">{v.jp}</span>
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 capitalize text-stone sm:table-cell">{v.cls}</td>
                <td className="hidden px-4 py-3 tabular-nums text-stone md:table-cell">{v.seats}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{yen(v.pricePerDay)}</td>
                <td className="px-4 py-3">{v.active ? <Badge tone="ok">{t.common.published}</Badge> : <Badge tone="off">{t.common.hidden}</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" className="px-2.5 py-1.5" onClick={() => openEdit(v)}>{t.common.edit}</Button>
                    <Button variant="subtle" className="px-2.5 py-1.5" onClick={() => setConfirm(v)}>{t.common.delete}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {data.vehicles.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-stone">{t.vehicles.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <VehicleForm key={editing.id || "new"} value={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={async (v) => { if (await saveVehicle(v)) setEditing(null); }} />
      )}

      {confirm && (
        <Modal
          title={t.vehicles.deleteTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" onClick={async () => { if (await removeVehicle(confirm.id)) setConfirm(null); }}>{t.common.delete}</Button></>}
        >
          <p className="text-sm text-ink">{t.vehicles.deleteBody}</p>
        </Modal>
      )}
    </>
  );
}

function VehicleForm({ value, isNew, onClose, onSave }: { value: AdminVehicle; isNew: boolean; onClose: () => void; onSave: (v: AdminVehicle) => void }) {
  const { t } = useAdminT();
  const [v, setV] = useState<AdminVehicle>(value);
  const set = <K extends keyof AdminVehicle>(k: K, val: AdminVehicle[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return;
    onSave({ ...v, hue: v.hue || classHue[v.cls] });
  }

  return (
    <Modal
      title={isNew ? t.vehicles.formAdd : t.vehicles.formEdit}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="veh-form">{isNew ? t.vehicles.saveAdd : t.vehicles.saveEdit}</Button></>}
    >
      <form id="veh-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.vehicles.modelName}><input className={inputCls} value={v.name} onChange={(e) => set("name", e.target.value)} placeholder={t.vehicles.modelPh} /></Field>
          <Field label={t.vehicles.jpName}><input className={inputCls} value={v.jp} onChange={(e) => set("jp", e.target.value)} placeholder={t.vehicles.jpPh} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.vehicles.cls}>
            <select className={inputCls} value={v.cls} onChange={(e) => { const cls = e.target.value as AdminVehicle["cls"]; setV((s) => ({ ...s, cls, hue: classHue[cls] })); }}>
              {vehicleClasses.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </Field>
          <Field label={t.vehicles.transmission}>
            <select className={inputCls} value={v.transmission} onChange={(e) => set("transmission", e.target.value as "AT" | "MT")}>
              <option value="AT">{t.vehicles.auto}</option>
              <option value="MT">{t.vehicles.manual}</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t.vehicles.seats}><input type="number" min={1} max={12} className={inputCls} value={v.seats} onChange={(e) => set("seats", +e.target.value)} /></Field>
          <Field label={t.vehicles.bags}><input type="number" min={0} max={12} className={inputCls} value={v.bags} onChange={(e) => set("bags", +e.target.value)} /></Field>
          <Field label={t.vehicles.fuel}>
            <select className={inputCls} value={v.fuel} onChange={(e) => set("fuel", e.target.value)}>
              {["Petrol", "Hybrid", "Diesel", "EV"].map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.vehicles.dailyRate} hint={t.vehicles.dailyRateHint}>
            <input type="number" min={0} step={100} className={inputCls} value={v.pricePerDay} onChange={(e) => set("pricePerDay", +e.target.value)} />
          </Field>
          <Field label={t.vehicles.extHour} hint={t.vehicles.extHourHint}>
            <input type="number" min={0} step={100} className={inputCls} value={v.extensionPerHour} onChange={(e) => set("extensionPerHour", +e.target.value)} />
          </Field>
        </div>

        <Field label={t.vehicles.tags} hint={t.vehicles.tagsHint}>
          <input className={inputCls} value={v.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="Popular, City + day trips" />
        </Field>

        <TranslationsPanel
          i18n={v.i18n}
          onChange={(val) => set("i18n", val)}
          fields={[
            { key: "tags", label: t.vehicles.tags, base: v.tags, list: true },
            { key: "fuel", label: t.vehicles.fuel, base: v.fuel },
          ]}
        />

        <ImageUploader images={v.images} onChange={(imgs) => set("images", imgs)} />

        <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
          <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
          <span className="text-sm text-ink">{t.vehicles.publishedLabel}</span>
        </label>
      </form>
    </Modal>
  );
}
