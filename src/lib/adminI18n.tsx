"use client";

/* Admin console i18n — English + Japanese (staff are based in Japan). */

import { createContext, useContext, useState, useSyncExternalStore } from "react";

export type AdminLang = "en" | "ja";
export const adminLangs: { code: AdminLang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
];

export type AdminDict = {
  nav: { dashboard: string; vehicles: string; ratePlans: string; insurance: string; branches: string; extras: string; bookings: string; faq: string; settings: string; staff: string };
  common: {
    cancel: string; delete: string; edit: string; back: string; signOut: string; viewSite: string; loading: string;
    active: string; off: string; shown: string; hidden: string; published: string; status: string; perDay: string; untitled: string;
    conflict: string;
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
    dailyRate: string; dailyRateHint: string; extHour: string; extHourHint: string; tags: string; tagsHint: string; publishedLabel: string;
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
    notifyTitle: string; notifyHint: string; notifyPh: string; notifySave: string; notifySaved: string;
    video: {
      title: string; hint: string; fallbackNote: string;
      upload: string; replace: string; uploading: string; missing: string; remove: string; preview: string;
      urlPh: string; save: string; saved: string; tooBig: string; notConfigured: string;
      strictTitle: string; strictOn: string; strictOff: string;
      acked: string; notAcked: string; ackedFull: string;
    };
    status: { pending: string; confirmed: string; cancelled: string; completed: string };
  };
  email: {
    title: string; hint: string; save: string; saved: string;
    subject: string; subjectHint: string; subjectPh: string;
    intro: string; introHint: string; introPh: string;
    notice: string; noticeHint: string; noticePh: string;
    closing: string; closingHint: string; closingPh: string;
    varsTitle: string; varsHint: string;
    videoTitle: string; videoHint: string; videoLabel: string; videoLabelHint: string; videoLabelPh: string; videosHint: string;
    testTitle: string; testHint: string; testSend: string; testSent: string;
  };
  staff: {
    title: string; sub: string; add: string; addHint: string; create: string; empty: string;
    thName: string; thEmail: string; thSince: string; you: string; password: string; passwordHint: string;
    revoke: string; revokeTitle: string; revokeBody: string; revoked: string; created: string; promoted: string;
    notConfigured: string; badEmail: string; weakPassword: string; selfRemove: string; lastStaff: string;
  };
  settings: {
    title: string; sub: string; save: string; saved: string;
    hoursTitle: string; hoursHint: string; openTime: string; closeTime: string;
    step: string; stepHint: string; stepMinutes: string; preview: string; hoursInvalid: string;
    contactTitle: string; contactHint: string;
    phone: string; phoneHint: string; email: string; emailHint: string;
    address: string; addressHint: string; addressPh: string;
  };
  faq: {
    title: string; sub: string; add: string; empty: string;
    topic: string; topicHint: string; topicPh: string;
    question: string; questionPh: string; answer: string; answerPh: string;
    keywords: string; keywordsHint: string; keywordsPh: string;
    sort: string; sortHint: string; activeLabel: string;
    formAdd: string; formEdit: string; saveAdd: string; saveEdit: string;
    deleteTitle: string; deleteBody: string;
    logTitle: string; logHint: string; logShow: string; logHide: string; logEmpty: string;
    thWhen: string; thQuery: string; thLang: string; thOutcome: string;
    outcome: { answer: string; choose: string; topics: string; handoff: string };
  };
tr: {
    heading: string; hint: string; auto: string; translating: string; failed: string; notConfigured: string; listMismatch: string;
    source: string; sourceHint: string; sourceEmpty: string;
  };
};

