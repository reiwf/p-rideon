/* Server-only DeepL translation endpoint for the admin console.
   Translates English catalog text → JA/ZH/KO. The DeepL key never reaches the
   browser. Access is restricted to signed-in staff (car_is_staff). */

import { createClient } from "@supabase/supabase-js";
import { DEEPL_TARGET, T_LOCALES, type TLocale } from "@/lib/i18nContent";

export const dynamic = "force-dynamic";

type Body = { text?: string[]; targets?: TLocale[] };

async function isStaff(token: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.rpc("car_is_staff");
    return !error && data === true;
  } catch {
    return false;
  }
}

/** Call DeepL for one target language, preserving input order. */
async function translateTo(texts: string[], target: string, apiKey: string, host: string): Promise<string[]> {
  // only send non-empty strings; map results back to original positions
  const idx: number[] = [];
  const payload: string[] = [];
  texts.forEach((t, i) => {
    if (t && t.trim()) { idx.push(i); payload.push(t); }
  });
  if (payload.length === 0) return texts.map(() => "");

  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: payload, source_lang: "EN", target_lang: target }),
  });
  if (!res.ok) {
    throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { translations?: { text: string }[] };
  const out = new Array(texts.length).fill("");
  (json.translations ?? []).forEach((tr, j) => { out[idx[j]] = tr.text; });
  return out;
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token || !(await isStaff(token))) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Translation is not configured (DEEPL_API_KEY missing)." }, { status: 503 });
  }
  // free-tier keys end in ":fx" and use the api-free host
  const host = process.env.DEEPL_API_HOST ?? (apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = Array.isArray(body.text) ? body.text : [];
  const targets = (body.targets ?? T_LOCALES).filter((t): t is TLocale => (T_LOCALES as string[]).includes(t));
  if (text.length === 0) return Response.json({ translations: {} });

  try {
    const entries = await Promise.all(
      targets.map(async (loc) => [loc, await translateTo(text, DEEPL_TARGET[loc], apiKey, host)] as const),
    );
    return Response.json({ translations: Object.fromEntries(entries) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
