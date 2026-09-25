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

type FormMode = "new" | "edit" | "copy";

function emptyVehicle(): AdminVehicle {
  return {
    id: "",
    plateNumber: "",
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
    sort: 0,
    i18n: {},
    images: [],
  };
}

export default function VehiclesPage() {
  const { data, saveVehicle, removeVehicle } = useAdminData();
  const { t } = useAdminT();
  const [editing, setEditing] = useState<AdminVehicle | null>(null);
  const [confirm, setConfirm] = useState<AdminVehicle | null>(null);
  const [mode, setMode] = useState<FormMode>("new");
  /** the car a copy was taken from, named in the form's hint */
  const [copiedFrom, setCopiedFrom] = useState("");
  // a copy has no id yet, so the id alone cannot key the form — this makes
  // every open a fresh mount, even two copies in a row
  const [formSeq, setFormSeq] = useState(0);

  const [trBusy, setTrBusy] = useState(false);
  const [trMsg, setTrMsg] = useState("");

  function openNew() {
    setEditing(emptyVehicle());
    setMode("new");
    setFormSeq((n) => n + 1);
  }

  function openEdit(v: AdminVehicle) {
    setEditing({ ...v });
    setMode("edit");
    setFormSeq((n) => n + 1);
  }

  /** Duplicate a car's whole setup for a second vehicle of the same type.
      Everything carries over except the identity: a copy is a new row, and
      the plate is deliberately blank because no two cars can share one. */
  function openCopy(v: AdminVehicle) {
    setEditing({
      ...v,
      id: "",
      plateNumber: "",
      // own copies of the mutable collections, so editing the duplicate can
      // never reach back into the car it came from
      tags: [...v.tags],
      images: [...v.images],
      i18n: structuredClone(v.i18n),
    });
    setCopiedFrom(v.plateNumber.trim() || v.name.trim() || t.common.untitled);
    setMode("copy");
    setFormSeq((n) => n + 1);
  }

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
              <th className="px-4 py-3 font-semibold">{t.vehicles.thPlate}</th>
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
                    <span className="min-w-0">
                      <span className={`block font-semibold ${v.plateNumber.trim() ? "font-mono tracking-wide text-ink" : "text-stone italic"}`}>
                        {v.plateNumber.trim() || t.vehicles.noPlate}
                      </span>
                      <span className="block truncate text-[0.75rem] text-stone">{v.name || t.common.untitled}</span>
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
                    <Button variant="ghost" className="px-2.5 py-1.5" title={t.vehicles.copyHintShort} onClick={() => openCopy(v)}>{t.vehicles.copy}</Button>
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
        <VehicleForm
          key={formSeq}
          value={editing}
          mode={mode}
          copiedFrom={copiedFrom}
          fleet={data.vehicles}
          onClose={() => setEditing(null)}
          onSave={async (v) => { if (await saveVehicle(v)) setEditing(null); }}
        />
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

function VehicleForm({ value, mode, copiedFrom, fleet, onClose, onSave }: {
  value: AdminVehicle;
  mode: FormMode;
  copiedFrom: string;
  fleet: AdminVehicle[];
  onClose: () => void;
  onSave: (v: AdminVehicle) => void;
}) {
  const { t } = useAdminT();
  // a copy saves as a new row, so it behaves like "add" everywhere but the title
  const isNew = mode !== "edit";
  const [v, setV] = useState<AdminVehicle>(value);
  const [err, setErr] = useState("");
  const set = <K extends keyof AdminVehicle>(k: K, val: AdminVehicle[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const plate = v.plateNumber.trim();
    if (!plate) { setErr(t.vehicles.plateRequired); return; }
    if (!v.name.trim()) { setErr(t.vehicles.modelRequired); return; }
    // the database enforces this too; catching it here gives staff a readable
    // message instead of a unique-index violation
    if (fleet.some((o) => o.id !== v.id && o.plateNumber.trim().toLowerCase() === plate.toLowerCase())) {
      setErr(t.vehicles.plateTaken);
      return;
    }
    setErr("");
    onSave({ ...v, plateNumber: plate, hue: v.hue || classHue[v.cls] });
  }

  return (
    <Modal
      title={mode === "edit" ? t.vehicles.formEdit : mode === "copy" ? t.vehicles.formCopy : t.vehicles.formAdd}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="veh-form">{isNew ? t.vehicles.saveAdd : t.vehicles.saveEdit}</Button></>}
    >
      <form id="veh-form" onSubmit={submit} className="space-y-4">
        {mode === "copy" && (
          <p className="rounded-lg border border-expressway/30 bg-expressway/8 px-3 py-2.5 text-[0.78rem] leading-[1.5] text-ink">
            {t.vehicles.copyHint.replace("{name}", copiedFrom)}
          </p>
        )}

        {/* the plate identifies this one physical car — it is the row title in
            this console and the row label on the fleet timeline, and it is
            never sent to the public site */}
        <Field label={t.vehicles.plate} hint={t.vehicles.plateHint}>
          <input
            className={`${inputCls} font-mono tracking-wide`}
            value={v.plateNumber}
            onChange={(e) => { set("plateNumber", e.target.value); setErr(""); }}
            placeholder={t.vehicles.platePh}
            autoFocus={isNew}
          />
        </Field>

        {err && <p className="text-[0.78rem] text-signal">{err}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.vehicles.modelName} hint={t.vehicles.modelHint}><input className={inputCls} value={v.name} onChange={(e) => set("name", e.target.value)} placeholder={t.vehicles.modelPh} /></Field>
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
