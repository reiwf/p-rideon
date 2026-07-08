"use client";

import { useEffect } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "subtle" }) {
  const styles = {
    primary: "bg-expressway text-paper hover:bg-expressway-bright",
    ghost: "border border-mist text-ink hover:bg-paper-dim",
    danger: "bg-signal text-paper hover:opacity-90",
    subtle: "text-stone hover:text-ink",
  }[variant];
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "ok" | "off" | "neutral" | "star"; children: React.ReactNode }) {
  const styles = {
    ok: "bg-expressway/12 text-expressway",
    off: "bg-stone/15 text-stone",
    neutral: "bg-ink/8 text-ink",
    star: "bg-gold/20 text-[#8a6a1e]",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${styles}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.78rem] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.72rem] text-stone">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-mist bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-expressway";

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-mist bg-paper shadow-[var(--shadow-board)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-mist px-5 py-3.5">
          <h2 className="font-display text-[1.05rem] font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-stone hover:bg-paper-dim hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-mist px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[1.6rem] font-extrabold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-stone">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function yen(n: number) {
  return "¥" + n.toLocaleString("en-US");
}
