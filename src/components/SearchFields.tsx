"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { intlLocale, type Locale } from "@/lib/i18n";
import { BottomSheet, useIsMobile, useMounted } from "./BottomSheet";

// --- date helpers (local time; avoid UTC day-shift from toISOString) ---
const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
};
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Popover open-state + outside/Escape close. Outside-close is skipped on mobile
    where a BottomSheet manages its own dismissal. */
function usePopover<T extends HTMLElement>(outsideClose = true) {
  const ref = useRef<T>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || !outsideClose) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, outsideClose]);
  return { ref, open, setOpen };
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Trigger({ icon, label, value, open, onClick }: { icon: React.ReactNode; label: string; value: string; open: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className="flex w-full min-w-0 items-center gap-2.5 px-4 py-3.5 text-left">
      <span className="shrink-0 text-accent">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate whitespace-nowrap text-[0.625rem] font-medium uppercase tracking-[0.2em] text-muted">{label}</span>
        <span className="mt-0.5 block truncate text-[0.95rem] text-ink">{value}</span>
      </span>
      <ChevronDown open={open} />
    </button>
  );
}

const popoverCls =
  "absolute top-full z-[60] mt-2 rounded-[14px] border border-hairline bg-surface text-ink shadow-[var(--shadow-card)]";

// ==================== Date + time (combined) ====================
export function DateTimeField({
  icon, label, date, time, onDate, onTime, locale, options, min, disablePast, align = "left",
}: {
  icon: React.ReactNode;
  label: string;
  date: string;
  time: string;
  onDate: (iso: string) => void;
  onTime: (t: string) => void;
  locale: Locale;
  options: string[];
  min?: string;
  disablePast?: boolean;
  align?: "left" | "right";
}) {
  const isMobile = useIsMobile();
  const { ref, open, setOpen } = usePopover<HTMLDivElement>(!isMobile);
  const selected = parseISO(date);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const mounted = useMounted();
  const today = mounted ? new Date() : null; // client-only, avoids an SSR date mismatch
  const timeListRef = useRef<HTMLDivElement>(null);
  const timeSelectedRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    // opening starts the calendar on the selected date's month
    if (!open) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen((o) => !o);
  }

  // keep the chosen time in view when the picker opens
  useEffect(() => {
    if (!open) return;
    const c = timeListRef.current, b = timeSelectedRef.current;
    if (c && b) c.scrollTop = b.offsetTop - c.clientHeight / 2 + b.clientHeight / 2;
  }, [open]);

  // short form (no weekday) so "Jul 4 · 10:00" fits a single column
  const display = useMemo(
    () => new Intl.DateTimeFormat(intlLocale[locale], { month: "short", day: "numeric" }).format(selected),
    [date, locale], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const monthTitle = new Intl.DateTimeFormat(intlLocale[locale], { month: "long", year: "numeric" }).format(view);
  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2023, 0, 1 + i)));
  }, [locale]);

  const minDate = min ? startOfDay(parseISO(min)) : null;
  const todayStart = today ? startOfDay(today) : null;
  const isDisabled = (d: Date) => (minDate ? d < minDate : false) || (disablePast && todayStart ? d < todayStart : false);

  const firstWeekday = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];

  function picker(big: boolean) {
    const calendar = (
      <>
        <div className="flex items-center justify-between px-1 pb-2">
          <button type="button" onClick={() => setView(addMonths(view, -1))} className="grid h-9 w-9 place-items-center rounded-md hover:bg-raised" aria-label="Previous month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <span className="font-display text-[0.95rem] capitalize">{monthTitle}</span>
          <button type="button" onClick={() => setView(addMonths(view, 1))} className="grid h-9 w-9 place-items-center rounded-md hover:bg-raised" aria-label="Next month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 px-1 pb-1 text-center text-[0.6rem] font-medium uppercase tracking-[0.12em] text-muted">
          {weekdays.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) =>
            d === null ? <span key={i} /> : (
              <button
                key={i}
                type="button"
                disabled={isDisabled(d)}
                onClick={() => onDate(toISO(d))}
                className={`grid place-items-center rounded-md tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent
                  ${big ? "h-11 text-base" : "h-9 text-sm"}
                  ${sameDay(d, selected) ? "bg-accent font-medium text-accent-ink" : "hover:bg-raised"}
                  ${todayStart && sameDay(d, todayStart) && !sameDay(d, selected) ? "ring-1 ring-inset ring-accent/50" : ""}`}
              >
                {d.getDate()}
              </button>
            ),
          )}
        </div>
      </>
    );

    const timeButton = (t: string) => (
      <button
        key={t}
        type="button"
        ref={t === time ? timeSelectedRef : undefined}
        onClick={() => { onTime(t); setOpen(false); }}
        className={`rounded-md tabular-nums transition-colors ${big ? "py-2.5 text-[0.95rem]" : "px-2 py-1.5 text-sm"} ${
          t === time ? "bg-accent font-medium text-accent-ink" : "hover:bg-raised"
        }`}
      >
        {t}
      </button>
    );

    // mobile sheet: calendar stacked above a time grid; desktop popover:
    // time rail beside the calendar so the whole picker fits on screen
    return big ? (
      <>
        {calendar}
        <div className="mt-2 border-t border-hairline pt-2">
          <div ref={timeListRef} className="grid max-h-44 grid-cols-4 gap-1 overflow-y-auto">
            {options.map(timeButton)}
          </div>
        </div>
      </>
    ) : (
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">{calendar}</div>
        <div className="w-[4.75rem] shrink-0 border-l border-hairline pl-3">
          <div ref={timeListRef} className="flex max-h-[19rem] flex-col gap-1 overflow-y-auto pr-0.5">
            {options.map(timeButton)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <Trigger icon={icon} label={label} value={`${display} · ${time}`} open={open} onClick={toggle} />
      {open &&
        (isMobile ? (
          <BottomSheet title={label} onClose={() => setOpen(false)}>{picker(true)}</BottomSheet>
        ) : (
          <div className={`${popoverCls} w-[25rem] p-3 ${align === "right" ? "right-0" : "left-0"}`}>{picker(false)}</div>
        ))}
    </div>
  );
}

// ============================ Select (e.g. branch) ============================
export function SelectField({
  icon, label, value, onChange, options, align = "left",
}: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; options: string[]; align?: "left" | "right";
}) {
  const isMobile = useIsMobile();
  const { ref, open, setOpen } = usePopover<HTMLDivElement>(!isMobile);

  function list(big: boolean) {
    return (
      <div className="flex flex-col gap-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => { onChange(o); setOpen(false); }}
            className={`rounded-md text-left transition-colors ${big ? "px-3 py-3 text-[0.95rem]" : "px-3 py-2 text-sm"} ${
              o === value ? "bg-accent font-medium text-accent-ink" : "hover:bg-raised text-ink"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <Trigger icon={icon} label={label} value={value} open={open} onClick={() => setOpen((o) => !o)} />
      {open &&
        (isMobile ? (
          <BottomSheet title={label} onClose={() => setOpen(false)}>{list(true)}</BottomSheet>
        ) : (
          <div className={`${popoverCls} w-[18rem] p-2 ${align === "right" ? "right-0" : "left-0"}`}>{list(false)}</div>
        ))}
    </div>
  );
}
