"use client";

import { useI18n } from "./LanguageProvider";
import { SectionHead } from "./Fleet";

export function Steps() {
  const { t } = useI18n();
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-24">
      <SectionHead eyebrow={t.steps.eyebrow} title={t.steps.title} />

      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
        {t.steps.items.map((s, i) => (
          <li key={i} className="relative">
            {/* diamond marker — echoes the brand emblem; a real sequence, so numbers earn their place */}
            <div className="flex items-center gap-5">
              <span
                className="grid h-11 w-11 shrink-0 rotate-45 place-items-center border border-hairline"
                style={{ outline: "1px solid var(--color-accent)", outlineOffset: -5 }}
              >
                <span className="-rotate-45 font-display text-[1.0625rem] text-ink">{i + 1}</span>
              </span>
              {i < t.steps.items.length - 1 && <span className="hidden h-px flex-1 bg-hairline md:block" />}
            </div>
            <h3 className="mt-6 font-display text-[1.125rem] text-ink">{s.t}</h3>
            <p className="mt-2 max-w-[38ch] text-[0.9rem] font-light leading-[1.6] text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
