/* Lightweight i18n for the customer booking site.
   Four locales for global tourists in Osaka. Vehicle proper names stay
   in their original form; UI chrome + section copy are translated. */

export type Locale = "en" | "ja" | "zh" | "ko";

/** Narrow an arbitrary string (e.g. a cookie value) to a supported Locale. */
export function asLocale(x: string | undefined | null): Locale {
  return x === "ja" || x === "zh" || x === "ko" ? x : "en";
}

/** BCP-47 tags for Intl formatting, per UI locale. */
export const intlLocale: Record<Locale, string> = { en: "en", ja: "ja", zh: "zh-CN", ko: "ko" };

export const locales: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English" },
  { code: "ja", label: "日本語", native: "日本語" },
  { code: "zh", label: "中文", native: "中文" },
  { code: "ko", label: "한국어", native: "한국어" },
];

export type Dict = {
  brand: string;
  brandSub: string;
  nav: { fleet: string; plans: string; how: string; destinations: string; support: string; reserve: string };
  hero: {
    eyebrow: string;
    title1: string;
    title2: string;
    subtitle: string;
  };
  search: {
    pickup: string;
    return: string;
    location: string;
    pickDate: string;
    pickTime: string;
    returnDate: string;
    returnTime: string;
    find: string;
    note: string;
  };
  trust: { support: string; supportD: string; cancel: string; cancelD: string; insure: string; insureD: string; etc: string; etcD: string };
  fleet: { eyebrow: string; title: string; sub: string; from: string; perDay: string; seats: string; bags: string; transmission: string; fuelLabel: string; reserve: string; all: string; filterAll: string };
  classes: Record<string, string>;
  steps: { eyebrow: string; title: string; items: { t: string; d: string }[] };
  dest: { eyebrow: string; title: string; sub: string; fromOsaka: string; drive: string };
  footer: { tagline: string; hours: string; addr: string; rights: string; contact: string };
  booking: {
    heading: string;
    steps: { trip: string; details: string; confirm: string };
    back: string; next: string; reserve: string; reserving: string;
    editTrip: string; protection: string; extrasTitle: string; included: string; perDay: string; vehicleInfo: string; viewVehicle: string;
    summary: { heading: string; vehicle: string; pickup: string; dropoff: string; duration: string; days: string; hours: string; extension: string; base: string; discount: string; protection: string; total: string; payAtPickup: string };
    form: { heading: string; fullName: string; email: string; phone: string; license: string; licensePh: string; flight: string; flightHint: string; notes: string; notesHint: string; required: string; optional: string };
confirm: { heading: string; note: string };
    noc: { title: string; body: string };
    docs: {
      heading: string; identity: string; licenseTitle: string; licenseJp: string; licenseIntl: string; held: string;
      payTitle: string; cardName: string; cardChip: string; unionPay: string; cash: string;
    };
    success: { heading: string; refLabel: string; thanks: string; payInfo: string; bring: string; home: string };
    notFound: { heading: string; body: string; back: string };
    errorCreate: string;
  };
};