export const adminDict: Record<AdminLang, AdminDict> = {
  en: {
    nav: { dashboard: "Dashboard", vehicles: "Vehicles", ratePlans: "Rate plans", insurance: "Insurance", branches: "Branches", extras: "Extras", bookings: "Bookings", faq: "FAQ", settings: "Settings", staff: "Admin users" },
    common: { cancel: "Cancel", delete: "Delete", edit: "Edit", back: "Back", signOut: "Sign out", viewSite: "View booking site", loading: "Loading…", active: "Active", off: "Off", shown: "Shown", hidden: "Hidden", published: "Published", status: "Status", perDay: "/ day", untitled: "Untitled", conflict: "Someone else changed this while your page was open — reload before saving, or you will overwrite their change." },
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
      dailyRate: "Daily rate (JPY)", dailyRateHint: "Base price per day before any rate-plan discount.", extHour: "Hourly extension (JPY)", extHourHint: "Per started hour beyond full 24h days, capped at the daily rate. 0 = charge a full extra day.", tags: "Tags", tagsHint: "Comma-separated highlights shown on the card (e.g. Popular, ETC card).", publishedLabel: "Published — show on the booking site",
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
      notifyTitle: "New-booking notifications", notifyHint: "These addresses receive an email whenever a customer completes a booking. Separate multiple addresses with commas.", notifyPh: "staff@p-rideon.com, manager@p-rideon.com", notifySave: "Save", notifySaved: "Saved.",
      video: {
        title: "Safety video", hint: "Customers must watch this to the end and tick an acknowledgement before they can confirm a booking. Upload one MP4 per language — the subtitles are part of the picture. Max 100 MB each. Leave every language empty to switch the requirement off.",
        fallbackNote: "Each customer sees the file for their own language; English is used for any language with no file of its own.",
        upload: "Upload", replace: "Replace", uploading: "Uploading…", missing: "No file", remove: "Remove", preview: "Preview",
        urlPh: "…or paste a video URL",
        save: "Save", saved: "Saved.", tooBig: "File is too large (max 100 MB).",
        notConfigured: "Video storage is not configured yet — see DEPLOY.md (Cloudflare R2). You can still paste a URL.",
        strictTitle: "Require the video to be played to the end",
        strictOn: "On — the acknowledgement can only be ticked once the video finishes, and skipping ahead is blocked.",
        strictOff: "Off — the customer must still tick the acknowledgement, but can confirm without finishing the video.",
        acked: "Safety video acknowledged", notAcked: "Safety video not acknowledged", ackedFull: "Safety video watched in full",
      },
      status: { pending: "pending", confirmed: "confirmed", cancelled: "cancelled", completed: "completed" },
    },
    email: {
      title: "Confirmation email", hint: "The email a customer receives when they book. Leave a field empty to keep the built-in wording. The layout and the booking details table are fixed.",
      save: "Save email", saved: "Saved. The next booking uses this wording.",
      subject: "Subject", subjectHint: "Shown in the inbox.", subjectPh: "Booking confirmed {{reference}} — P-rideon",
      intro: "Opening line", introHint: "The sentence under the greeting.", introPh: "Your reservation is confirmed. You pay at the counter when you collect the car.",
      notice: "Additional information", noticeHint: "Optional block at the end — opening hours, directions, anything operational. Basic HTML like <b> and <br> works.", noticePh: "Call us on +81 6-0000-0000 if you are delayed.",
      closing: "Closing line", closingHint: "The footer line above the address.", closingPh: "Questions? Just reply to this email.",
      varsTitle: "Variables", varsHint: "Type these into any field above and they are replaced with the booking's own details.",
      videoTitle: "Include a video link", videoHint: "Adds a button to the email. This is the email's own video — separate from the safety video shown during booking.",
      videoLabel: "Video button text", videoLabelHint: "", videoLabelPh: "Watch the video",
      videosHint: "One file per language; the customer sees theirs, falling back to English. Leave a language empty to use the English one.",
      testTitle: "Send a test", testHint: "Saves first, then sends a sample booking to this address using the wording above. Subject is prefixed [TEST].",
      testSend: "Send test email", testSent: "Test sent to {email}.",
    },
    staff: {
      title: "Admin users", sub: "Who can sign in to this console. Anyone listed here has full access.",
      add: "Add admin user", create: "Create account", empty: "No admin users yet.",
      addHint: "Creates the login straight away — no invite email. Give the person their password directly, and ask them to change it later from the Supabase account settings.",
      thName: "Name", thEmail: "Email", thSince: "Added", you: "(you)",
      password: "Temporary password", passwordHint: "At least 8 characters. Shown in plain text so you can copy it.",
      revoke: "Revoke access", revokeTitle: "Revoke admin access?",
      revokeBody: "{email} will no longer be able to sign in to this console. Their account itself is kept.",
      revoked: "Access revoked.", created: "Account created.", promoted: "That email already had an account — admin access granted to it.",
      notConfigured: "Account creation is not configured yet — SUPABASE_SERVICE_ROLE_KEY is missing. See DEPLOY.md.",
      badEmail: "Enter a valid email address.", weakPassword: "The password must be at least 8 characters.",
      selfRemove: "You can't revoke your own access.", lastStaff: "This is the last admin user — add another before removing this one.",
    },
    settings: {
      title: "Settings", sub: "Opening hours and the contact details shown in the site footer.",
      save: "Save settings", saved: "Saved. The site updates immediately.",
      hoursTitle: "Opening hours",
      hoursHint: "The times customers can choose for pick-up and return, on the homepage search and in the booking flow. Both ends are selectable.",
      openTime: "Opens", closeTime: "Closes",
      step: "Interval", stepHint: "Gap between selectable times.", stepMinutes: "{n} minutes",
      preview: "Customers will see {n} times, {first} through {last}.",
      hoursInvalid: "The closing time must be later than the opening time.",
      contactTitle: "Contact details", contactHint: "Shown in the site footer and offered by the help desk when it has no answer.",
      phone: "Phone", phoneHint: "Shown as a tap-to-call link.", email: "Email", emailHint: "Optional — hidden when empty.",
      address: "Address", addressHint: "Leave empty to keep the built-in address.", addressPh: "Chuo-ku, Osaka, Japan",
    },
    faq: {
      title: "FAQ", sub: "Answers the help-desk chat gives customers. Add match terms so a question is found however it's phrased.",
      add: "Add question", empty: "No questions yet. Add the ones customers ask most.",
      topic: "Topic", topicHint: "Groups the question. Customers see topics as buttons when nothing matches.", topicPh: "Insurance",
      question: "Question", questionPh: "What does the insurance cover?",
      answer: "Answer", answerPh: "CDW is included on every rental. Zero-excess cover is available as an upgrade.",
      keywords: "Match terms", keywordsHint: "Comma-separated, any language. These match hardest — add the words customers actually type, including 日本語/中文/한국어.",
      keywordsPh: "insurance, cdw, excess, 保険, 保险, 보험",
      sort: "Order", sortHint: "Lower numbers appear first.", activeLabel: "Shown to customers",
      formAdd: "New question", formEdit: "Edit question", saveAdd: "Add", saveEdit: "Save",
      deleteTitle: "Delete this question?", deleteBody: "It will stop being offered in the help desk. This can't be undone.",
      logTitle: "What customers asked", logHint: "Last {n} questions, {u} of which got no answer. Unanswered ones are the gaps worth writing entries for.",
      logShow: "Show", logHide: "Hide", logEmpty: "Nobody has asked anything yet.",
      thWhen: "When", thQuery: "Question", thLang: "Lang", thOutcome: "Result",
      outcome: { answer: "answered", choose: "offered choices", topics: "no answer", handoff: "no answer" },
    },
    tr: {
      heading: "Translations", hint: "Shown on the customer site. A language left blank falls back to the text you typed above.",
      auto: "Auto-translate", translating: "Translating…", failed: "Translation failed.", notConfigured: "Auto-translate needs a DeepL API key (DEEPL_API_KEY).",
      listMismatch: "Needs the same number of lines as the list above ({n}) or the customer site falls back to what you typed there.",
      source: "Written in",
      sourceHint: "The fields above are in {lang}. Every other language below is translated from them.",
      sourceEmpty: "Fill in the fields above first, then auto-translate.",
    },
  },

  ja: {
    nav: { dashboard: "ダッシュボード", vehicles: "車両", ratePlans: "料金プラン", insurance: "保険", branches: "店舗", extras: "オプション", bookings: "予約", faq: "よくある質問", settings: "設定", staff: "管理ユーザー" },
    common: { cancel: "キャンセル", delete: "削除", edit: "編集", back: "戻る", signOut: "ログアウト", viewSite: "予約サイトを見る", loading: "読み込み中…", active: "有効", off: "無効", shown: "表示中", hidden: "非表示", published: "公開中", status: "状態", perDay: "/ 日", untitled: "無題", conflict: "このページを開いている間に別の場所で変更されました。上書きしてしまうため、保存前に再読み込みしてください。" },
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
      dailyRate: "日額（円）", dailyRateHint: "料金プランの割引前の1日あたりの基本料金。", extHour: "延長料金（1時間・円）", extHourHint: "24時間単位を超えた延長1時間ごとの料金（1日料金が上限）。0の場合は1日分を請求します。", tags: "タグ", tagsHint: "カードに表示する特徴（カンマ区切り。例：人気、ETCカード）。", publishedLabel: "公開 — 予約サイトに表示する",
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
      notifyTitle: "新規予約の通知", notifyHint: "お客様が予約を完了すると、これらのアドレスに通知メールが届きます。複数の場合はカンマ区切りで入力してください。", notifyPh: "staff@p-rideon.com, manager@p-rideon.com", notifySave: "保存", notifySaved: "保存しました。",
      video: {
        title: "安全動画", hint: "お客様はこの動画を最後まで視聴し、確認にチェックを入れないと予約を確定できません。字幕は映像に焼き込まれているため、言語ごとにMP4を1本ずつアップロードしてください。1本あたり最大100MB。すべて未設定にすると必須ではなくなります。",
        fallbackNote: "お客様にはご自身の言語のファイルが表示されます。ファイルのない言語には英語版が使われます。",
        upload: "アップロード", replace: "差し替え", uploading: "アップロード中…", missing: "未登録", remove: "削除", preview: "プレビュー",
        urlPh: "…または動画URLを貼り付け",
        save: "保存", saved: "保存しました。", tooBig: "ファイルが大きすぎます（最大100MB）。",
        notConfigured: "動画ストレージが未設定です — DEPLOY.md（Cloudflare R2）をご確認ください。URLの貼り付けは可能です。",
        strictTitle: "動画を最後まで再生することを必須にする",
        strictOn: "オン — 動画の再生が終わるまで確認のチェックを入れられず、スキップもできません。",
        strictOff: "オフ — 確認のチェックは必要ですが、最後まで再生しなくても確定できます。",
        acked: "安全動画の確認済み", notAcked: "安全動画は未確認", ackedFull: "安全動画を最後まで視聴済み",
      },
      status: { pending: "保留中", confirmed: "確定", cancelled: "キャンセル", completed: "完了" },
    },
    email: {
      title: "予約確定メール", hint: "お客様がご予約時に受け取るメールです。空欄にすると既定の文面が使われます。レイアウトと予約内容の表は固定です。",
      save: "メールを保存", saved: "保存しました。次回のご予約からこの文面が使われます。",
      subject: "件名", subjectHint: "受信トレイに表示されます。", subjectPh: "ご予約確定 {{reference}} — P-rideon",
      intro: "冒頭の一文", introHint: "宛名の下に表示される文章です。", introPh: "ご予約が確定しました。お支払いはお受け取り時にカウンターでお願いします。",
      notice: "追加のご案内", noticeHint: "任意。末尾に表示されます。営業時間や道順など運用上のご案内にどうぞ。<b> や <br> などの簡単なHTMLが使えます。", noticePh: "ご到着が遅れる場合は +81 6-0000-0000 までお電話ください。",
      closing: "結びの一文", closingHint: "住所の上に表示されるフッターの一行です。", closingPh: "ご不明な点はこのメールにご返信ください。",
      varsTitle: "差し込み変数", varsHint: "上の各欄に入力すると、その予約の内容に置き換わります。",
      videoTitle: "動画リンクを載せる", videoHint: "メールにボタンを追加します。予約時に表示する安全動画とは別の、このメール専用の動画です。",
      videoLabel: "ボタンの文言", videoLabelHint: "", videoLabelPh: "動画を見る",
      videosHint: "言語ごとに1本ずつ。お客様にはご自身の言語の動画が表示されます（未登録の言語は英語）。",
      testTitle: "テスト送信", testHint: "保存したうえで、上の文面でサンプル予約のメールをこのアドレスに送ります。件名の先頭に [TEST] が付きます。",
      testSend: "テストメールを送信", testSent: "{email} にテスト送信しました。",
    },
    staff: {
      title: "管理ユーザー", sub: "この管理コンソールにログインできるユーザーです。ここに表示されている全員がすべての操作を行えます。",
      add: "管理ユーザーを追加", create: "アカウントを作成", empty: "管理ユーザーがまだいません。",
      addHint: "招待メールは送らず、その場でログインを作成します。パスワードは直接お伝えのうえ、後日ご本人に変更していただいてください。",
      thName: "氏名", thEmail: "メールアドレス", thSince: "追加日", you: "（あなた）",
      password: "仮パスワード", passwordHint: "8文字以上。コピーできるようそのまま表示されます。",
      revoke: "権限を削除", revokeTitle: "管理権限を削除しますか？",
      revokeBody: "{email} はこの管理コンソールにログインできなくなります。アカウント自体は残ります。",
      revoked: "権限を削除しました。", created: "アカウントを作成しました。", promoted: "このメールアドレスのアカウントは既に存在したため、管理権限を付与しました。",
      notConfigured: "アカウント作成が未設定です — SUPABASE_SERVICE_ROLE_KEY がありません。DEPLOY.md をご確認ください。",
      badEmail: "正しいメールアドレスを入力してください。", weakPassword: "パスワードは8文字以上にしてください。",
      selfRemove: "ご自身の権限は削除できません。", lastStaff: "最後の管理ユーザーです。削除する前に別のユーザーを追加してください。",
    },
    settings: {
      title: "設定", sub: "営業時間と、サイトのフッターに表示する連絡先です。",
      save: "設定を保存", saved: "保存しました。サイトに即時反映されます。",
      hoursTitle: "営業時間",
      hoursHint: "お客様が出発・返却に選べる時間です。トップページの検索と予約画面の両方に反映されます。開始・終了の時刻も選択できます。",
      openTime: "開店", closeTime: "閉店",
      step: "間隔", stepHint: "選択できる時刻の間隔です。", stepMinutes: "{n}分",
      preview: "お客様には{first}〜{last}の{n}件が表示されます。",
      hoursInvalid: "閉店時刻は開店時刻より後にしてください。",
      contactTitle: "連絡先", contactHint: "サイトのフッターに表示され、ヘルプデスクが回答できないときにもご案内します。",
      phone: "電話番号", phoneHint: "タップで発信できるリンクになります。", email: "メールアドレス", emailHint: "任意 — 空欄の場合は表示されません。",
      address: "住所", addressHint: "空欄の場合は既定の住所が表示されます。", addressPh: "大阪市中央区",
    },
    faq: {
      title: "よくある質問", sub: "ヘルプデスクがお客様に返す回答です。表現が違っても見つかるよう、検索語を登録してください。",
      add: "質問を追加", empty: "質問がまだありません。よく聞かれるものから追加してください。",
      topic: "トピック", topicHint: "質問の分類です。該当が見つからないとき、お客様にはトピックがボタンで表示されます。", topicPh: "保険",
      question: "質問", questionPh: "保険はどこまで補償されますか？",
      answer: "回答", answerPh: "全レンタルにCDWが含まれます。免責ゼロプランへのアップグレードもご利用いただけます。",
      keywords: "検索語", keywordsHint: "カンマ区切り・言語は問いません。最も強く一致します。お客様が実際に入力する語（English/中文/한국어を含む）を登録してください。",
      keywordsPh: "保険, 免責, cdw, insurance, 保险, 보험",
      sort: "並び順", sortHint: "小さい数字が先に表示されます。", activeLabel: "お客様に表示する",
      formAdd: "質問を新規作成", formEdit: "質問を編集", saveAdd: "追加", saveEdit: "保存",
      deleteTitle: "この質問を削除しますか？", deleteBody: "ヘルプデスクで案内されなくなります。この操作は取り消せません。",
      logTitle: "お客様からの質問", logHint: "直近{n}件のうち{u}件が未回答です。未回答の質問は、新しく登録すべき内容です。",
      logShow: "表示", logHide: "隠す", logEmpty: "まだ質問はありません。",
      thWhen: "日時", thQuery: "質問", thLang: "言語", thOutcome: "結果",
      outcome: { answer: "回答済み", choose: "候補を提示", topics: "回答なし", handoff: "回答なし" },
    },
    tr: {
      heading: "翻訳", hint: "お客様向けサイトに表示されます。空欄の言語は上の入力欄の文言が使われます。",
      auto: "自動翻訳", translating: "翻訳中…", failed: "翻訳に失敗しました。", notConfigured: "自動翻訳には DeepL の API キー（DEEPL_API_KEY）が必要です。",
      listMismatch: "上の項目数（{n}）と同じ行数が必要です。異なる場合、お客様向けサイトでは上の入力欄の文言が表示されます。",
      source: "入力言語",
      sourceHint: "上の入力欄は{lang}です。下の各言語はそこから翻訳されます。",
      sourceEmpty: "先に上の入力欄に入力してから翻訳してください。",
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
