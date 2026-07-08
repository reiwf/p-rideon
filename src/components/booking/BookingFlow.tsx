"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "../LanguageProvider";
import { intlLocale, type Locale } from "@/lib/i18n";
import { DateTimeField, SelectField } from "../SearchFields";
import { Check, Shield, Pin, Calendar } from "../icons";
import { supabase } from "@/lib/supabaseClient";
import type { Vehicle } from "@/lib/data";
import { tText, tList } from "@/lib/i18nContent";
import { countryOptions } from "@/lib/countries";
import { CompactVehicleCard, VehicleSheet } from "./VehicleSheet";
import {
  daysBetween, quote, combineDateTime, splitDateTime, yen, rentalTimes as times, defaultTripDates, addDaysISO,
  type BookingInsurance, type BookingRatePlan, type BookingExtra, type BookingBranch, type ExtraSelection,
} from "@/lib/booking";
const fmtDate = (dateISO: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${dateISO}T00:00`));
const fmtFull = (dateISO: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", year: "numeric", month: "long", day: "numeric" }).format(new Date(`${dateISO}T00:00`));

const inputBase =
  "w-full rounded-[12px] border bg-surface px-3.5 py-3 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent";

const label11 = "text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted";

export function BookingFlow({
  vehicle, insurances, ratePlans, branches, branchInfo, extras, initial,
}: {
  vehicle: Vehicle;
  insurances: BookingInsurance[];
  ratePlans: BookingRatePlan[];
  branches: string[];
  branchInfo: BookingBranch[];
  extras: BookingExtra[];
  initial: { location: string; from: string; to: string };
}) {
  const { t, locale } = useI18n();
  const [dflt] = useState(defaultTripDates);
  const pu = splitDateTime(initial.from, dflt.pickupDate, "10:00");
  const ret = splitDateTime(initial.to, dflt.returnDate, "10:00");
  // return must land after pick-up, even for URL-supplied values
  if (`${ret.date}T${ret.time}` <= `${pu.date}T${pu.time}`) {
    ret.date = addDaysISO(pu.date, 1);
  }

  const [location, setLocation] = useState(initial.location || branches[0] || "");
  const [pickupDate, setPickupDate] = useState(pu.date);
  const [pickupTime, setPickupTime] = useState(pu.time);
  const [returnDate, setReturnDate] = useState(ret.date);
  const [returnTime, setReturnTime] = useState(ret.time);

  /** Apply a trip-field change, keeping the return strictly after the pick-up. */
  function updateTrip(patch: Partial<{ pickupDate: string; pickupTime: string; returnDate: string; returnTime: string }>) {
    const next = { pickupDate, pickupTime, returnDate, returnTime, ...patch };
    if (next.returnDate < next.pickupDate) next.returnDate = next.pickupDate;
    if (`${next.returnDate}T${next.returnTime}` <= `${next.pickupDate}T${next.pickupTime}`) {
      next.returnDate = addDaysISO(next.pickupDate, 1);
    }
    setPickupDate(next.pickupDate);
    setPickupTime(next.pickupTime);
    setReturnDate(next.returnDate);
    setReturnTime(next.returnTime);
  }

  const defaultIns = insurances.find((i) => i.featured) ?? insurances.find((i) => i.pricePerDay === 0) ?? insurances[0] ?? null;
  const [insuranceId, setInsuranceId] = useState<string | null>(defaultIns?.id ?? null);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});

  const [driver, setDriver] = useState({ name: "", email: "", phone: "", license: "", flight: "", notes: "" });
  const [step, setStep] = useState(0);
  const [showVehicle, setShowVehicle] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  const selectedIns = insurances.find((i) => i.id === insuranceId) ?? null;
  const branch = branchInfo.find((b) => b.name === location) ?? null;
  const extraSel: ExtraSelection[] = useMemo(
    () => extras.filter((x) => (extraQty[x.id] ?? 0) > 0).map((x) => ({ extra: x, qty: extraQty[x.id] })),
    [extras, extraQty],
  );
  const days = daysBetween(`${pickupDate}T${pickupTime}`, `${returnDate}T${returnTime}`);
  const q = useMemo(() => quote(vehicle, days, ratePlans, selectedIns, extraSel), [vehicle, days, ratePlans, selectedIns, extraSel]);

  const countries = useMemo(() => countryOptions(locale), [locale]);
  const licenseName = countries.find(([code]) => code === driver.license)?.[1] ?? driver.license;

  const emailOk = /\S+@\S+\.\S+/.test(driver.email);
  const detailsValid = Boolean(driver.name.trim()) && emailOk && Boolean(driver.phone.trim()) && Boolean(driver.license);

  function setQty(id: string, qty: number, max: number) {
    setExtraQty((s) => ({ ...s, [id]: Math.min(max, Math.max(0, qty)) }));
  }

  function goToStep(s: number) {
    setStep(s);
    window.scrollTo({ top: 0 }); // each step starts from its beginning (html has smooth scroll)
  }
  function next() {
    if (step === 1 && !detailsValid) { setTouched(true); return; }
    goToStep(Math.min(2, step + 1));
  }
  function back() { goToStep(Math.max(0, step - 1)); }

  async function submit() {
    setSubmitting(true);
    setError("");
    const notes = [driver.flight ? `Flight: ${driver.flight}` : "", driver.notes].filter(Boolean).join(" — ");
    const { data, error: err } = await supabase.rpc("car_create_booking", {
      p_vehicle_id: vehicle.id,
      p_insurance_id: selectedIns?.id ?? null,
      p_pickup_location: location,
      p_pickup_at: combineDateTime(pickupDate, pickupTime),
      p_return_at: combineDateTime(returnDate, returnTime),
      p_customer_name: driver.name,
      p_customer_email: driver.email,
      p_customer_phone: driver.phone,
      p_locale: locale,
      p_estimated_total: q.total,
      p_notes: notes,
      p_extras: extraSel.map((s) => ({ id: s.extra.id, name: s.extra.name, qty: s.qty, price_per_day: s.extra.pricePerDay })),
      p_license_country: driver.license,
    });
    setSubmitting(false);
    if (err) { setError(t.booking.errorCreate); return; }
    const rows = data as { reference: string }[] | null;
    setReference(rows?.[0]?.reference ?? "—");
    goToStep(3);
  }

  if (step === 3 && reference) return <SuccessView reference={reference} />;

  const steps = [t.booking.steps.trip, t.booking.steps.details, t.booking.steps.confirm];

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <span className="eyebrow text-accent">{t.booking.heading}</span>
      <h1 className="mt-3 font-display text-[clamp(1.5rem,4vw,2rem)] leading-snug text-ink">{vehicle.name}</h1>

      {/* step markers */}
      <ol className="mt-8 flex items-center gap-3">
        {steps.map((label, i) => (
          <li key={i} className="flex flex-1 items-center gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-display text-[0.85rem] transition-colors ${
                i < step
                  ? "border-accent bg-accent text-accent-ink"
                  : i === step
                    ? "border-accent text-ink"
                    : "border-hairline text-muted"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`hidden text-[0.7rem] font-medium uppercase tracking-[0.16em] sm:block ${i <= step ? "text-ink" : "text-muted"}`}>
              {label}
            </span>
            {i < steps.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-accent" : "bg-hairline"}`} />}
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0">
          {/* on smaller screens the aside sits below the flow, so keep the car
              reviewable at the top of every step */}
          <div className="mb-10 lg:hidden">
            <CompactVehicleCard vehicle={vehicle} onDetails={() => setShowVehicle(true)} />
          </div>

          {step === 0 && (
            <div className="space-y-10">
              <div>
                <h2 className={`mb-3 ${label11}`}>{t.booking.editTrip}</h2>
                <div className="rounded-[18px] border border-hairline bg-surface">
                  <div className="border-b border-hairline">
                    <SelectField icon={<Pin className="h-[18px] w-[18px]" />} label={t.search.location} value={location} onChange={setLocation} options={branches} />
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <DateTimeField
                      icon={<Calendar className="h-[18px] w-[18px]" />}
                      label={t.search.pickup}
                      date={pickupDate}
                      time={pickupTime}
                      onDate={(v) => updateTrip({ pickupDate: v })}
                      onTime={(v) => updateTrip({ pickupTime: v })}
                      locale={locale}
                      options={times}
                      disablePast
                    />
                    <DateTimeField
                      icon={<Calendar className="h-[18px] w-[18px]" />}
                      label={t.search.return}
                      date={returnDate}
                      time={returnTime}
                      onDate={(v) => updateTrip({ returnDate: v })}
                      onTime={(v) => updateTrip({ returnTime: v })}
                      locale={locale}
                      options={times}
                      min={pickupDate}
                      align="right"
                    />
                  </div>

                  {/* full pick-up & drop-off detail — branch, address, full date & time */}
                  <div className="space-y-3.5 border-t border-hairline px-4 py-4">
                    <DetailRow
                      dot="outline"
                      label={t.search.pickup}
                      place={location}
                      address={branch?.address}
                      when={`${fmtFull(pickupDate, locale)} · ${pickupTime}`}
                    />
                    <DetailRow
                      dot="filled"
                      label={t.search.return}
                      place={location}
                      address={branch?.address}
                      when={`${fmtFull(returnDate, locale)} · ${returnTime}`}
                    />
                  </div>

                  {/* chargeable duration — 24h rental days from pick-up time */}
                  <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
                    <span className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-muted">{t.booking.summary.duration}</span>
                    <span className="tnum text-[0.85rem] text-ink">{days} {t.booking.summary.days}</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className={`mb-3 ${label11}`}>{t.booking.protection}</h2>
                <div className="space-y-3">
                  {insurances.map((ins) => {
                    const sel = ins.id === insuranceId;
                    return (
                      <button
                        key={ins.id}
                        type="button"
                        onClick={() => setInsuranceId(ins.id)}
                        className={`flex w-full gap-3.5 rounded-[14px] border bg-surface p-4 text-left transition-colors ${
                          sel ? "border-accent ring-1 ring-accent" : "border-hairline hover:border-muted/40"
                        }`}
                      >
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${sel ? "border-accent bg-accent text-accent-ink" : "border-hairline"}`}>
                          {sel && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="font-display text-[1rem] text-ink">{tText(ins.name, ins.i18n?.name, locale)}</span>
                            <span className="tnum whitespace-nowrap text-sm text-ink">
                              {ins.pricePerDay === 0
                                ? <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-accent">{t.booking.included}</span>
                                : <>+{yen(ins.pricePerDay)} <span className="font-light text-muted">{t.booking.perDay}</span></>}
                            </span>
                          </span>
                          <span className="mt-1 block text-[0.85rem] font-light leading-[1.55] text-muted">{tText(ins.description, ins.i18n?.description, locale)}</span>
                          {ins.features.length > 0 && (
                            <span className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                              {tList(ins.features, ins.i18n?.features, locale).map((f, fi) => (
                                <span key={fi} className="inline-flex items-center gap-1.5 text-[0.78rem] font-light text-ink/85"><Check className="h-3 w-3 text-accent" />{f}</span>
                              ))}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {extras.length > 0 && (
                <div>
                  <h2 className={`mb-3 ${label11}`}>{t.booking.extrasTitle}</h2>
                  <div className="divide-y divide-hairline rounded-[18px] border border-hairline bg-surface">
                    {extras.map((x) => {
                      const qty = extraQty[x.id] ?? 0;
                      return (
                        <div key={x.id} className="flex items-center gap-4 px-4 py-3.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.95rem] text-ink">{tText(x.name, x.i18n?.name, locale)}</p>
                            {x.description && (
                              <p className="mt-0.5 text-[0.78rem] font-light leading-snug text-muted">{tText(x.description, x.i18n?.description, locale)}</p>
                            )}
                            <p className="tnum mt-1 text-[0.8rem] text-ink/85">
                              +{yen(x.pricePerDay)} <span className="font-light text-muted">{t.booking.perDay}</span>
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setQty(x.id, qty - 1, x.maxQty)}
                              disabled={qty === 0}
                              aria-label={`− ${x.name}`}
                              className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              −
                            </button>
                            <span className={`tnum w-4 text-center text-[0.95rem] ${qty > 0 ? "text-ink" : "text-muted"}`}>{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(x.id, qty + 1, x.maxQty)}
                              disabled={qty >= x.maxQty}
                              aria-label={`+ ${x.name}`}
                              className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className={`mb-5 ${label11}`}>{t.booking.form.heading}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t.booking.form.fullName} required invalid={touched && !driver.name.trim()} msg={t.booking.form.required}>
                  <input className={`${inputBase} ${touched && !driver.name.trim() ? "border-signal" : "border-hairline"}`} value={driver.name} onChange={(e) => setDriver({ ...driver, name: e.target.value })} autoComplete="name" />
                </FormField>
                <FormField label={t.booking.form.phone} required invalid={touched && !driver.phone.trim()} msg={t.booking.form.required}>
                  <input className={`${inputBase} ${touched && !driver.phone.trim() ? "border-signal" : "border-hairline"}`} value={driver.phone} onChange={(e) => setDriver({ ...driver, phone: e.target.value })} autoComplete="tel" inputMode="tel" />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label={t.booking.form.email} required invalid={touched && !emailOk} msg={t.booking.form.required}>
                    <input className={`${inputBase} ${touched && !emailOk ? "border-signal" : "border-hairline"}`} type="email" value={driver.email} onChange={(e) => setDriver({ ...driver, email: e.target.value })} autoComplete="email" inputMode="email" />
                  </FormField>
                </div>
                <div className="sm:col-span-2">
                  <FormField label={t.booking.form.license} required invalid={touched && !driver.license} msg={t.booking.form.required}>
                    <select
                      className={`${inputBase} appearance-none ${touched && !driver.license ? "border-signal" : "border-hairline"} ${driver.license ? "" : "text-muted/60"}`}
                      value={driver.license}
                      onChange={(e) => setDriver({ ...driver, license: e.target.value })}
                      autoComplete="country"
                    >
                      <option value="" disabled>{t.booking.form.licensePh}</option>
                      {countries.map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label={t.booking.form.flight} hint={t.booking.form.flightHint}>
                  <input className={`${inputBase} border-hairline`} value={driver.flight} onChange={(e) => setDriver({ ...driver, flight: e.target.value })} placeholder="JL123" />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label={t.booking.form.notes} hint={t.booking.form.notesHint}>
                    <textarea className={`${inputBase} h-24 resize-none border-hairline`} value={driver.notes} onChange={(e) => setDriver({ ...driver, notes: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <RequiredDocs t={t} className="mt-8" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className={label11}>{t.booking.confirm.heading}</h2>
              <ReviewRow label={t.booking.summary.vehicle} value={`${vehicle.name} · ${vehicle.jp}`} />
              <ReviewRow label={t.booking.summary.pickup} value={`${location}${branch?.address ? ` (${branch.address})` : ""} — ${fmtDate(pickupDate, locale)} · ${pickupTime}`} />
              <ReviewRow label={t.booking.summary.dropoff} value={`${location}${branch?.address ? ` (${branch.address})` : ""} — ${fmtDate(returnDate, locale)} · ${returnTime}`} />
              <ReviewRow label={t.booking.protection} value={selectedIns ? tText(selectedIns.name, selectedIns.i18n?.name, locale) : "—"} />
              {extraSel.length > 0 && (
                <ReviewRow
                  label={t.booking.extrasTitle}
                  value={extraSel.map((s) => `${tText(s.extra.name, s.extra.i18n?.name, locale)} ×${s.qty}`).join(", ")}
                />
              )}
              <ReviewRow label={t.booking.form.fullName} value={driver.name} />
              <ReviewRow label={t.booking.form.email} value={driver.email} />
              <ReviewRow label={t.booking.form.phone} value={driver.phone} />
              <ReviewRow label={t.booking.form.license} value={licenseName} />
              {driver.flight && <ReviewRow label={t.booking.form.flight} value={driver.flight} />}
              {driver.notes && <ReviewRow label={t.booking.form.notes} value={driver.notes} />}

              <RequiredDocs t={t} />

              <p className="rounded-[14px] border border-champagne/40 bg-champagne/10 p-4 text-[0.85rem] font-light leading-[1.6] text-ink/85">{t.booking.confirm.note}</p>
              {error && <p className="rounded-[12px] border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-sm text-signal">{error}</p>}
            </div>
          )}

          {/* nav buttons */}
          <div className="mt-10 flex items-center justify-between gap-3">
            {step === 0 ? (
              <Link href="/#fleet" className="text-[0.78rem] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink">
                ← {t.booking.notFound.back}
              </Link>
            ) : (
              <button type="button" onClick={back} className="rounded-full border border-hairline px-6 py-2.5 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-raised">
                {t.booking.back}
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={next}
                className="flex min-h-[48px] items-center justify-center rounded-[14px] bg-accent px-8 text-[0.8rem] font-medium uppercase tracking-[0.2em] text-accent-ink transition-[filter] hover:brightness-[1.08]"
              >
                {t.booking.next}
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-accent px-8 text-[0.8rem] font-medium uppercase tracking-[0.2em] text-accent-ink transition-[filter] hover:brightness-[1.08] disabled:opacity-60"
              >
                {submitting ? t.booking.reserving : t.booking.reserve}
              </button>
            )}
          </div>
        </div>

        {/* vehicle + summary — reviewable on every step */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">
            <CompactVehicleCard vehicle={vehicle} onDetails={() => setShowVehicle(true)} />
          </div>
          <SummaryCard q={q} selectedIns={selectedIns} t={t} locale={locale} />
        </aside>
      </div>

      {showVehicle && <VehicleSheet vehicle={vehicle} onClose={() => setShowVehicle(false)} />}
    </section>
  );
}

function DetailRow({ dot, label, place, address, when }: { dot: "outline" | "filled"; label: string; place: string; address?: string; when: string }) {
  return (
    <div className="flex gap-3">
      <span
        className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dot === "filled" ? "bg-accent" : "border border-accent"}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-muted">{label}</p>
        <p className="mt-0.5 text-[0.925rem] text-ink">{place}</p>
        {address && <p className="text-[0.78rem] font-light text-muted">{address}</p>}
        <p className="tnum mt-0.5 text-[0.78rem] font-light text-muted">{when}</p>
      </div>
    </div>
  );
}

function DocItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[0.85rem] font-light leading-[1.55] text-ink/85">
      <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-accent" />
      <span>{children}</span>
    </li>
  );
}

/** "Required documents at pick-up" — identity, licence, and payment rules. */
function RequiredDocs({ t, className = "" }: { t: ReturnType<typeof useI18n>["t"]; className?: string }) {
  const d = t.booking.docs;
  return (
    <div className={`rounded-[14px] border border-hairline bg-surface p-5 ${className}`}>
      <h3 className="text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted">{d.heading}</h3>
      <ul className="mt-3 space-y-2">
        <DocItem>{d.identity}</DocItem>
        <DocItem>
          {d.licenseTitle}
          <span className="mt-1 block">{d.licenseJp}</span>
          <span className="block text-muted">/</span>
          <span className="block">{d.licenseIntl}</span>
        </DocItem>
        <DocItem>{d.held}</DocItem>
      </ul>
      <h3 className="mt-5 text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted">{d.payTitle}</h3>
      <ul className="mt-3 space-y-2">
        <DocItem>{d.cardName}</DocItem>
        <DocItem>{d.cardChip}</DocItem>
        <DocItem>{d.unionPay}</DocItem>
        <DocItem>{d.cash}</DocItem>
      </ul>
    </div>
  );
}

function SummaryCard({
  q, selectedIns, t, locale,
}: {
  q: ReturnType<typeof quote>;
  selectedIns: BookingInsurance | null;
  t: ReturnType<typeof useI18n>["t"];
  locale: Locale;
}) {
  return (
    <div className="rounded-[18px] border border-hairline p-5">
      <h2 className="text-[0.66rem] font-medium uppercase tracking-[0.24em] text-muted">
        {t.booking.summary.heading} — {q.days} {t.booking.summary.days}
      </h2>
      <div className="mt-4 space-y-1">
        <Row label={`${t.booking.summary.base} · ${q.days} ${t.booking.summary.days}`} value={yen(q.base)} />
        {q.discount > 0 && <Row label={`${t.booking.summary.discount}${q.plan ? ` (${tText(q.plan.name, q.plan.i18n?.name, locale)})` : ""}`} value={`− ${yen(q.discount)}`} accent />}
        {selectedIns && selectedIns.pricePerDay > 0 && <Row label={`${t.booking.summary.protection} · ${tText(selectedIns.name, selectedIns.i18n?.name, locale)}`} value={yen(q.insurance)} />}
        {q.extras.map((x) => (
          <Row key={x.extra.id} label={`${tText(x.extra.name, x.extra.i18n?.name, locale)}${x.qty > 1 ? ` ×${x.qty}` : ""}`} value={yen(x.cost)} />
        ))}
      </div>
      <div className="my-4 h-px bg-hairline" />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.66rem] font-medium uppercase tracking-[0.24em] text-muted">{t.booking.summary.total}</span>
        <span className="tnum font-display text-[1.625rem] leading-none text-ink">{yen(q.total)}</span>
      </div>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-accent">
        <Shield className="h-3.5 w-3.5" />{t.booking.summary.payAtPickup}
      </p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="font-light text-muted">{label}</span>
      <span className={`tnum whitespace-nowrap ${accent ? "text-accent" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function FormField({
  label, hint, required, invalid, msg, children,
}: {
  label: string; hint?: string; required?: boolean; invalid?: boolean; msg?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted">
        {label}{required && <span className="text-signal"> *</span>}
      </span>
      {children}
      {invalid && msg ? <span className="mt-1 block text-[0.72rem] text-signal">{msg}</span> : hint ? <span className="mt-1 block text-[0.72rem] font-light text-muted">{hint}</span> : null}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline pb-3 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-44 shrink-0 text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted">{label}</span>
      <span className="text-[0.925rem] text-ink">{value}</span>
    </div>
  );
}

function SuccessView({ reference }: { reference: string }) {
  const { t } = useI18n();
  return (
    <section className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 py-16 text-center">
      <div>
        {/* diamond mark moment — the emblem confirms the reservation */}
        <span className="mx-auto grid h-14 w-14 rotate-45 place-items-center bg-accent" style={{ outline: "1px solid var(--color-accent)", outlineOffset: 4 }}>
          <Check className="h-7 w-7 -rotate-45 text-accent-ink" />
        </span>
        <h1 className="mt-9 font-display text-[clamp(1.6rem,5vw,2.125rem)] leading-snug text-ink">{t.booking.success.heading}</h1>
        <p className="mt-2 font-light text-muted">{t.booking.success.thanks}</p>

        <div className="mt-7 inline-block rounded-[18px] border border-hairline bg-surface px-10 py-5">
          <p className="text-[0.62rem] font-medium uppercase tracking-[0.24em] text-muted">{t.booking.success.refLabel}</p>
          <p className="tnum mt-1.5 font-display text-[1.5rem] tracking-[0.08em] text-accent">{reference}</p>
        </div>

        <div className="mx-auto mt-7 max-w-sm space-y-2.5 text-left text-[0.875rem] font-light text-ink/85">
          <p className="flex items-start gap-2.5"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t.booking.success.payInfo}</p>
          <p className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t.booking.success.bring}</p>
        </div>

        <Link
          href="/"
          className="mt-10 inline-flex min-h-[48px] items-center rounded-[14px] bg-accent px-8 text-[0.8rem] font-medium uppercase tracking-[0.2em] text-accent-ink transition-[filter] hover:brightness-[1.08]"
        >
          {t.booking.success.home}
        </Link>
      </div>
    </section>
  );
}