export const dict: Record<Locale, Dict> = {
  en: {
    brand: "P-rideon",
    brandSub: "Car Rental · Osaka",
    nav: { fleet: "Fleet", plans: "Insurance", how: "How it works", destinations: "Destinations", support: "Support", reserve: "Reserve" },
    hero: {
      eyebrow: "Car rental · Osaka",
      title1: "Rent a car in Osaka,",
      title2: "explore Kansai at your pace.",
      subtitle: "Pick up at one of our Osaka branches and drive to Kyoto, Nara, Kobe and beyond. English support, full insurance, and no payment until pickup.",
    },
    search: {
      pickup: "Pick-up",
      return: "Return",
      location: "Choose a branch",
      pickDate: "Pick-up date",
      pickTime: "Time",
      returnDate: "Return date",
      returnTime: "Time",
      find: "Find cars",
      note: "Free cancellation up to 48h before pick-up.",
    },
    trust: {
      support: "English support", supportD: "Staff and paperwork in your language",
      cancel: "Free cancellation", cancelD: "Up to 48 hours before pick-up",
      insure: "Full insurance", insureD: "CDW included, zero-excess available",
      etc: "ETC toll card", etcD: "Tap through every expressway gate",
    },
    fleet: { eyebrow: "The fleet", title: "Pick the car for your route", sub: "Every car is automatic, non-smoking, and fitted with English navigation and an ETC toll card.", from: "from", perDay: "/ day", seats: "seats", bags: "bags", transmission: "Transmission", fuelLabel: "Fuel", reserve: "Reserve", all: "View full fleet", filterAll: "All" },
    classes: { kei: "Kei — micro", compact: "Compact", hybrid: "Hybrid", suv: "SUV", minivan: "Minivan", premium: "Premium" },
    steps: {
      eyebrow: "How it works",
      title: "Three steps to the open road",
      items: [
        { t: "Book online", d: "Choose your car and protection, reserve in minutes. No card needed today." },
        { t: "Pick up at the branch", d: "We drive your car to the branch. Bring a valid driving license and payment to collect the keys. ETC card available for a fee." },
        { t: "Drive & explore", d: "English navigation ready. Return the car to the branch at the end of your trip." },
      ],
    },
    dest: { eyebrow: "Where to", title: "Day trips from Osaka", sub: "Kansai is small and stunning — most of the region is an easy drive away.", fromOsaka: "from Osaka", drive: "drive" },
    footer: { tagline: "Car rental for travelers exploring Osaka and the Kansai region.", hours: "Open daily 7:00–22:00", addr: "Chuo-ku, Osaka, Japan", rights: "All rights reserved.", contact: "Contact" },
    booking: {
      heading: "Reserve your car",
      steps: { trip: "Trip & protection", details: "Your details", confirm: "Confirm" },
      back: "Back", next: "Continue", reserve: "Confirm reservation", reserving: "Reserving…",
      editTrip: "Pick-up & return", protection: "Choose your protection", extrasTitle: "Options & extras", included: "Included", perDay: "/ day", vehicleInfo: "Vehicle details", viewVehicle: "Details",
      summary: { heading: "Summary", vehicle: "Vehicle", pickup: "Pick-up", dropoff: "Return", duration: "Duration", days: "days", hours: "h", extension: "Extension", base: "Base rate", discount: "Plan discount", protection: "Protection", total: "Estimated total", payAtPickup: "Pay at pick-up" },
      form: { heading: "Driver details", fullName: "Full name", email: "Email", phone: "Phone", license: "Driver's licence issuing country/region", licensePh: "Select country/region", flight: "Flight no.", flightHint: "Optional — helps us if your flight is delayed", notes: "Notes", notesHint: "Optional — child seat, special requests…", required: "Please fill in this field.", optional: "optional" },
      confirm: { heading: "Review & confirm", note: "No payment now — you pay at the counter on pick-up. Bring your passport and a valid driving licence (with an International Driving Permit if required)." },
      noc: {
        title: "NOC (non-operation charge)",
        body: "If the car needs repair or cleaning after an accident, theft or damage, a non-operation charge applies in addition to any deductible: ¥50,000 if the car can be driven back to the branch, ¥100,000 if it cannot. The CDW does not cover the NOC.",
      },
      docs: {
        heading: "Required documents at pick-up",
        identity: "A valid passport or national ID.",
        licenseTitle: "Driver's licence — one of the following:",
        licenseJp: "Japanese driving licence",
        licenseIntl: "Original driving licence + International Driving Permit (1949 Geneva Convention)",
        held: "All drivers must have held their licence for at least 12 months.",
        payTitle: "Payment at the counter",
        cardName: "The credit card must be in the name of the main driver.",
        cardChip: "Credit cards must have a chip, and the card number should be embossed.",
        unionPay: "UnionPay dual-logo credit cards (UnionPay + another card network) are accepted; UnionPay magnetic-stripe cards are also accepted.",
        cash: "If you can't provide a credit card, this branch also accepts cash in currencies such as JPY.",
      },
      success: { heading: "Reservation confirmed", refLabel: "Booking reference", thanks: "Thank you! Your car is reserved.", payInfo: "Pay at the counter when you collect the car.", bring: "Bring your passport and driving licence (plus IDP if required).", home: "Back to home" },
      notFound: { heading: "Car not found", body: "We couldn't find that vehicle. It may no longer be available.", back: "Back to all cars" },
      errorCreate: "Something went wrong creating your reservation. Please try again.",
    },
  },

  ja: {
    brand: "P-rideon",
    brandSub: "レンタカー · 大阪",
    nav: { fleet: "車種", plans: "保険", how: "ご利用の流れ", destinations: "行き先", support: "サポート", reserve: "予約する" },
    hero: {
      eyebrow: "レンタカー · 大阪",
      title1: "大阪から、",
      title2: "関西を自由にドライブ。",
      subtitle: "大阪市内の店舗で受け取り、京都・奈良・神戸へ。保険完備、お支払いは受け取り時に。",
    },
    search: {
      pickup: "出発",
      return: "返却",
      location: "店舗を選ぶ",
      pickDate: "出発日",
      pickTime: "時間",
      returnDate: "返却日",
      returnTime: "時間",
      find: "車を探す",
      note: "出発の48時間前まで無料キャンセル。",
    },
    trust: {
      support: "英語対応", supportD: "スタッフも書類もあなたの言語で",
      cancel: "無料キャンセル", cancelD: "出発の48時間前まで",
      insure: "保険完備", insureD: "CDW標準、免責ゼロも選べる",
      etc: "ETCカード", etcD: "高速ゲートをそのまま通過",
    },
    fleet: { eyebrow: "車種一覧", title: "あなたのルートに合う一台を", sub: "全車AT・禁煙、英語ナビとETCカードを搭載。", from: "", perDay: "/ 日", seats: "人乗り", bags: "荷物", transmission: "ミッション", fuelLabel: "燃料", reserve: "予約", all: "すべての車種を見る", filterAll: "すべて" },
    classes: { kei: "軽自動車", compact: "コンパクト", hybrid: "ハイブリッド", suv: "SUV", minivan: "ミニバン", premium: "プレミアム" },
    steps: {
      eyebrow: "ご利用の流れ",
      title: "出発までの3ステップ",
      items: [
        { t: "オンライン予約", d: "車と補償を選んで数分で予約。当日までカード不要。" },
        { t: "店舗で受け取り", d: "スタッフがお車を店舗までお届けします。有効な運転免許証とお支払いをご用意のうえ鍵をお受け取りください。ETCカードは有料です。" },
        { t: "ドライブへ", d: "英語ナビを準備済み。ご返却は旅の終わりに店舗まで。" },
      ],
    },
    dest: { eyebrow: "行き先", title: "大阪から日帰りで", sub: "関西はコンパクトで美しい。多くの名所が気軽なドライブ圏内。", fromOsaka: "大阪から", drive: "" },
    footer: { tagline: "大阪・関西を旅する方のためのレンタカー。", hours: "毎日 7:00–22:00 営業", addr: "大阪市中央区", rights: "All rights reserved.", contact: "お問い合わせ" },
    booking: {
      heading: "予約する",
      steps: { trip: "プランと補償", details: "お客様情報", confirm: "確認" },
      back: "戻る", next: "次へ", reserve: "予約を確定", reserving: "予約中…",
      editTrip: "出発・返却", protection: "補償を選ぶ", extrasTitle: "オプション", included: "標準装備", perDay: "/ 日", vehicleInfo: "車両の詳細", viewVehicle: "詳細",
      summary: { heading: "ご予約内容", vehicle: "車種", pickup: "出発", dropoff: "返却", duration: "期間", days: "日間", hours: "時間", extension: "延長", base: "基本料金", discount: "割引", protection: "補償", total: "合計（目安）", payAtPickup: "現地払い" },
      form: { heading: "運転者情報", fullName: "氏名", email: "メール", phone: "電話番号", license: "運転免許証の発行国・地域", licensePh: "国・地域を選択", flight: "便名", flightHint: "任意 — 遅延時に対応しやすくなります", notes: "備考", notesHint: "任意 — チャイルドシート、ご要望など", required: "この項目を入力してください。", optional: "任意" },
      confirm: { heading: "内容の確認", note: "今のお支払いはありません。お受け取り時にカウンターでお支払いください。パスポートと有効な運転免許証（必要に応じて国際運転免許証）をお持ちください。" },
      noc: {
        title: "NOC（ノンオペレーションチャージ）",
        body: "事故・盗難・汚損等により車両の修理・清掃が必要となった場合、免責額とは別にNOCをご負担いただきます。自走して返却できる場合は50,000円、自走できない場合は100,000円です。免責補償（CDW）ではNOCは補償されません。",
      },
      docs: {
        heading: "お受け取り時に必要な書類",
        identity: "有効なパスポートまたは身分証明書。",
        licenseTitle: "運転免許証 — 次のいずれか：",
        licenseJp: "日本の運転免許証",
        licenseIntl: "自国の運転免許証（原本）＋国際運転免許証（1949年ジュネーブ条約）",
        held: "すべての運転者は免許取得後12か月以上であることが必要です。",
        payTitle: "カウンターでのお支払い",
        cardName: "クレジットカードは主運転者名義のものに限ります。",
        cardChip: "クレジットカードはICチップ付きで、カード番号がエンボス加工されている必要があります。",
        unionPay: "銀聯（UnionPay）と他ブランドのデュアルロゴのクレジットカードが利用できます。銀聯の磁気ストライプカードも利用可能です。",
        cash: "クレジットカードをご用意できない場合、当店では日本円などの現金でのお支払いも可能です。",
      },
      success: { heading: "予約が確定しました", refLabel: "予約番号", thanks: "ありがとうございます。お車を確保しました。", payInfo: "お受け取り時にカウンターでお支払いください。", bring: "パスポートと運転免許証（必要に応じてIDP）をお持ちください。", home: "ホームに戻る" },
      notFound: { heading: "車が見つかりません", body: "この車両が見つかりませんでした。現在ご利用いただけない可能性があります。", back: "車種一覧に戻る" },
      errorCreate: "予約の作成中に問題が発生しました。もう一度お試しください。",
    },
  },

  zh: {
    brand: "P-rideon",
    brandSub: "租车 · 大阪",
    nav: { fleet: "车型", plans: "保险", how: "租车流程", destinations: "目的地", support: "客服", reserve: "预订" },
    hero: {
      eyebrow: "租车 · 大阪",
      title1: "在大阪租车，",
      title2: "自在畅游关西。",
      subtitle: "在大阪门店取车，前往京都、奈良、神户。多语言支持，保险齐全，取车时付款。",
    },
    search: {
      pickup: "取车",
      return: "还车",
      location: "选择门店",
      pickDate: "取车日期",
      pickTime: "时间",
      returnDate: "还车日期",
      returnTime: "时间",
      find: "查找车辆",
      note: "取车前48小时可免费取消。",
    },
    trust: {
      support: "多语言支持", supportD: "工作人员与文件均可使用您的语言",
      cancel: "免费取消", cancelD: "取车前48小时内",
      insure: "保险齐全", insureD: "含CDW，可选零自付额",
      etc: "ETC通行卡", etcD: "高速收费站一刷即过",
    },
    fleet: { eyebrow: "车队", title: "为你的路线选一辆车", sub: "全部为自动挡、无烟车，配备英文导航与ETC通行卡。", from: "起", perDay: "/ 天", seats: "座", bags: "行李", transmission: "变速箱", fuelLabel: "燃料", reserve: "预订", all: "查看全部车型", filterAll: "全部" },
    classes: { kei: "K-Car 微型", compact: "紧凑型", hybrid: "混动", suv: "SUV", minivan: "MPV", premium: "豪华" },
    steps: {
      eyebrow: "租车流程",
      title: "三步即可上路",
      items: [
        { t: "在线预订", d: "选择车辆与保障，几分钟完成预订。当天前无需银行卡。" },
        { t: "在门店取车", d: "我们会将车辆开到门店。请携带有效驾照及付款方式领取钥匙。ETC卡需另行付费。" },
        { t: "出发探索", d: "英文导航已就绪。行程结束后将车辆开回门店归还。" },
      ],
    },
    dest: { eyebrow: "去哪儿", title: "从大阪出发的一日游", sub: "关西小巧而迷人，多数名胜都在轻松自驾范围内。", fromOsaka: "距大阪", drive: "车程" },
    footer: { tagline: "为游览大阪与关西的旅客提供租车服务。", hours: "每日 7:00–22:00 营业", addr: "日本大阪市中央区", rights: "版权所有。", contact: "联系我们" },
    booking: {
      heading: "预订车辆",
      steps: { trip: "行程与保障", details: "您的信息", confirm: "确认" },
      back: "返回", next: "继续", reserve: "确认预订", reserving: "预订中…",
      editTrip: "取车与还车", protection: "选择保障", extrasTitle: "附加选项", included: "已包含", perDay: "/ 天", vehicleInfo: "车辆详情", viewVehicle: "详情",
      summary: { heading: "预订摘要", vehicle: "车型", pickup: "取车", dropoff: "还车", duration: "时长", days: "天", hours: "小时", extension: "延长", base: "基本租金", discount: "套餐折扣", protection: "保障", total: "预计总额", payAtPickup: "到店付款" },
      form: { heading: "驾驶人信息", fullName: "姓名", email: "邮箱", phone: "电话", license: "驾照签发国家/地区", licensePh: "选择国家/地区", flight: "航班号", flightHint: "选填 — 航班延误时便于我们安排", notes: "备注", notesHint: "选填 — 儿童座椅、特殊要求…", required: "请填写此项。", optional: "选填" },
      confirm: { heading: "核对并确认", note: "现在无需付款 — 取车时在柜台付款。请携带护照和有效驾照（如需要请带国际驾照）。" },
      noc: {
        title: "NOC（营业损失费）",
        body: "如因事故、盗窃或污损导致车辆需要维修或清洁，除免责额外还需支付营业损失费：车辆可自行驶回门店为50,000日元，无法自行驶回为100,000日元。免责补偿（CDW）不含NOC。",
      },
      docs: {
        heading: "取车时所需证件",
        identity: "有效护照或身份证件。",
        licenseTitle: "驾驶执照 — 以下任一：",
        licenseJp: "日本驾照",
        licenseIntl: "本国驾照原件＋国际驾驶许可证（1949年日内瓦公约）",
        held: "所有驾驶人须持有驾照满12个月以上。",
        payTitle: "柜台付款",
        cardName: "信用卡须为主驾驶人本人名义。",
        cardChip: "信用卡须带芯片，卡号须为凸字。",
        unionPay: "接受银联双标信用卡（银联＋其他卡组织标志），也接受银联磁条卡。",
        cash: "如无法提供信用卡，本店也接受日元等货币的现金付款。",
      },
      success: { heading: "预订已确认", refLabel: "预订编号", thanks: "谢谢！您的车辆已预留。", payInfo: "取车时在柜台付款。", bring: "请携带护照和驾照（如需要请带国际驾照）。", home: "返回首页" },
      notFound: { heading: "未找到车辆", body: "未能找到该车辆，可能已不可用。", back: "返回全部车型" },
      errorCreate: "创建预订时出错，请重试。",
    },
  },

  ko: {
    brand: "P-rideon",
    brandSub: "렌터카 · 오사카",
    nav: { fleet: "차종", plans: "보험", how: "이용 방법", destinations: "여행지", support: "지원", reserve: "예약" },
    hero: {
      eyebrow: "렌터카 · 오사카",
      title1: "오사카에서 빌리고,",
      title2: "간사이를 자유롭게.",
      subtitle: "오사카 지점에서 픽업해 교토·나라·고베로 떠나세요. 영어 지원, 보험 완비, 결제는 픽업 시에.",
    },
    search: {
      pickup: "픽업",
      return: "반납",
      location: "지점 선택",
      pickDate: "픽업 날짜",
      pickTime: "시간",
      returnDate: "반납 날짜",
      returnTime: "시간",
      find: "차량 찾기",
      note: "픽업 48시간 전까지 무료 취소.",
    },
    trust: {
      support: "다국어 지원", supportD: "직원과 서류 모두 당신의 언어로",
      cancel: "무료 취소", cancelD: "픽업 48시간 전까지",
      insure: "보험 완비", insureD: "CDW 포함, 자기부담금 0 선택 가능",
      etc: "ETC 통행 카드", etcD: "고속도로 게이트를 그대로 통과",
    },
    fleet: { eyebrow: "차량", title: "당신의 경로에 맞는 차를", sub: "전 차량 자동·금연이며 영어 내비와 ETC 카드를 갖췄습니다.", from: "부터", perDay: "/ 일", seats: "인승", bags: "수하물", transmission: "변속기", fuelLabel: "연료", reserve: "예약", all: "전체 차종 보기", filterAll: "전체" },
    classes: { kei: "경차", compact: "콤팩트", hybrid: "하이브리드", suv: "SUV", minivan: "미니밴", premium: "프리미엄" },
    steps: {
      eyebrow: "이용 방법",
      title: "출발까지 세 단계",
      items: [
        { t: "온라인 예약", d: "차량과 보장을 선택해 몇 분 만에 예약. 당일까지 카드 불필요." },
        { t: "지점에서 픽업", d: "차량을 지점까지 가져다드립니다. 유효한 운전면허증과 결제 수단을 지참해 키를 수령하세요. ETC 카드는 유료입니다." },
        { t: "드라이브 출발", d: "영어 내비 준비 완료. 여행이 끝나면 지점으로 반납하세요." },
      ],
    },
    dest: { eyebrow: "어디로", title: "오사카에서 떠나는 당일치기", sub: "간사이는 작지만 아름답습니다. 대부분의 명소가 가벼운 드라이브 거리.", fromOsaka: "오사카에서", drive: "운전" },
    footer: { tagline: "오사카와 간사이를 여행하는 분들을 위한 렌터카.", hours: "매일 7:00–22:00 영업", addr: "일본 오사카시 주오구", rights: "All rights reserved.", contact: "문의" },
    booking: {
      heading: "차량 예약",
      steps: { trip: "일정 및 보장", details: "고객 정보", confirm: "확인" },
      back: "뒤로", next: "계속", reserve: "예약 확정", reserving: "예약 중…",
      editTrip: "픽업 · 반납", protection: "보장 선택", extrasTitle: "옵션 추가", included: "포함", perDay: "/ 일", vehicleInfo: "차량 정보", viewVehicle: "상세",
      summary: { heading: "예약 요약", vehicle: "차종", pickup: "픽업", dropoff: "반납", duration: "기간", days: "일", hours: "시간", extension: "연장", base: "기본 요금", discount: "플랜 할인", protection: "보장", total: "예상 합계", payAtPickup: "현장 결제" },
      form: { heading: "운전자 정보", fullName: "이름", email: "이메일", phone: "전화번호", license: "운전면허 발급 국가/지역", licensePh: "국가/지역 선택", flight: "항공편", flightHint: "선택 — 항공편 지연 시 도움이 됩니다", notes: "메모", notesHint: "선택 — 카시트, 특별 요청 등", required: "이 항목을 입력해 주세요.", optional: "선택" },
      confirm: { heading: "검토 및 확인", note: "지금은 결제하지 않습니다 — 픽업 시 카운터에서 결제합니다. 여권과 유효한 운전면허증(필요 시 국제운전면허증)을 지참하세요." },
      noc: {
        title: "NOC(휴차 보상료)",
        body: "사고·도난·오손 등으로 차량 수리·청소가 필요한 경우 면책금과 별도로 NOC가 부과됩니다. 차량을 지점까지 운전해 반납할 수 있으면 50,000엔, 불가능하면 100,000엔입니다. 면책 보상(CDW)은 NOC를 보장하지 않습니다.",
      },
      docs: {
        heading: "픽업 시 필요한 서류",
        identity: "유효한 여권 또는 신분증.",
        licenseTitle: "운전면허증 — 다음 중 하나:",
        licenseJp: "일본 운전면허증",
        licenseIntl: "본국 운전면허증 원본 + 국제운전면허증(1949년 제네바 협약)",
        held: "모든 운전자는 면허 취득 후 12개월 이상이어야 합니다.",
        payTitle: "카운터 결제",
        cardName: "신용카드는 주 운전자 명의여야 합니다.",
        cardChip: "신용카드는 IC칩이 있어야 하며 카드 번호가 양각(엠보싱)이어야 합니다.",
        unionPay: "유니온페이(UnionPay) 듀얼 로고 신용카드(유니온페이+타 카드사 로고)를 사용할 수 있으며, 유니온페이 마그네틱 카드도 사용 가능합니다.",
        cash: "신용카드가 없는 경우, 이 지점에서는 엔화(JPY) 등 현금 결제도 가능합니다.",
      },
      success: { heading: "예약이 확정되었습니다", refLabel: "예약 번호", thanks: "감사합니다! 차량이 예약되었습니다.", payInfo: "픽업 시 카운터에서 결제하세요.", bring: "여권과 운전면허증(필요 시 IDP)을 지참하세요.", home: "홈으로" },
      notFound: { heading: "차량을 찾을 수 없습니다", body: "해당 차량을 찾을 수 없습니다. 더 이상 이용할 수 없을 수 있습니다.", back: "전체 차종으로" },
      errorCreate: "예약 생성 중 문제가 발생했습니다. 다시 시도해 주세요.",
    },
  },
};
