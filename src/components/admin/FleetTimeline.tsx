"use client";

/* Fleet timeline — one row per physical car, grouped by vehicle type.

   Layout: ONE scroll container, with the two header rows pinned by
   `position: sticky` top and the plate column pinned left. Nothing mirrors
   scroll offsets, so the headers can never lag behind the cells.

   Rows are windowed by hand against scrollTop. Row heights vary (a car with
   overlapping rentals grows extra lanes), so heights are prefix-summed once
   and the first visible row is found by binary search. Columns are not
   windowed: a window is at most 60 cheap cells wide. */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAdminT } from "@/lib/adminI18n";
import type { AdminVehicle, Booking } from "@/lib/adminStore";
import { groupVehicleTypes, type VehicleTypeGroup } from "@/lib/vehicleTypes";
import { Badge, Button, Modal, yen } from "./ui";
import {
  DAY_MS, MONTH_H, DATE_H, HEADER_H, GROUP_H, BAR_H, LANE_GAP, OVERSCAN_ROWS,
  addDays, assignLanes, barBox, buildDays, cellWidth, freePerDay, jstDayStart, jstISO, jstToday,
  monthBands, rowHeight, runLength, sidebarWidth,
  type BarBox, type GridDay, type LaneItem, type Lanes,
} from "@/lib/calendar";

const WINDOW_CHOICES = [14, 30, 60] as const;

type Rental = LaneItem & { booking: Booking };

type Row =
  | { kind: "type"; key: string; height: number; group: VehicleTypeGroup<AdminVehicle>; free: number[] }
  | { kind: "car"; key: string; height: number; car: AdminVehicle; rentals: Rental[]; lanes: Lanes }
  | { kind: "orphan"; key: string; height: number; rentals: Rental[]; lanes: Lanes };

/** Bar colours per booking status, in the console's palette. */
const TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#d9c79c", fg: "#3a3122" },
  confirmed: { bg: "#8e7845", fg: "#f6f2e8" },
  completed: { bg: "#c7c1b4", fg: "#3a3629" },
  // holding a car while the guest is in Stripe Checkout: hatched-looking pale
  // tone so staff can tell it apart from a reservation that is actually secured
  awaiting_payment: { bg: "#e6ddc6", fg: "#6b5f4e" },
};
const tone = (status: string) => TONES[status] ?? TONES.completed;

/* Wall clock as an external store. Reading Date.now() during render is impure
   and would also make the server and client disagree; this keeps the snapshot
   stable between ticks and lets the "now" marker creep along on its own. */
