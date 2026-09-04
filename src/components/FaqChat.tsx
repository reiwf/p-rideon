"use client";

/* Help-desk chat. A launcher pinned bottom-right opens a panel (a bottom sheet
   on mobile, matching every other picker on the site). Typed questions go
   through `matchFaq`, which either answers, offers a short "did you mean" list,
   falls back to topic chips, or hands off to the phone number in the footer.

   Everything runs in the browser: the FAQ list is small, loads once on first
   open, and matching is local — so replies are instant and cost nothing.
   Questions are logged to car_faq_queries (append-only) so staff can see what
   guests actually ask, and especially what went unanswered. */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "./LanguageProvider";
import { BottomSheet, useIsMobile, useMounted } from "./BottomSheet";
import { DEFAULT_SETTINGS, buildRentalTimes, type SiteSettings } from "@/lib/siteSettings";
import { Headset } from "./icons";
import {
  matchFaq, faqAnswer, faqQuestion, faqTopics, faqsInTopic,
  type Faq, type FaqReply,
} from "@/lib/faq";

type Chip = { key: string; label: string; pick: () => void };
type Msg = {
  id: number;
  role: "user" | "bot";
  text: string;
  chips?: Chip[];
  /** render the phone number under this message */
  contact?: boolean;
};

/** uuid for grouping one visitor's questions, with a non-secure-context fallback. */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // must still be a valid uuid — session_id is a uuid column
  const hex = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, "0");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(8)}${hex(4)}`;
}

type DbFaq = { id: string; topic: string; question: string; answer: string; keywords: string[] | null; i18n: Faq["i18n"] };

export function FaqChat({ settings = DEFAULT_SETTINGS }: { settings?: SiteSettings }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const mounted = useMounted();

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.faq.launch}
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-accent-ink shadow-[var(--shadow-card)] transition-[filter] hover:brightness-[1.08]"
      >
        <Headset className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">{t.faq.launch}</span>
      </button>

      {open && (isMobile ? (
        <BottomSheet title={t.faq.title} onClose={() => setOpen(false)}>
          <ChatBody settings={settings} />
        </BottomSheet>
      ) : (
        <div className="fixed bottom-5 right-5 z-[80] flex max-h-[min(34rem,80vh)] w-[23rem] flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="font-display text-[1.0625rem] text-ink">{t.faq.title}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.faq.close}
              className="grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <ChatBody settings={settings} />
        </div>
      ))}
    </>
  );
}

function ChatBody({ settings }: { settings: SiteSettings }) {
  const { t, locale } = useI18n();
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const seq = useRef(0);
  const session = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // randomUUID needs a secure context; testing the site over http:// on a LAN
  // address would otherwise throw and take the whole widget down
  if (session.current == null) session.current = newId();

  const nextId = () => ++seq.current;

  useEffect(() => {
    let alive = true;
    supabase
      .from("car_faqs")
      .select("id,topic,question,answer,keywords,i18n")
      .eq("active", true)
      .order("sort", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setFaqs(((data ?? []) as DbFaq[]).map((r) => ({ ...r, keywords: r.keywords ?? [] })));
      });
    return () => { alive = false; };
  }, []);

  // keep the newest message in view as the conversation grows
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  /** Fire-and-forget: a logging failure must never break the conversation. */
  const log = useCallback((query: string, outcome: string, faqId: string | null) => {
    void supabase
      .from("car_faq_queries")
      .insert({ session_id: session.current, locale, query: query.slice(0, 500), outcome, faq_id: faqId })
      .then(() => undefined);
  }, [locale]);

  const showAnswer = useCallback((faq: Faq) => {
    setMsgs((m) => [...m, { id: nextId(), role: "bot", text: faqAnswer(faq, locale) }]);
  }, [locale]);

  const showTopic = useCallback((topic: string, list: Faq[]) => {
    setMsgs((m) => [...m, {
      id: nextId(), role: "bot", text: t.faq.topicPick,
      chips: faqsInTopic(list, topic, locale).map((f) => ({
        key: f.id,
        label: faqQuestion(f, locale),
        pick: () => {
          setMsgs((mm) => [...mm, { id: nextId(), role: "user", text: faqQuestion(f, locale) }]);
          showAnswer(f);
        },
      })),
    }]);
  }, [locale, t, showAnswer]);

  /** Turn a matcher verdict into the next bot message. */
  const render = useCallback((reply: FaqReply, list: Faq[]) => {
    if (reply.kind === "answer") { showAnswer(reply.faq); return; }

    if (reply.kind === "choose") {
      setMsgs((m) => [...m, {
        id: nextId(), role: "bot", text: t.faq.chooseIntro,
        chips: reply.faqs.map((f) => ({
          key: f.id,
          label: faqQuestion(f, locale),
          pick: () => {
            setMsgs((mm) => [...mm, { id: nextId(), role: "user", text: faqQuestion(f, locale) }]);
            showAnswer(f);
          },
        })),
      }]);
      return;
    }

    // "topics" means nothing matched, so it is a hand-off too: show the phone
    // number as well as somewhere to browse
    if (reply.kind === "topics") {
      setMsgs((m) => [...m, {
        id: nextId(), role: "bot", text: t.faq.topicsIntro, contact: true,
        chips: reply.topics.map((topic) => ({ key: topic, label: topic, pick: () => showTopic(topic, list) })),
      }]);
      return;
    }

    setMsgs((m) => [...m, { id: nextId(), role: "bot", text: t.faq.noMatch, contact: true }]);
  }, [locale, t, showAnswer, showTopic]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || !faqs) return;
    setInput("");
    setMsgs((m) => [...m, { id: nextId(), role: "user", text: query }]);

    const reply = matchFaq(query, faqs, locale);
    render(reply, faqs);
    log(query, reply.kind, reply.kind === "answer" ? reply.faq.id : null);
  }

  const topics = faqs ? faqTopics(faqs, locale) : [];
  const openTimes = buildRentalTimes(settings.openTime, settings.closeTime, settings.stepMinutes);
  const hoursLine = t.footer.hours
    .replace("{from}", openTimes[0] ?? settings.openTime)
    .replace("{to}", openTimes[openTimes.length - 1] ?? settings.closeTime);

  return (
    <>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:max-h-none">
        <p className="text-[0.85rem] font-light leading-[1.6] text-muted">{t.faq.intro}</p>

        {/* opening topic chips, so there is always somewhere to start */}
        {msgs.length === 0 && topics.length > 0 && (
          <ChipRow chips={topics.map((topic) => ({ key: topic, label: topic, pick: () => showTopic(topic, faqs ?? []) }))} />
        )}
        {faqs !== null && faqs.length === 0 && (
          <p className="text-[0.85rem] font-light text-muted">{t.faq.empty}</p>
        )}

        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-[14px] rounded-br-[4px] bg-accent px-3.5 py-2.5 text-[0.85rem] leading-[1.55] text-accent-ink"
                  : "max-w-[92%] rounded-[14px] rounded-bl-[4px] border border-hairline bg-raised px-3.5 py-2.5 text-[0.85rem] font-light leading-[1.6] text-ink/90"
              }
            >
              {m.text}
              {m.contact && (
                <span className="mt-2 block">
                  <span className="block text-[0.78rem] text-muted">{t.faq.contactIntro}</span>
                  <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="tnum mt-0.5 block font-medium text-accent hover:underline">
                    {settings.phone}
                  </a>
                  <span className="block text-[0.78rem] text-muted">{hoursLine}</span>
                </span>
              )}
              {m.chips && m.chips.length > 0 && <ChipRow chips={m.chips} className="mt-2.5" />}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-hairline px-3 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.faq.placeholder}
          aria-label={t.faq.placeholder}
          className="min-w-0 flex-1 rounded-[12px] border border-hairline bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || !faqs}
          className="shrink-0 rounded-[12px] bg-accent px-4 py-2.5 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-accent-ink transition-[filter] hover:brightness-[1.08] disabled:opacity-50"
        >
          {t.faq.send}
        </button>
      </form>
    </>
  );
}

function ChipRow({ chips, className = "" }: { chips: Chip[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.pick}
          className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-left text-[0.78rem] font-light text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
