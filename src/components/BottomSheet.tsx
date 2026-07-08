"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

/** True after hydration (false during SSR and the hydration render). */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** True on narrow/touch viewports. SSR-safe: false until hydrated. */
export function useIsMobile(query = "(max-width: 767px)") {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Slide-up bottom sheet. Used on mobile wherever desktop would show a dropdown. */
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const mounted = useMounted();

  const requestClose = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, 220); // let the slide-down play first
  }, [onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [requestClose]);

  if (!mounted) return null;
  const shown = entered && !leaving;

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={requestClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[18px] border-t border-hairline bg-surface shadow-[var(--shadow-card)] transition-transform duration-200 ease-out ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-raised" />
        </div>
        <div className="flex items-center justify-between px-4 pb-1 pt-1.5">
          <span className="font-display text-[1.0625rem] text-ink">{title}</span>
          <button onClick={requestClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
