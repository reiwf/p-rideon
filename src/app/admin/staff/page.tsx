"use client";

/* Admin accounts. Reading the list uses the signed-in session (car_staff has a
   staff-only SELECT policy); creating and revoking go through /api/staff, which
   is the only place the service role key is used. */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Field, Modal, PageHeader, inputCls } from "@/components/admin/ui";

type StaffRow = { user_id: string; email: string; full_name: string; role: string; created_at: string };

export default function StaffPage() {
  const { t, lang } = useAdminT();
  const s = t.staff;
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<StaffRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // returns rather than sets, so the effect can apply the result in a promise
  // callback and drop it if the page has since unmounted
  const fetchStaff = useCallback(async () => {
    const [{ data }, { data: session }] = await Promise.all([
      supabase.from("car_staff").select("*").order("created_at", { ascending: true }),
      supabase.auth.getSession(),
    ]);
    return { rows: (data ?? []) as StaffRow[], me: session.session?.user.id ?? null };
  }, []);

  const apply = useCallback((r: { rows: StaffRow[]; me: string | null }) => {
    setRows(r.rows);
    setMe(r.me);
    setReady(true);
  }, []);

  const refresh = useCallback(async () => apply(await fetchStaff()), [apply, fetchStaff]);

  useEffect(() => {
    let alive = true;
    fetchStaff().then((r) => { if (alive) apply(r); }).catch(() => { if (alive) setReady(true); });
    fetch("/api/staff")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => { if (alive) setConfigured(Boolean(j.configured)); })
      .catch(() => { if (alive) setConfigured(false); });
    return () => { alive = false; };
  }, [fetchStaff, apply]);

  /** Translate the route's error codes into something staff can act on. */
  const explain = (code: string) =>
    ({
      not_configured: s.notConfigured,
      bad_email: s.badEmail,
      weak_password: s.weakPassword,
      self_remove: s.selfRemove,
      last_staff: s.lastStaff,
    })[code] ?? code;

  async function authed(input: string, init: RequestInit) {
    const { data } = await supabase.auth.getSession();
    return fetch(input, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
  }

  async function create(form: { email: string; fullName: string; password: string }) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await authed("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { ok?: boolean; promoted?: boolean; error?: string };
      if (!res.ok) throw new Error(explain(json.error ?? `HTTP ${res.status}`));
      setAdding(false);
      setMsg({ ok: true, text: json.promoted ? s.promoted : s.created });
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(row: StaffRow) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await authed(`/api/staff?user_id=${encodeURIComponent(row.user_id)}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(explain(json.error ?? `HTTP ${res.status}`));
      setConfirm(null);
      setMsg({ ok: true, text: s.revoked });
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={s.title}
        sub={s.sub}
        action={<Button disabled={!configured} onClick={() => { setAdding(true); setMsg(null); }}>{s.add}</Button>}
      />

      {/* {!configured && <p className="mb-4 rounded-lg border border-signal/40 bg-signal/5 px-4 py-3 text-[0.8rem] text-signal">{s.notConfigured}</p>} */}
      {msg && <p className={`mb-4 text-[0.8rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>}

      <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="border-b border-mist bg-paper-dim/40 text-left text-[0.72rem] uppercase tracking-wide text-stone">
            <tr>
              <th className="px-4 py-3 font-semibold">{s.thName}</th>
              <th className="px-4 py-3 font-semibold">{s.thEmail}</th>
              <th className="px-4 py-3 font-semibold">{s.thSince}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {rows.map((r) => (
              <tr key={r.user_id} className="hover:bg-paper-dim/30">
                <td className="px-4 py-3 text-ink">
                  {r.full_name || "—"}
                  {r.user_id === me && <span className="ml-2 text-[0.72rem] text-stone">{s.you}</span>}
                </td>
                <td className="px-4 py-3 text-stone">{r.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-stone">
                  {new Date(r.created_at).toLocaleDateString(lang === "ja" ? "ja-JP" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.user_id !== me && rows.length > 1 && (
                    <Button variant="subtle" className="px-3 py-1.5" onClick={() => setConfirm(r)}>{s.revoke}</Button>
                  )}
                </td>
              </tr>
            ))}
            {ready && rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-stone">{s.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && <AddForm busy={busy} onClose={() => setAdding(false)} onSave={create} />}

      {confirm && (
        <Modal
          title={s.revokeTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" disabled={busy} onClick={() => revoke(confirm)}>{s.revoke}</Button></>}
        >
          <p className="text-sm text-ink">{s.revokeBody.replace("{email}", confirm.email)}</p>
        </Modal>
      )}
    </>
  );
}

function AddForm({
  busy, onClose, onSave,
}: {
  busy: boolean;
  onClose: () => void;
  onSave: (f: { email: string; fullName: string; password: string }) => void;
}) {
  const { t } = useAdminT();
  const s = t.staff;
  const [f, setF] = useState({ email: "", fullName: "", password: "" });
  const valid = /^\S+@\S+\.\S+$/.test(f.email) && f.password.length >= 8;

  return (
    <Modal
      title={s.add}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="staff-form" disabled={busy || !valid}>{busy ? t.common.loading : s.create}</Button></>}
    >
      <form id="staff-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(f); }} className="space-y-4">
        <p className="rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5 text-[0.78rem] text-stone">{s.addHint}</p>
        <Field label={s.thName}>
          <input className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoComplete="off" />
        </Field>
        <Field label={s.thEmail}>
          <input className={inputCls} inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" />
        </Field>
        <Field label={s.password} hint={s.passwordHint}>
          <input className={inputCls} type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
        </Field>
      </form>
    </Modal>
  );
}
