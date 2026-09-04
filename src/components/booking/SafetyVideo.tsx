"use client";

/* Precaution video gate on the last booking step. Each language is its own file
   — the subtitles are burned into the picture — so BookingFlow remounts this on
   `src` and derives "watched"/"acknowledged" per file: switching language means
   a different video, which the guest has not watched yet.

   The acknowledgement tick is always required. Whether the video must also be
   played to the end is the `requireFullPlay` setting: in strict mode the tick
   unlocks only after `ended` and forward scrubbing is undone; relaxed, the guest
   can tick straight away and skip around freely.

   Either way, a file that fails to load is not something the guest can act on,
   so the flow lets them through unacknowledged and staff cover it at the counter. */

import { useRef } from "react";
import { useI18n } from "../LanguageProvider";
import { Check } from "../icons";

export function SafetyVideoGate({
  src, poster, strict, watched, onWatched, acked, onAcked, failed, onFailed,
}: {
  src: string;
  poster: string;
  strict: boolean;
  watched: boolean;
  onWatched: () => void;
  acked: boolean;
  onAcked: (v: boolean) => void;
  failed: boolean;
  onFailed: () => void;
}) {
  const { t } = useI18n();
  const v = t.booking.video;
  const ref = useRef<HTMLVideoElement>(null);
  // furthest point actually played — the ceiling for seeking, so the video can
  // be reviewed but not scrubbed past
  const reached = useRef(0);

  function onTimeUpdate() {
    const el = ref.current;
    if (!el) return;
    if (el.currentTime > reached.current) reached.current = el.currentTime;
  }

  /** Undo a forward scrub past what has actually been watched (strict only). */
  function onSeeking() {
    const el = ref.current;
    if (!el || !strict || watched) return;
    if (el.currentTime > reached.current + 1) el.currentTime = reached.current;
  }

  if (failed) {
    return (
      <div className="rounded-[14px] border border-signal/40 bg-signal/10 p-4 text-[0.85rem] font-light leading-[1.6] text-ink/85">
        {v.unavailable}
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted">{v.heading}</h3>
        {watched && (
          <span className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-accent">
            <Check className="h-3.5 w-3.5" />
            {v.watched}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[0.85rem] font-light leading-[1.6] text-ink/85">{v.intro}</p>

      <video
        ref={ref}
        // src on the element, not a <source> child: a child's failure does not
        // bubble, so onError would never fire and a dead URL would strand the
        // guest at a disabled button
        src={src}
        className="mt-4 w-full overflow-hidden rounded-[12px] bg-ink/90"
        controls
        playsInline
        preload="metadata"
        poster={poster || undefined}
        onTimeUpdate={onTimeUpdate}
        onSeeking={onSeeking}
        onEnded={onWatched}
        onError={onFailed}
      />

      <label className={`mt-4 flex items-start gap-3 ${strict && !watched ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--pr-accent)]"
          checked={acked}
          disabled={strict && !watched}
          onChange={(e) => onAcked(e.target.checked)}
        />
        <span className="text-[0.85rem] font-light leading-[1.55] text-ink/85">{v.ack}</span>
      </label>

      {strict && !watched && <p className="mt-2 text-[0.75rem] font-light text-muted">{v.watchFirst}</p>}
    </div>
  );
}
