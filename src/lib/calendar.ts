/* Geometry and lane maths for the fleet timeline (/admin/calendar).

   Day boundaries are JST throughout: the company operates in Japan, so a
   rental that starts 09:00 belongs to that Japanese day no matter where the
   browser sits. JST has no daylight saving, which makes a day exactly 24h and
   lets every position be plain arithmetic on epoch milliseconds.

   Bars are placed at real hour resolution — a car picked up at noon starts
   half-way across its column — so no half-day fudge factors are needed. */

export const DAY_MS = 86_400_000;
const JST_OFFSET_MS = 9 * 3_600_000;

// --- fixed pixel geometry (one source of truth: grid, bars and hit-testing) ---
export const MONTH_H = 28;
export const DATE_H = 40;
/** height of the two sticky header rows combined */
export const HEADER_H = MONTH_H + DATE_H;
export const GROUP_H = 44;
export const ROW_H = 46;
export const BAR_H = ROW_H - 12;
export const LANE_GAP = 4;
export const MIN_CELL_W = 34;
export const MAX_CELL_W = 74;
export const OVERSCAN_ROWS = 4;

export function sidebarWidth(viewportW: number): number {
  return viewportW < 768 ? 108 : 176;
}

/** Fit `days` columns into the viewport, clamped to a readable range. Unlike
    the code this is modelled on, the real day count is used — a 14-day window
    gets wide columns and a 60-day window gets narrow ones. */
export function cellWidth(viewportW: number, days: number): number {
  const available = viewportW - sidebarWidth(viewportW) - 40; // padding + scrollbar
  const fitted = Math.floor(available / Math.max(1, days));
  return Math.max(MIN_CELL_W, Math.min(MAX_CELL_W, fitted));
}

// --- dates ---

/** Epoch ms at JST midnight opening `dateISO` (YYYY-MM-DD). */
export function jstDayStart(dateISO: string): number {
  return Date.parse(`${dateISO}T00:00:00+09:00`);
}

/** The JST calendar date of an instant, as YYYY-MM-DD. */
export function jstISO(ms: number): string {
  return new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Today in JST. */
export function jstToday(): string {
  return jstISO(Date.now());
}

export function addDays(dateISO: string, n: number): string {
  return jstISO(jstDayStart(dateISO) + n * DAY_MS);
}

export type GridDay = {
  iso: string;
  /** ms at the start of this JST day */
  startMs: number;
  dayOfMonth: number;
  /** 0 = Sunday */
  weekday: number;
  weekend: boolean;
};

export function buildDays(startISO: string, count: number): GridDay[] {
  const t0 = jstDayStart(startISO);
  return Array.from({ length: count }, (_, i) => {
    const startMs = t0 + i * DAY_MS;
    // read the weekday/day-of-month in JST by shifting into UTC
    const shifted = new Date(startMs + JST_OFFSET_MS);
    const weekday = shifted.getUTCDay();
    return {
      iso: jstISO(startMs),
      startMs,
      dayOfMonth: shifted.getUTCDate(),
      weekday,
      weekend: weekday === 0 || weekday === 6,
    };
  });
}

/** Month bands across the window, for the top header row. */
export function monthBands(days: GridDay[]): { label: string; from: number; span: number }[] {
  const bands: { label: string; from: number; span: number }[] = [];
  days.forEach((d, i) => {
    const label = d.iso.slice(0, 7);
    const last = bands[bands.length - 1];
    if (last && last.label === label) last.span += 1;
    else bands.push({ label, from: i, span: 1 });
  });
  return bands;
}

// --- bar placement ---

export type BarBox = {
  left: number;
  width: number;
  /** the rental starts before the window — square that corner off */
  clipLeft: boolean;
  /** …or runs past its end */
  clipRight: boolean;
};

/** Where a rental sits in the grid, or null when it misses the window
    entirely. Positions are fractional days, so hours land exactly. */
export function barBox(
  startMs: number,
  endMs: number,
  gridStartMs: number,
  cellW: number,
  days: number,
): BarBox | null {
  const gridEndMs = gridStartMs + days * DAY_MS;
  if (!(endMs > gridStartMs) || !(startMs < gridEndMs)) return null;

  const total = days * cellW;
  const rawLeft = ((startMs - gridStartMs) / DAY_MS) * cellW;
  const rawRight = ((endMs - gridStartMs) / DAY_MS) * cellW;
  const left = Math.max(0, rawLeft);
  const right = Math.min(total, rawRight);

  return {
    left,
    // a very short rental still needs to be clickable
    width: Math.max(8, right - left),
    clipLeft: rawLeft < left,
    clipRight: rawRight > right,
  };
}

// --- overlap lanes ---

export type LaneItem = { id: string; startMs: number; endMs: number };

export type Lanes = {
  /** item id → lane index (0 = top) */
  lane: Map<string, number>;
  /** ids that genuinely overlap another rental — flagged, never hidden */
  conflict: Set<string>;
  /** lanes needed, at least 1 */
  count: number;
};

/** Greedy interval scheduling: each rental takes the first lane free at its
    pick-up time. Two rentals on one car should be impossible (the database
    rejects them), so any overlap found here is an anomaly worth showing. */
export function assignLanes(items: LaneItem[]): Lanes {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const laneEnd: number[] = [];
  const lane = new Map<string, number>();
  const conflict = new Set<string>();
  const open: LaneItem[] = [];

  for (const item of sorted) {
    // anything still open when this one starts is a real overlap
    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].endMs <= item.startMs) open.splice(i, 1);
    }
    if (open.length > 0) {
      conflict.add(item.id);
      for (const other of open) conflict.add(other.id);
    }
    open.push(item);

    let slot = laneEnd.findIndex((end) => end <= item.startMs);
    if (slot === -1) {
      slot = laneEnd.length;
      laneEnd.push(item.endMs);
    } else {
      laneEnd[slot] = item.endMs;
    }
    lane.set(item.id, slot);
  }

  return { lane, conflict, count: Math.max(1, laneEnd.length) };
}

export function rowHeight(laneCount: number): number {
  return laneCount > 1 ? ROW_H + (laneCount - 1) * (BAR_H + LANE_GAP) : ROW_H;
}

// --- per-day availability for the type header ---

/** How many cars of a type are free on each day of the window. A car counts as
    taken for a day when any rental overlaps that day at all. */
export function freePerDay(
  fleet: { id: string }[],
  rentalsByVehicle: Map<string, LaneItem[]>,
  days: GridDay[],
): number[] {
  return days.map((day) => {
    const dayEnd = day.startMs + DAY_MS;
    let taken = 0;
    for (const car of fleet) {
      const rentals = rentalsByVehicle.get(car.id);
      if (rentals?.some((r) => r.startMs < dayEnd && r.endMs > day.startMs)) taken += 1;
    }
    return fleet.length - taken;
  });
}

export type Run = { from: number; span: number; value: number };

/** Collapse equal neighbouring values into one segment, so a fortnight with
    two cars free draws as a single bar instead of fourteen. */
export function runLength(values: number[]): Run[] {
  const runs: Run[] = [];
  values.forEach((value, i) => {
    const last = runs[runs.length - 1];
    if (last && last.value === value) last.span += 1;
    else runs.push({ from: i, span: 1, value });
  });
  return runs;
}
