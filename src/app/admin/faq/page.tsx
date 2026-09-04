"use client";

/* FAQ管理 — the entries the help-desk chat answers from, plus the log of what
   visitors actually typed. Unanswered questions are the content backlog: they
   are what the matcher could not place. */

import { useState } from "react";
import { useAdminData, type Faq } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Badge, Field, Modal, PageHeader, inputCls } from "@/components/admin/ui";
import { TranslationsPanel } from "@/components/admin/Translatable";

function emptyFaq(): Faq {
  return { id: "", topic: "", question: "", answer: "", keywords: [], sort: 0, active: true, i18n: {} };
}

const outcomeTone: Record<string, "ok" | "off" | "neutral" | "star"> = {
  answer: "ok", choose: "neutral", topics: "off", handoff: "off",
};

export default function FaqPage() {
  const { data, saveFaq, removeFaq } = useAdminData();
  const { t, lang } = useAdminT();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirm, setConfirm] = useState<Faq | null>(null);
  const [showLog, setShowLog] = useState(false);

  // "topics" and "handoff" both mean the matcher had no answer to give
  const unanswered = data.faqQueries.filter((q) => q.outcome === "topics" || q.outcome === "handoff").length;

  return (
    <>
      <PageHeader
        title={t.faq.title}
        sub={t.faq.sub}
        action={<Button onClick={() => { setEditing(emptyFaq()); setIsNew(true); }}>{t.faq.add}</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-mist bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex-1">
          <p className="text-[0.9rem] font-semibold text-ink">{t.faq.logTitle}</p>
          <p className="mt-0.5 text-[0.78rem] text-stone">
            {t.faq.logHint.replace("{n}", String(data.faqQueries.length)).replace("{u}", String(unanswered))}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setShowLog((v) => !v)}>{showLog ? t.faq.logHide : t.faq.logShow}</Button>
      </div>

      {showLog && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-mist bg-white shadow-[var(--shadow-card)]">
          {data.faqQueries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-stone">{t.faq.logEmpty}</p>
          ) : (
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-mist bg-paper-dim/40 text-left text-[0.72rem] uppercase tracking-wide text-stone">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.faq.thWhen}</th>
                  <th className="px-4 py-3 font-semibold">{t.faq.thQuery}</th>
                  <th className="px-4 py-3 font-semibold">{t.faq.thLang}</th>
                  <th className="px-4 py-3 font-semibold">{t.faq.thOutcome}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {data.faqQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-paper-dim/30">
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone">
                      {new Date(q.createdAt).toLocaleString(lang === "ja" ? "ja-JP" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{q.query}</td>
                    <td className="px-4 py-2.5 uppercase text-stone">{q.locale}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={outcomeTone[q.outcome] ?? "neutral"}>
                        {(t.faq.outcome as Record<string, string>)[q.outcome] ?? q.outcome}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {data.faqs.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm text-stone">{t.faq.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {f.topic && <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-stone">{f.topic}</p>}
                  <h3 className="font-display text-[1.05rem] font-bold text-ink">{f.question || t.common.untitled}</h3>
                </div>
                {f.active ? <Badge tone="ok">{t.common.active}</Badge> : <Badge tone="off">{t.common.off}</Badge>}
              </div>
              <p className="mt-1.5 text-sm text-stone">{f.answer}</p>
              {f.keywords.length > 0 && (
                <p className="mt-2 text-[0.72rem] text-stone">{t.faq.keywords}: {f.keywords.join(", ")}</p>
              )}
              <div className="mt-3 flex gap-1.5">
                <Button variant="ghost" className="px-3 py-1.5" onClick={() => { setEditing({ ...f }); setIsNew(false); }}>{t.common.edit}</Button>
                <Button variant="subtle" className="px-3 py-1.5" onClick={() => setConfirm(f)}>{t.common.delete}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <FaqForm
          key={editing.id || "new"}
          value={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSave={async (f) => { if (await saveFaq(f)) setEditing(null); }}
        />
      )}

      {confirm && (
        <Modal
          title={t.faq.deleteTitle}
          onClose={() => setConfirm(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t.common.cancel}</Button><Button variant="danger" onClick={async () => { if (await removeFaq(confirm.id)) setConfirm(null); }}>{t.common.delete}</Button></>}
        >
          <p className="text-sm text-ink">{t.faq.deleteBody}</p>
        </Modal>
      )}
    </>
  );
}

function FaqForm({ value, isNew, onClose, onSave }: { value: Faq; isNew: boolean; onClose: () => void; onSave: (f: Faq) => void }) {
  const { t } = useAdminT();
  const [f, setF] = useState<Faq>(value);
  const set = <K extends keyof Faq>(k: K, val: Faq[K]) => setF((s) => ({ ...s, [k]: val }));

  return (
    <Modal
      title={isNew ? t.faq.formAdd : t.faq.formEdit}
      onClose={onClose}
      footer={<><Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button><Button type="submit" form="faq-form">{isNew ? t.faq.saveAdd : t.faq.saveEdit}</Button></>}
    >
      <form id="faq-form" onSubmit={(e) => { e.preventDefault(); if (f.question.trim() && f.answer.trim()) onSave(f); }} className="space-y-4">
        <Field label={t.faq.topic} hint={t.faq.topicHint}>
          <input className={inputCls} value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder={t.faq.topicPh} />
        </Field>
        <Field label={t.faq.question}>
          <input className={inputCls} value={f.question} onChange={(e) => set("question", e.target.value)} placeholder={t.faq.questionPh} />
        </Field>
        <Field label={t.faq.answer}>
          <textarea rows={4} className={inputCls} value={f.answer} onChange={(e) => set("answer", e.target.value)} placeholder={t.faq.answerPh} />
        </Field>
        <Field label={t.faq.keywords} hint={t.faq.keywordsHint}>
          <input
            className={inputCls}
            value={f.keywords.join(", ")}
            onChange={(e) => set("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder={t.faq.keywordsPh}
          />
        </Field>
        <Field label={t.faq.sort} hint={t.faq.sortHint}>
          <input type="number" className={inputCls} value={f.sort} onChange={(e) => set("sort", +e.target.value)} />
        </Field>
        <TranslationsPanel
          i18n={f.i18n}
          onChange={(v) => set("i18n", v)}
          fields={[
            { key: "topic", label: t.faq.topic, base: f.topic },
            { key: "question", label: t.faq.question, base: f.question },
            { key: "answer", label: t.faq.answer, base: f.answer },
          ]}
        />
        <label className="flex items-center gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-expressway)]" />
          <span className="text-sm text-ink">{t.faq.activeLabel}</span>
        </label>
      </form>
    </Modal>
  );
}