let clockNow = 0;
const clockSubs = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(onChange: () => void) {
  clockNow = Date.now();
  clockSubs.add(onChange);
  if (clockTimer === null) {
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      for (const fn of clockSubs) fn();
    }, 60_000);
  }
  onChange();
  return () => {
    clockSubs.delete(onChange);
    if (clockSubs.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}
const readClock = () => clockNow;
/** 0 on the server: no "today" tint and no now-line until the client mounts. */
const readClockServer = () => 0;

export function FleetTimeline({ vehicles, bookings }: { vehicles: AdminVehicle[]; bookings: Booking[] }) {
  const { t, lang } = useAdminT();

  const [startISO, setStartISO] = useState(() => addDays(jstToday(), -1));
  const [windowDays, setWindowDays] = useState<number>(30);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Booking | null>(null);

  // --- viewport measurement ---
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 1024, h: 560 });
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const sidebarW = sidebarWidth(box.w);
  const cellW = cellWidth(box.w, windowDays);

  const days = useMemo(() => buildDays(startISO, windowDays), [startISO, windowDays]);
  const gridStartMs = days[0]?.startMs ?? jstDayStart(startISO);
  const gridEndMs = gridStartMs + windowDays * DAY_MS;
  const laneW = windowDays * cellW;
  const totalW = sidebarW + laneW;

  // --- rentals bucketed by car, limited to what the window can show ---
  // A cancelled booking frees the car, exactly as the availability rules and
  // the database's overlap constraint treat it.
  const rentals = useMemo(() => {
    const byCar = new Map<string, Rental[]>();
    const orphans: Rental[] = [];

    for (const b of bookings) {
      if (b.status === "cancelled" || !b.pickupAt || !b.returnAt) continue;
      const startMs = Date.parse(b.pickupAt);
      const endMs = Date.parse(b.returnAt);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
      if (endMs <= gridStartMs || startMs >= gridEndMs) continue;

      const rental: Rental = { id: b.id, startMs, endMs, booking: b };
      if (!b.vehicleId) {
        orphans.push(rental);
        continue;
      }
      const list = byCar.get(b.vehicleId);
      if (list) list.push(rental);
      else byCar.set(b.vehicleId, [rental]);
    }
    return { byCar, orphans };
  }, [bookings, gridStartMs, gridEndMs]);

  const groups = useMemo(() => groupVehicleTypes(vehicles), [vehicles]);

  // --- flatten to the row list the grid renders ---
  const rows = useMemo(() => {
    const out: Row[] = [];

    // rentals whose car was deleted or never assigned: surfaced, never dropped
    if (rentals.orphans.length > 0) {
      const lanes = assignLanes(rentals.orphans);
      out.push({ kind: "orphan", key: "orphan", height: rowHeight(lanes.count), rentals: rentals.orphans, lanes });
    }

    for (const group of groups) {
      out.push({
        kind: "type",
        key: group.key,
        height: GROUP_H,
        group,
        free: freePerDay(group.members, rentals.byCar, days),
      });
      if (collapsed.has(group.key)) continue;

      for (const car of group.members) {
        const list = rentals.byCar.get(car.id) ?? [];
        const lanes = assignLanes(list);
        out.push({ kind: "car", key: car.id, height: rowHeight(lanes.count), car, rentals: list, lanes });
      }
    }
    return out;
  }, [groups, rentals, collapsed, days]);

  /** Running top offset of every row; the last entry is the scroll height. */
  const tops = useMemo(() => {
    const acc = new Array<number>(rows.length + 1);
    acc[0] = 0;
    for (let i = 0; i < rows.length; i++) acc[i + 1] = acc[i] + rows[i].height;
    return acc;
  }, [rows]);
  const canvasH = tops[rows.length] ?? 0;

  // --- vertical windowing ---
  const { first, last } = useMemo(() => {
    if (rows.length === 0) return { first: 0, last: -1 };
    const viewTop = Math.max(0, scrollTop - HEADER_H);
    const viewBottom = viewTop + box.h;

    // last row starting at or before the top of the viewport
    let lo = 0;
    let hi = rows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (tops[mid] <= viewTop) lo = mid;
      else hi = mid - 1;
    }
    let end = lo;
    while (end < rows.length - 1 && tops[end + 1] < viewBottom) end += 1;

    return {
      first: Math.max(0, lo - OVERSCAN_ROWS),
      last: Math.min(rows.length - 1, end + OVERSCAN_ROWS),
    };
  }, [scrollTop, box.h, rows.length, tops]);

  const nowMs = useSyncExternalStore(subscribeClock, readClock, readClockServer);

  const todayISO = nowMs ? jstISO(nowMs) : "";
  const nowX = ((nowMs - gridStartMs) / DAY_MS) * cellW;
  const nowVisible = nowMs > 0 && nowX >= 0 && nowX <= laneW;

  const intl = lang === "ja" ? "ja-JP" : "en-GB";
  const monthFmt = useMemo(
    () => new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "Asia/Tokyo" }),
    [intl],
  );
  const weekdayFmt = useMemo(
    () => new Intl.DateTimeFormat(intl, { weekday: "narrow", timeZone: "Asia/Tokyo" }),
    [intl],
  );

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const cellTone = (day: GridDay) =>
    day.iso === todayISO ? "bg-expressway/10" : day.weekend ? "bg-paper-dim/70" : "bg-white";

  if (vehicles.length === 0 && rentals.orphans.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-mist bg-white px-6 py-16 text-center">
        <h2 className="font-display text-[1.15rem] font-bold text-ink">{t.calendar.empty}</h2>
        <p className="mt-1 max-w-sm text-sm text-stone">{t.calendar.emptyBody}</p>
      </div>
    );
  }

  return (
    <>
      <Toolbar
        startISO={startISO}
        windowDays={windowDays}
        onShift={(n) => setStartISO((s) => addDays(s, n))}
        onJump={(iso) => setStartISO(iso)}
        onToday={() => setStartISO(addDays(jstToday(), -1))}
        onWindow={setWindowDays}
      />

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="relative max-h-[70vh] overflow-auto rounded-xl border border-mist bg-white shadow-[var(--shadow-card)]"
      >
        {/* month band */}
        <div className="sticky top-0 z-30 flex bg-paper-dim" style={{ width: totalW, height: MONTH_H }}>
          <div
            className="sticky left-0 z-[31] shrink-0 border-r border-mist bg-paper-dim"
            style={{ width: sidebarW, minWidth: sidebarW }}
          />
          <div className="relative" style={{ width: laneW }}>
            {monthBands(days).map((band) => (
              <div
                key={band.label}
                className="absolute top-0 flex h-full items-center border-r border-mist px-2 text-[0.7rem] font-semibold text-stone"
                style={{ left: band.from * cellW, width: band.span * cellW }}
              >
                <span className="truncate">{monthFmt.format(new Date(days[band.from].startMs))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* day numbers */}
        <div className="sticky z-30 flex bg-white" style={{ top: MONTH_H, width: totalW, height: DATE_H }}>
          <div
            className="sticky left-0 z-[31] flex shrink-0 items-center border-b border-r border-mist bg-white px-3 text-[0.7rem] font-semibold uppercase tracking-wide text-stone"
            style={{ width: sidebarW, minWidth: sidebarW }}
          >
            {t.vehicles.thPlate}
          </div>
          <div className="flex border-b border-mist" style={{ width: laneW }}>
            {days.map((day) => (
              <div
                key={day.iso}
                className={`flex shrink-0 flex-col items-center justify-center border-r border-mist leading-none ${cellTone(day)}`}
                style={{ width: cellW }}
              >
                <span className={`text-[0.58rem] ${day.weekend ? "text-signal/70" : "text-stone"}`}>
                  {weekdayFmt.format(new Date(day.startMs))}
                </span>
                <span
                  className={`mt-0.5 text-[0.76rem] tabular-nums ${
                    day.iso === todayISO ? "font-bold text-expressway" : "font-medium text-ink"
                  }`}
                >
                  {day.dayOfMonth}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* rows */}
        <div className="relative" style={{ height: canvasH, width: totalW }}>
          {nowVisible && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 z-[5] w-px bg-signal/70"
              style={{ left: sidebarW + nowX, height: canvasH }}
            />
          )}

          {rows.slice(first, last + 1).map((row, i) => {
            const index = first + i;
            const rowStyle = { transform: `translateY(${tops[index]}px)`, height: row.height, width: totalW };

            if (row.kind === "type") {
              const expanded = !collapsed.has(row.key);
              return (
                <div key={row.key} className="absolute left-0 top-0 flex border-b border-mist bg-paper-dim/60" style={rowStyle}>
                  <button
                    type="button"
                    onClick={() => toggle(row.key)}
                    aria-expanded={expanded}
                    className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-mist bg-paper-dim px-2.5 text-left hover:bg-mist/60"
                    style={{ width: sidebarW, minWidth: sidebarW }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3.5 w-3.5 shrink-0 text-stone transition-transform ${expanded ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                    <span className="min-w-0">
                      <span className="block truncate text-[0.78rem] font-semibold text-ink">{row.group.name}</span>
                      <span className="block text-[0.66rem] text-stone">
                        {row.group.transmission} · {row.group.members.length}
                      </span>
                    </span>
                  </button>

                  {/* how many cars of this type are free, day by day */}
                  <div className="relative" style={{ width: laneW }}>
                    {runLength(row.free).map((run) => {
                      const soldOut = run.value <= 0;
                      return (
                        <div
                          key={run.from}
                          title={t.calendar.freeOf
                            .replace("{free}", String(run.value))
                            .replace("{total}", String(row.group.members.length))}
                          className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md text-[0.7rem] font-semibold tabular-nums ${
                            soldOut ? "bg-signal/15 text-signal" : "bg-expressway/12 text-expressway"
                          }`}
                          style={{ left: run.from * cellW + 2, width: run.span * cellW - 4, height: GROUP_H - 14 }}
                        >
                          {run.value}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const label = row.kind === "car"
              ? row.car.plateNumber.trim() || t.calendar.noPlate
              : t.calendar.barUnassigned;
            const plated = row.kind === "car" && Boolean(row.car.plateNumber.trim());

            return (
              <div key={row.key} className="absolute left-0 top-0 flex border-b border-mist" style={rowStyle}>
                <div
                  className={`sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-mist px-3 ${
                    row.kind === "orphan" ? "bg-signal/10" : "bg-white"
                  }`}
                  style={{ width: sidebarW, minWidth: sidebarW }}
                >
                  <span
                    className={`truncate text-[0.78rem] font-semibold ${
                      plated ? "font-mono tracking-wide text-ink" : "italic text-stone"
                    }`}
                  >
                    {label}
                  </span>
                  {row.kind === "car" && <span className="truncate text-[0.66rem] text-stone">{row.car.name}</span>}
                </div>

                <div className="relative flex" style={{ width: laneW }}>
                  {days.map((day) => (
                    <div key={day.iso} className={`shrink-0 border-r border-mist ${cellTone(day)}`} style={{ width: cellW }} />
                  ))}

                  {row.rentals.map((rental) => {
                    const geo = barBox(rental.startMs, rental.endMs, gridStartMs, cellW, windowDays);
                    if (!geo) return null;
                    return (
                      <RentalBar
                        key={rental.id}
                        rental={rental}
                        geo={geo}
                        lane={row.lanes.lane.get(rental.id) ?? 0}
                        clash={row.lanes.conflict.has(rental.id)}
                        onOpen={() => setOpen(rental.booking)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Legend />

      {open && <BookingDetail booking={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// --- pieces ---

function RentalBar({
  rental, geo, lane, clash, onOpen,
}: {
  rental: Rental;
  geo: BarBox;
  lane: number;
  clash: boolean;
  onOpen: () => void;
}) {
  const { t } = useAdminT();
  const b = rental.booking;
  const colour = tone(b.status);
  const radius = 6;

  const when = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
        }).format(new Date(iso))
      : "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      title={[
        `${t.calendar.tipRef}: ${b.reference}`,
        b.customerName,
        `${t.calendar.tipPickup}: ${when(b.pickupAt)}`,
        `${t.calendar.tipReturn}: ${when(b.returnAt)}`,
        clash ? t.calendar.overlapHint : "",
      ].filter(Boolean).join("\n")}
      className="absolute z-[1] flex items-center overflow-hidden px-2 text-left text-[0.7rem] font-medium leading-none shadow-sm transition-[filter] hover:brightness-95"
      style={{
        left: geo.left,
        width: geo.width,
        top: lane * (BAR_H + LANE_GAP) + 6,
        height: BAR_H,
        background: colour.bg,
        color: colour.fg,
        border: clash ? "1.5px dashed var(--color-signal)" : "1px solid rgba(0,0,0,0.10)",
        // square off the edge a rental is cut at, so it reads as "continues"
        borderTopLeftRadius: geo.clipLeft ? 0 : radius,
        borderBottomLeftRadius: geo.clipLeft ? 0 : radius,
        borderTopRightRadius: geo.clipRight ? 0 : radius,
        borderBottomRightRadius: geo.clipRight ? 0 : radius,
      }}
    >
      <span className="truncate">{b.customerName || b.reference}</span>
    </button>
  );
}

function Toolbar({
  startISO, windowDays, onShift, onJump, onToday, onWindow,
}: {
  startISO: string;
  windowDays: number;
  onShift: (n: number) => void;
  onJump: (iso: string) => void;
  onToday: () => void;
  onWindow: (n: number) => void;
}) {
  const { t } = useAdminT();
  const step = "px-2.5 py-1.5";
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Button variant="ghost" className={step} onClick={() => onShift(-windowDays)} aria-label={t.calendar.prev}>‹‹</Button>
      <Button variant="ghost" className={step} onClick={() => onShift(-7)} aria-label={t.calendar.prev}>‹</Button>
      <Button variant="ghost" className={step} onClick={onToday}>{t.calendar.today}</Button>
      <Button variant="ghost" className={step} onClick={() => onShift(7)} aria-label={t.calendar.next}>›</Button>
      <Button variant="ghost" className={step} onClick={() => onShift(windowDays)} aria-label={t.calendar.next}>››</Button>

      <input
        type="date"
        value={startISO}
        onChange={(e) => e.target.value && onJump(e.target.value)}
        aria-label={t.calendar.window}
        className="rounded-lg border border-mist bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-expressway"
      />

      <div className="ml-auto flex items-center rounded-full border border-mist bg-paper p-0.5">
        {WINDOW_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onWindow(n)}
            aria-pressed={windowDays === n}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              windowDays === n ? "bg-ink text-paper" : "text-stone hover:text-ink"
            }`}
          >
            {t.calendar.days.replace("{n}", String(n))}
          </button>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const { t } = useAdminT();
  const items = [
    { key: "awaiting_payment", label: t.bookings.status.awaiting_payment },
    { key: "pending", label: t.bookings.status.pending },
    { key: "confirmed", label: t.bookings.status.confirmed },
    { key: "completed", label: t.bookings.status.completed },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.72rem] text-stone">
      <span className="font-semibold">{t.calendar.legend}:</span>
      {items.map((it) => (
        <span key={it.key} className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: tone(it.key).bg }} />
          {it.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5" title={t.calendar.overlapHint}>
        <span className="h-3 w-5 rounded border border-dashed border-signal" />
        {t.calendar.overlap}
      </span>
    </div>
  );
}

function BookingDetail({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { t } = useAdminT();

  const when = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
        }).format(new Date(iso))
      : "—";

  const line = (label: string, value: string) => (
    <div key={label} className="flex justify-between gap-4 border-b border-mist py-2 last:border-0">
      <span className="shrink-0 text-[0.78rem] text-stone">{label}</span>
      <span className="text-right text-[0.85rem] text-ink">{value}</span>
    </div>
  );

  return (
    <Modal title={booking.reference} onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>{t.common.back}</Button>}>
      <div className="mb-3">
        <Badge tone={booking.status === "cancelled" ? "off" : booking.status === "confirmed" ? "ok" : "star"}>
          {(t.bookings.status as Record<string, string>)[booking.status] ?? booking.status}
        </Badge>
      </div>
      {line(t.bookings.thCustomer, booking.customerName || "—")}
      {line(t.bookings.thVehicle, [booking.vehiclePlate, booking.vehicleName].filter(Boolean).join(" · ") || "—")}
      {line(t.calendar.tipPickup, `${when(booking.pickupAt)}${booking.pickupLocation ? ` — ${booking.pickupLocation}` : ""}`)}
      {line(t.calendar.tipReturn, when(booking.returnAt))}
      {line(t.calendar.tipTotal, yen(booking.estimatedTotal))}
      {booking.customerEmail ? line(t.calendar.tipEmail, booking.customerEmail) : null}
    </Modal>
  );
}
