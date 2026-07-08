"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminContext, useAdminStore } from "@/lib/adminStore";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAdminT, adminLangs } from "@/lib/adminI18n";
import { Button, inputCls } from "./ui";

const nav = [
  { href: "/admin", key: "dashboard", icon: "M3 12 12 4l9 8M5 10v10h14V10" },
  { href: "/admin/vehicles", key: "vehicles", icon: "M5 16h14M6 16l1-5h10l1 5M8 11l1-3h6l1 3M7 19v-3M17 19v-3" },
  { href: "/admin/plans", key: "ratePlans", icon: "M4 7h16M4 12h16M4 17h10" },
  { href: "/admin/insurance", key: "insurance", icon: "M12 3 5 6v6c0 4 3 6.7 7 8.5 4-1.8 7-4.5 7-8.5V6l-7-3Z" },
  { href: "/admin/branches", key: "branches", icon: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 7.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z" },
  { href: "/admin/extras", key: "extras", icon: "M21 8l-9-5-9 5v8l9 5 9-5V8M3 8l9 5 9-5M12 13v8" },
  { href: "/admin/bookings", key: "bookings", icon: "M7 4v3M17 4v3M4 9h16M5 6h14v14H5z" },
] as const;

function LangToggle() {
  const { lang, setLang } = useAdminT();
  return (
    <div className="flex items-center rounded-full border border-mist bg-paper p-0.5">
      {adminLangs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${lang === l.code ? "bg-ink text-paper" : "text-stone hover:text-ink"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-md bg-expressway text-paper">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 5v14M8 12l7-7M8 12l7 7" />
      </svg>
    </span>
  );
}

function LoginGate({ onSignIn, configured }: { onSignIn: (email: string, pw: string) => Promise<string | null>; configured: boolean }) {
  const { t } = useAdminT();
  const [email, setEmail] = useState("manager@kansaidrive.jp");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !pw) { setErr(t.login.enterBoth); return; }
    setBusy(true);
    const message = await onSignIn(email.trim(), pw);
    setBusy(false);
    if (message) setErr(message);
  }

  return (
    <div className="contours flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-mist bg-paper p-7 shadow-[var(--shadow-board)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-[1.05rem] font-bold text-ink">P-rideon</span>
          </div>
          <LangToggle />
        </div>
        <h1 className="mt-5 font-display text-[1.4rem] font-extrabold tracking-tight text-ink">{t.login.title}</h1>
        <p className="mt-1 text-sm text-stone">{t.login.subtitle}</p>

        {!configured && (
          <p className="mt-4 rounded-lg border border-signal/40 bg-signal/10 px-3 py-2 text-[0.78rem] text-signal">{t.login.notConfigured}</p>
        )}

        <div className="mt-6 space-y-3">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.login.email} autoComplete="username" />
          <input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t.login.password} autoComplete="current-password" autoFocus />
          {err && <p className="text-[0.78rem] text-signal">{err}</p>}
        </div>

        <Button type="submit" disabled={busy} className="mt-5 w-full">{busy ? t.login.signingIn : t.login.signIn}</Button>
        <p className="mt-3 text-center text-[0.72rem] text-stone">{t.login.staffOnly}</p>
      </form>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const store = useAdminStore();
  const { refresh } = store;
  const { t } = useAdminT();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"loading" | "login" | "ready">("loading");
  const [menu, setMenu] = useState(false);

  // Verify the signed-in user is car-rental staff, then load data.
  const verifyAndLoad = useCallback(async (): Promise<boolean> => {
    const { data: isStaff, error } = await supabase.rpc("car_is_staff");
    if (error || !isStaff) return false;
    await refresh();
    return true;
  }, [refresh]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabaseConfigured) { setPhase("login"); return; }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session && (await verifyAndLoad())) {
        if (active) setPhase("ready");
      } else {
        if (data.session) await supabase.auth.signOut();
        if (active) setPhase("login");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setPhase("login");
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [verifyAndLoad]);

  async function signIn(email: string, pw: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) return error.message;
    if (!(await verifyAndLoad())) {
      await supabase.auth.signOut();
      return t.login.notAuthorized;
    }
    setPhase("ready");
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPhase("login");
  }

  if (phase === "loading") return <div className="grid min-h-screen place-items-center text-stone">{t.common.loading}</div>;
  if (phase === "login") return <LoginGate onSignIn={signIn} configured={supabaseConfigured} />;

  return (
    <AdminContext.Provider value={store}>
      <div className="flex min-h-screen bg-paper">
        <aside className={`fixed inset-y-0 left-0 z-40 w-60 -translate-x-full border-r border-mist bg-ink text-paper transition-transform md:translate-x-0 ${menu ? "translate-x-0" : ""}`}>
          <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
            <BrandMark />
            <span className="leading-tight">
              <span className="block font-display text-[0.98rem] font-bold">P-rideon</span>
              <span className="text-[0.62rem] uppercase tracking-widest text-paper/50">Admin</span>
            </span>
          </div>
          <nav className="p-3">
            {nav.map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenu(false)}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active ? "bg-expressway font-semibold text-paper" : "text-paper/70 hover:bg-white/8 hover:text-paper"
                  }`}
                >
                  <NavIcon d={n.icon} />
                  {t.nav[n.key]}
                </Link>
              );
            })}
          </nav>
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
            <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper/70 transition-colors hover:bg-white/8 hover:text-paper">
              <NavIcon d="M15 12H4M11 8l-4 4 4 4M16 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
              {t.common.signOut}
            </button>
          </div>
        </aside>

        {menu && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setMenu(false)} />}

        <div className="flex min-w-0 flex-1 flex-col md:ml-60">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-mist bg-paper/85 px-5 backdrop-blur-md">
            <button className="grid h-9 w-9 place-items-center rounded-md border border-mist md:hidden" onClick={() => setMenu(true)} aria-label="Menu">
              <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className="ml-auto flex items-center gap-3">
              <LangToggle />
              <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-full border border-mist px-3.5 py-1.5 text-sm text-ink hover:bg-paper-dim sm:inline-flex">
                {t.common.viewSite}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </Link>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold text-paper">M</span>
            </div>
          </header>

          {store.error && (
            <div className="border-b border-signal/30 bg-signal/10 px-5 py-2 text-[0.82rem] text-signal">
              {t.dbError} {store.error}
            </div>
          )}

          <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
