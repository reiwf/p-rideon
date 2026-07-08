"use client";

/* Admin console i18n — English + Japanese (staff are based in Japan). */

import { createContext, useContext, useState, useSyncExternalStore } from "react";

export type AdminLang = "en" | "ja";
export const adminLangs: { code: AdminLang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
];

export type AdminDict = {
  nav: { dashboard: string; vehicles: string; ratePlans: string; insurance: string; branches: string; extras: string; bookings: string };
  common: {
    cancel: string; delete: string; edit: string; back: string; signOut: string; viewSite: string; loading: string;
    active: string; off: string; shown: string; hidden: string; published: string; status: string; perDay: string; untitled: string;
  };
  login: { title: string; subtitle: string; email: string; password: string; signIn: string; signingIn: string; staffOnly: string; notConfigured: string; notAuthorized: string; enterBoth: string };
  dbError: string;
  dashboard: {
    title: string; sub: string;
    vehicles: string; ratePlans: string; insurance: string; lowestRate: string;
    published: string; activeDiscounts: string; offered: string; fromFleet: string;
    publishedFleet: string; manage: string; noVehicles: string;
    gettingStarted: string; step1: string; step2: string; step3: string; savedNote: string;
  };
  vehicles: {
    title: string; sub: string; add: string;
    thVehicle: string; thClass: string; thSeats: string; thRate: string; empty: string;
    formAdd: string; formEdit: string; modelName: string; modelPh: string; jpName: string; jpPh: string;
    cls: string; transmission: string; auto: string; manual: string; seats: string; bags: string; fuel: string;
    dailyRate: string; dailyRateHint: string; tags: string; tagsHint: string; publishedLabel: string;
    saveAdd: string; saveEdit: string; deleteTitle: string; deleteBody: string;
    gallery: string; galleryHint: string; addImages: string; uploading: string; primary: string; makePrimary: string;
    translateAll: string; translatingAll: string; translateDone: string; translateNone: string;
  };
  plans: {
    title: string; sub: string; add: string; forDays: string; empty: string;
    formAdd: string; formEdit: string; name: string; namePh: string; description: string; descPh: string;
    minDays: string; discount: string; activeLabel: string; saveAdd: string; saveEdit: string; deleteTitle: string; deleteBody: string;
  };
  insurance: {
    title: string; sub: string; add: string; on: string; featured: string; included: string;
    formAdd: string; formEdit: string; name: string; namePh: string; description: string; descPh: string;
    price: string; priceHint: string; covered: string; coveredHint: string; offerLabel: string; featuredLabel: string;
    saveAdd: string; saveEdit: string; deleteTitle: string; deleteBody: string;
  };
  branches: {
    title: string; sub: string; add: string; thBranch: string; thAddress: string; empty: string;
    formAdd: string; formEdit: string; name: string; nameHint: string; namePh: string; address: string; addressHint: string; addressPh: string;
    sort: string; sortHint: string; shownLabel: string; saveAdd: string; saveEdit: string; deleteTitle: string; deleteBody: string;
  };
  extras: {
    title: string; sub: string; add: string; each: string; maxQty: string; empty: string;
    formAdd: string; formEdit: string; name: string; namePh: string; description: string; descPh: string;
    price: string; priceHint: string; qty: string; qtyHint: string; sort: string; sortHint: string; activeLabel: string;
    saveAdd: string; saveEdit: string; deleteTitle: string; deleteBody: string;
  };
  bookings: {
    title: string; sub: string; empty: string; emptyBody: string;
    thRef: string; thCustomer: string; thVehicle: string; thPickup: string; thTotal: string; license: string; extras: string;
    status: { pending: string; confirmed: string; cancelled: string; completed: string };
  };
tr: {
    heading: string; hint: string; auto: string; translating: string; failed: string; notConfigured: string; listMismatch: string;
  };
};

