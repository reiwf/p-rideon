/* Mock fleet / plan / destination data.
   In a later phase this is replaced by data the company enters in the
   admin console and stores in Supabase. Prices are JPY per day. */

import type { ContentI18n } from "./i18nContent";

export type VehicleClass =
  | "kei"
  | "compact"
  | "hybrid"
  | "suv"
  | "minivan"
  | "premium";

export type Vehicle = {
  id: string;
  cls: VehicleClass;
  name: string;
  jp: string;
  seats: number;
  bags: number;
  transmission: "AT" | "MT";
  fuel: string;
pricePerDay: number;
  /** extension rate per started hour beyond full 24h days (0/absent = charge a full day) */
  extensionPerHour?: number;
  tags: string[];
  /** accent hue used for the card silhouette */
  hue: string;
  /** ja/zh/ko translations for tags & fuel (English lives in the base fields) */
  i18n?: ContentI18n;
  /** ordered public image URLs (first = primary card photo); silhouette if empty */
  images?: string[];
};

export const vehicles: Vehicle[] = [
  {
    id: "kei-wagonr",
    cls: "kei",
    name: "Suzuki Wagon R",
    jp: "スズキ ワゴンR",
    seats: 4,
    bags: 2,
    transmission: "AT",
    fuel: "Petrol",
    pricePerDay: 5500,
    tags: ["Cheapest", "Easy parking", "ETC card"],
    hue: "#d8492f",
  },
  {
    id: "compact-yaris",
    cls: "compact",
    name: "Toyota Yaris",
    jp: "トヨタ ヤリス",
    seats: 5,
    bags: 2,
    transmission: "AT",
    fuel: "Petrol",
    pricePerDay: 7800,
    tags: ["Popular", "City + day trips"],
    hue: "#8e7845",
  },
  {
    id: "hybrid-prius",
    cls: "hybrid",
    name: "Toyota Prius",
    jp: "トヨタ プリウス",
    seats: 5,
    bags: 3,
    transmission: "AT",
    fuel: "Hybrid",
    pricePerDay: 9800,
    tags: ["Best on fuel", "Long routes"],
    hue: "#b29a63",
  },
  {
    id: "suv-corollacross",
    cls: "suv",
    name: "Toyota Corolla Cross",
    jp: "トヨタ カローラ クロス",
    seats: 5,
    bags: 4,
    transmission: "AT",
    fuel: "Hybrid",
    pricePerDay: 12800,
    tags: ["Koyasan & coast", "Higher view"],
    hue: "#6b5f4e",
  },
  {
    id: "minivan-noah",
    cls: "minivan",
    name: "Toyota Noah",
    jp: "トヨタ ノア",
    seats: 7,
    bags: 5,
    transmission: "AT",
    fuel: "Hybrid",
    pricePerDay: 15800,
    tags: ["Families", "8 seats option"],
    hue: "#8e7845",
  },
  {
    id: "premium-alphard",
    cls: "premium",
    name: "Toyota Alphard",
    jp: "トヨタ アルファード",
    seats: 7,
    bags: 6,
    transmission: "AT",
    fuel: "Hybrid",
    pricePerDay: 24800,
    tags: ["Premium", "Airport luxury"],
    hue: "#c79a3e",
  },
];

export type Destination = {
  id: string;
  name: string;
  jp: string;
  km: number;
  mins: number;
  blurb: string;
};

export const destinations: Destination[] = [
  { id: "kyoto", name: "Kyoto", jp: "京都", km: 55, mins: 60, blurb: "Temples, geisha districts, bamboo groves" },
  { id: "nara", name: "Nara", jp: "奈良", km: 35, mins: 45, blurb: "Great Buddha and the famous bowing deer" },
  { id: "kobe", name: "Kobe", jp: "神戸", km: 30, mins: 40, blurb: "Harbor city, beef, and Mt. Rokko views" },
  { id: "himeji", name: "Himeji Castle", jp: "姫路城", km: 90, mins: 80, blurb: "Japan's finest original feudal castle" },
  { id: "koyasan", name: "Mt. Koya", jp: "高野山", km: 90, mins: 120, blurb: "Mountain temple town and forest cemetery" },
  { id: "wakayama", name: "Wakayama Coast", jp: "和歌山", km: 70, mins: 75, blurb: "Hot springs, marina, and coastal drives" },
];

export const pickupPoints = [
  "Kansai Int'l Airport (KIX)",
  "Osaka — Namba",
  "Osaka — Umeda / Shin-Osaka",
  "Osaka Itami Airport (ITM)",
  "Kyoto Station",
];

export function formatYen(n: number): string {
  return "¥" + n.toLocaleString("en-US");
}
