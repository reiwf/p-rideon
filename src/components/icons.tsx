/* Small inline icon set — wayfinding / travel flavoured, single-stroke. */
import type { SVGProps } from "react";
import type { VehicleClass } from "@/lib/data";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const Arrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 12h15M13 6l6 6-6 6" /></svg>
);
export const Pin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
);
export const Calendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /></svg>
);
export const Clock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const Globe = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17" /></svg>
);
export const Shield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 3.5 5 6v6c0 4 3 6.7 7 8.5 4-1.8 7-4.5 7-8.5V6l-7-2.5Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const Card = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 14h4" /></svg>
);
export const Headset = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 13v-1a7 7 0 0 1 14 0v1" /><rect x="3.5" y="13" width="3.5" height="6" rx="1.4" /><rect x="17" y="13" width="3.5" height="6" rx="1.4" /><path d="M19 19a4 4 0 0 1-4 3h-2" /></svg>
);
export const Cancel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
);
export const Seat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M7 4v8h8M7 12l-1.5 6M15 12l1.5 6M5 12h12" /></svg>
);
export const Bag = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="6" y="8" width="12" height="12" rx="2" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const Gear = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" /></svg>
);
export const Fuel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14M5 20h11M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8l-2.5-2.5" /></svg>
);
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="m5 12 4.5 4.5L19 7" /></svg>
);

/* Side-profile car silhouette, tinted per class. Used as the card "photo". */
export function CarMark({ cls, hue, ...p }: { cls: VehicleClass; hue: string } & SVGProps<SVGSVGElement>) {
  // roofline differs by body style
  const roof: Record<VehicleClass, string> = {
    kei: "M16 30 19 16h12l5 8",
    compact: "M14 30 18 17h16l7 9",
    hybrid: "M13 30 18 18h18l8 8",
    suv: "M13 29 17 15h18l9 10",
    minivan: "M12 29 15 13h22l8 12",
    premium: "M12 29 15 13h23l9 12",
  };
  return (
    <svg viewBox="0 0 64 40" fill="none" {...p}>
      <path
        d={`M6 30h52v-2c0-2-1-3-3-3 ${roof[cls]} H6c-2 0-3 1-3 3v3c0 1 1 2 2 2h1`}
        fill={hue}
        fillOpacity="0.16"
        stroke={hue}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="31" r="4.5" fill="var(--color-surface)" stroke={hue} strokeWidth="1.6" />
      <circle cx="46" cy="31" r="4.5" fill="var(--color-surface)" stroke={hue} strokeWidth="1.6" />
      <circle cx="18" cy="31" r="1.4" fill={hue} />
      <circle cx="46" cy="31" r="1.4" fill={hue} />
    </svg>
  );
}