export const adminDict: Record<AdminLang, AdminDict> = {
  en: {
    nav: { dashboard: "Dashboard", vehicles: "Vehicles", ratePlans: "Rate plans", insurance: "Insurance", branches: "Branches", extras: "Extras", bookings: "Bookings" },
    common: { cancel: "Cancel", delete: "Delete", edit: "Edit", back: "Back", signOut: "Sign out", viewSite: "View booking site", loading: "Loading…", active: "Active", off: "Off", shown: "Shown", hidden: "Hidden", published: "Published", status: "Status", perDay: "/ day", untitled: "Untitled" },
    login: { title: "Admin console", subtitle: "Sign in to manage vehicles, rates and insurance.", email: "Email", password: "Password", signIn: "Sign in", signingIn: "Signing in…", staffOnly: "Staff accounts only. Contact your administrator for access.", notConfigured: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server.", notAuthorized: "This account is not authorized for the admin console.", enterBoth: "Enter your email and password." },
    dbError: "Couldn't reach the database:",
    dashboard: {
      title: "Dashboard", sub: "Overview of what tourists can book right now.",
      vehicles: "Vehicles", ratePlans: "Rate plans", insurance: "Insurance options", lowestRate: "Lowest daily rate",
      published: "published", activeDiscounts: "active discounts", offered: "offered at checkout", fromFleet: "from published fleet",
      publishedFleet: "Published fleet", manage: "Manage →", noVehicles: "No vehicles published yet.",
      gettingStarted: "Getting started", step1: "Add or edit your vehicles and daily rates.", step2: "Set rate plans (e.g. weekly discounts).", step3: "Configure insurance options shown at checkout.",
      savedNote: "Changes save to the live database and appear on the booking site immediately.",
    },
    vehicles: {
      title: "Vehicles", sub: "The fleet tourists can choose from. Hidden cars don't appear on the booking site.", add: "+ Add vehicle",
      thVehicle: "Vehicle", thClass: "Class", thSeats: "Seats", thRate: "Rate / day", empty: "No vehicles yet. Add your first car to start.",
      formAdd: "Add vehicle", formEdit: "Edit vehicle", modelName: "Model name", modelPh: "Toyota Yaris", jpName: "Japanese name", jpPh: "トヨタ ヤリス",
      cls: "Class", transmission: "Transmission", auto: "Automatic (AT)", manual: "Manual (MT)", seats: "Seats", bags: "Bags", fuel: "Fuel",
      dailyRate: "Daily rate (JPY)", dailyRateHint: "Base price per day before any rate-plan discount.", tags: "Tags", tagsHint: "Comma-separated highlights shown on the card (e.g. Popular, ETC card).", publishedLabel: "Published — show on the booking site",
      saveAdd: "Add vehicle", saveEdit: "Save changes", deleteTitle: "Delete vehicle", deleteBody: "Remove this vehicle from the fleet? This can't be undone.",
      gallery: "Gallery", galleryHint: "Upload photos shown on the booking site. The first image is the card photo.", addImages: "+ Add images", uploading: "Uploading…", primary: "Primary", makePrimary: "Make primary",
      translateAll: "Auto-translate all", translatingAll: "Translating… {done}/{total}", translateDone: "Translated {n} vehicle(s).", translateNone: "All vehicles already translated.",
    },
    plans: {
      title: "Rate plans", sub: "Length-of-rental discounts applied automatically when a booking qualifies.", add: "+ Add rate plan", forDays: "for {n}+ days", empty: "No rate plans yet.",
      formAdd: "Add rate plan", formEdit: "Edit rate plan", name: "Plan name", namePh: "Weekly Saver", description: "Description", descPh: "Discount for rentals of 7 days or more.",
      minDays: "Minimum days", discount: "Discount %", activeLabel: "Active", saveAdd: "Add plan", saveEdit: "Save changes", deleteTitle: "Delete rate plan", deleteBody: "Delete this plan?",
    },
    insurance: {
      title: "Insurance", sub: "Protection options offered to the customer at checkout.", add: "+ Add option", on: "On", featured: "Featured", included: "Included",
      formAdd: "Add insurance option", formEdit: "Edit insurance option", name: "Option name", namePh: "Safety Plus", description: "Description", descPh: "Lower your out-of-pocket risk.",
      price: "Price per day (JPY)", priceHint: "Set 0 to mark this option as included for free.", covered: "What's covered", coveredHint: "One item per line.", offerLabel: "Offer this option at checkout", featuredLabel: "Highlight as “most chosen”",
      saveAdd: "Add option", saveEdit: "Save changes", deleteTitle: "Delete insurance option", deleteBody: "Delete this option?",
    },
    branches: {
      title: "Branches", sub: "Pick-up & return locations shown to customers in the booking search.", add: "+ Add branch",
      thBranch: "Branch", thAddress: "Address", empty: "No branches yet. Add your first pick-up location.",
      formAdd: "Add branch", formEdit: "Edit branch", name: "Branch name", nameHint: "Shown in the booking search (e.g. Kansai Int'l Airport (KIX)).", namePh: "Osaka — Namba",
      address: "Address", addressHint: "Optional — for reference and future maps.", addressPh: "Chuo-ku, Osaka",
      sort: "Sort order", sortHint: "Lower numbers appear first in the list.", shownLabel: "Shown to customers",
      saveAdd: "Add branch", saveEdit: "Save changes", deleteTitle: "Delete branch", deleteBody: "Delete this branch? Existing bookings keep their saved location.",
    },
    extras: {
      title: "Extras", sub: "Optional add-ons customers can book with the car (child seats etc.).", add: "+ Add extra", each: "/ day each", maxQty: "max {n}", empty: "No extras yet. Add your first option.",
      formAdd: "Add extra", formEdit: "Edit extra", name: "Name", namePh: "Child seat", description: "Description", descPh: "Forward-facing seat for children aged 1-4.",
      price: "Price per day (JPY)", priceHint: "Charged per unit per rental day.", qty: "Max quantity", qtyHint: "How many a customer can add to one booking.", sort: "Sort order", sortHint: "Lower numbers appear first.", activeLabel: "Offer this extra at checkout",
      saveAdd: "Add extra", saveEdit: "Save changes", deleteTitle: "Delete extra", deleteBody: "Delete this extra? Existing bookings keep their saved lines.",
    },
    bookings: {
      title: "Bookings", sub: "Reserve-now requests from customers (pay at pickup). Newest first.", empty: "No bookings yet", emptyBody: "When a tourist completes a reservation on the booking site, it appears here for your staff to confirm.",
      thRef: "Reference", thCustomer: "Customer", thVehicle: "Vehicle", thPickup: "Pick-up", thTotal: "Est. total", license: "Licence", extras: "Extras",
      status: { pending: "pending", confirmed: "confirmed", cancelled: "cancelled", completed: "completed" },
    },
    tr: {
      heading: "Translations", hint: "Shown on the customer site. Leave a language blank to fall back to English.",
      auto: "Auto-translate", translating: "Translating…", failed: "Translation failed.", notConfigured: "Auto-translate needs a DeepL API key (DEEPL_API_KEY).",
      listMismatch: "Needs the same number of lines as the English list ({n}) or the customer site falls back to English.",
    },
  },

  ja: {
    nav: { dashboard: "ダッシュボード", vehicles: "車両", ratePlans: "料金プラン", insurance: "保険", branches: "店舗", extras: "オプション", bookings: "予約" },
    common: { cancel: "キャンセル", delete: "削除", edit: "編集", back: "戻る", signOut: "ログアウト", viewSite: "予約サイトを見る", loading: "読み込み中…", active: "有効", off: "無効", shown: "表示中", hidden: "非表示", published: "公開中", status: "状態", perDay: "/ 日", untitled: "無題" },
    login: { title: "管理コンソール", subtitle: "車両・料金・保険を管理するにはログインしてください。", email: "メールアドレス", password: "パスワード", signIn: "ログイン", signingIn: "ログイン中…", staffOnly: "スタッフ専用です。アクセスは管理者にお問い合わせください。", notConfigured: "Supabaseが未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を追加し、開発サーバーを再起動してください。", notAuthorized: "このアカウントは管理コンソールへのアクセス権がありません。", enterBoth: "メールアドレスとパスワードを入力してください。" },
    dbError: "データベースに接続できませんでした：",
    dashboard: {
      title: "ダッシュボード", sub: "現在お客様が予約できる内容の概要です。",
      vehicles: "車両", ratePlans: "料金プラン", insurance: "保険オプション", lowestRate: "最安の日額",
      published: "公開中", activeDiscounts: "有効な割引", offered: "予約時に表示", fromFleet: "公開中の車両より",
      publishedFleet: "公開中の車両", manage: "管理 →", noVehicles: "公開中の車両はまだありません。",
      gettingStarted: "はじめに", step1: "車両と日額料金を追加・編集します。", step2: "料金プラン（例：週単位の割引）を設定します。", step3: "予約時に表示する保険オプションを設定します。",
      savedNote: "変更はそのままデータベースに保存され、予約サイトに即時反映されます。",
    },
    vehicles: {
      title: "車両", sub: "お客様が選べる車両です。非表示の車は予約サイトに表示されません。", add: "＋ 車両を追加",
      thVehicle: "車両", thClass: "クラス", thSeats: "乗車", thRate: "日額", empty: "車両がまだありません。最初の車を追加しましょう。",
      formAdd: "車両を追加", formEdit: "車両を編集", modelName: "車種名", modelPh: "トヨタ ヤリス", jpName: "日本語名", jpPh: "トヨタ ヤリス",
      cls: "クラス", transmission: "ミッション", auto: "オートマ（AT）", manual: "マニュアル（MT）", seats: "乗車人数", bags: "荷物", fuel: "燃料",
      dailyRate: "日額（円）", dailyRateHint: "料金プランの割引前の1日あたりの基本料金。", tags: "タグ", tagsHint: "カードに表示する特徴（カンマ区切り。例：人気、ETCカード）。", publishedLabel: "公開 — 予約サイトに表示する",
      saveAdd: "車両を追加", saveEdit: "変更を保存", deleteTitle: "車両を削除", deleteBody: "この車両を車両一覧から削除しますか？元に戻せません。",
      gallery: "ギャラリー", galleryHint: "予約サイトに表示する写真をアップロード。最初の画像がカード写真になります。", addImages: "＋ 画像を追加", uploading: "アップロード中…", primary: "メイン", makePrimary: "メインにする",
      translateAll: "すべて自動翻訳", translatingAll: "翻訳中… {done}/{total}", translateDone: "{n}台の車両を翻訳しました。", translateNone: "すべての車両は翻訳済みです。",
    },
    plans: {
      title: "料金プラン", sub: "条件を満たす予約に自動で適用される、レンタル日数に応じた割引です。", add: "＋ 料金プランを追加", forDays: "{n}日以上で", empty: "料金プランがまだありません。",
      formAdd: "料金プランを追加", formEdit: "料金プランを編集", name: "プラン名", namePh: "ウィークリー割", description: "説明", descPh: "7日以上のレンタルで割引。",
      minDays: "最低日数", discount: "割引率 %", activeLabel: "有効", saveAdd: "プランを追加", saveEdit: "変更を保存", deleteTitle: "料金プランを削除", deleteBody: "このプランを削除しますか？",
    },
    insurance: {
      title: "保険", sub: "予約時にお客様へ提示する補償オプションです。", add: "＋ オプションを追加", on: "有効", featured: "おすすめ", included: "標準装備",
      formAdd: "保険オプションを追加", formEdit: "保険オプションを編集", name: "オプション名", namePh: "セーフティ・プラス", description: "説明", descPh: "自己負担のリスクを軽減。",
      price: "日額（円）", priceHint: "0 にすると無料の標準装備として表示されます。", covered: "補償内容", coveredHint: "1行に1項目。", offerLabel: "予約時にこのオプションを提示する", featuredLabel: "「人気」として強調する",
      saveAdd: "オプションを追加", saveEdit: "変更を保存", deleteTitle: "保険オプションを削除", deleteBody: "このオプションを削除しますか？",
    },
    branches: {
      title: "店舗", sub: "予約検索でお客様に表示される出発・返却場所です。", add: "＋ 店舗を追加",
      thBranch: "店舗", thAddress: "住所", empty: "店舗がまだありません。最初の出発場所を追加しましょう。",
      formAdd: "店舗を追加", formEdit: "店舗を編集", name: "店舗名", nameHint: "予約検索に表示されます（例：関西国際空港（KIX））。", namePh: "大阪 — なんば",
      address: "住所", addressHint: "任意 — 参考用・今後の地図表示用。", addressPh: "大阪市中央区",
      sort: "並び順", sortHint: "小さい数字ほど先に表示されます。", shownLabel: "お客様に表示する",
      saveAdd: "店舗を追加", saveEdit: "変更を保存", deleteTitle: "店舗を削除", deleteBody: "この店舗を削除しますか？既存の予約に保存された場所はそのまま残ります。",
    },
    extras: {
      title: "オプション", sub: "車と一緒に予約できる追加オプション（チャイルドシートなど）。", add: "＋ オプションを追加", each: "/ 日・1点", maxQty: "最大 {n}", empty: "オプションはまだありません。最初のオプションを追加しましょう。",
      formAdd: "オプションを追加", formEdit: "オプションを編集", name: "名称", namePh: "チャイルドシート", description: "説明", descPh: "1〜4歳のお子さま向けの前向きシート。",
      price: "1日あたりの料金（円）", priceHint: "1点につきレンタル1日ごとに加算されます。", qty: "最大数量", qtyHint: "1件の予約で追加できる数。", sort: "並び順", sortHint: "小さい数字ほど先に表示されます。", activeLabel: "予約時にこのオプションを提示する",
      saveAdd: "オプションを追加", saveEdit: "変更を保存", deleteTitle: "オプションを削除", deleteBody: "このオプションを削除しますか？既存の予約の内容はそのまま残ります。",
    },
    bookings: {
      title: "予約", sub: "お客様からの「今すぐ予約」（現地払い）。新しい順。", empty: "予約はまだありません", emptyBody: "お客様が予約サイトで予約を完了すると、ここに表示されスタッフが確認できます。",
      thRef: "予約番号", thCustomer: "お客様", thVehicle: "車両", thPickup: "出発", thTotal: "概算合計", license: "免許", extras: "オプション",
      status: { pending: "保留中", confirmed: "確定", cancelled: "キャンセル", completed: "完了" },
    },
    tr: {
      heading: "翻訳", hint: "お客様向けサイトに表示されます。空欄の言語は英語が使われます。",
      auto: "自動翻訳", translating: "翻訳中…", failed: "翻訳に失敗しました。", notConfigured: "自動翻訳には DeepL の API キー（DEEPL_API_KEY）が必要です。",
      listMismatch: "英語の項目数（{n}）と同じ行数が必要です。異なる場合、お客様向けサイトでは英語が表示されます。",
    },
  },
};

type Ctx = { lang: AdminLang; setLang: (l: AdminLang) => void; t: AdminDict };
const AdminI18nCtx = createContext<Ctx | null>(null);

const emptySubscribe = () => () => {};

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  // saved preference, read hydration-safely (en during SSR, real value after);
  // an explicit toggle this session wins and is persisted in setLang
  const saved = useSyncExternalStore(
    emptySubscribe,
    () => {
      const v = window.localStorage.getItem("kd-admin-lang");
      return v && v in adminDict ? (v as AdminLang) : null;
    },
    () => null,
  );
  const [override, setOverride] = useState<AdminLang | null>(null);
  const lang = override ?? saved ?? "en";

  const setLang = (l: AdminLang) => {
    setOverride(l);
    window.localStorage.setItem("kd-admin-lang", l);
  };

  return <AdminI18nCtx.Provider value={{ lang, setLang, t: adminDict[lang] }}>{children}</AdminI18nCtx.Provider>;
}

export function useAdminT(): Ctx {
  const c = useContext(AdminI18nCtx);
  if (!c) throw new Error("useAdminT must be used within AdminI18nProvider");
  return c;
}
