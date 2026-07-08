"use client";

import { useI18n } from "./LanguageProvider";
import { Headset, Cancel, Shield, Card } from "./icons";

export function TrustStrip() {
  const { t } = useI18n();
  const items = [
    { icon: <Headset className="h-5 w-5" />, h: t.trust.support, d: t.trust.supportD },
    { icon: <Cancel className="h-5 w-5" />, h: t.trust.cancel, d: t.trust.cancelD },
    { icon: <Shield className="h-5 w-5" />, h: t.trust.insure, d: t.trust.insureD },
    { icon: <Card className="h-5 w-5" />, h: t.trust.etc, d: t.trust.etcD },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 pt-24">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-hairline py-8 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.h} className="flex items-start gap-3">
            <span className="mt-0.5 text-accent">{it.icon}</span>
            <span>
              <span className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ink">{it.h}</span>
              <span className="mt-1 block text-[0.8rem] font-light leading-snug text-muted">{it.d}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
