/* Server-only DeepL translation endpoint for the admin console.
   Translates English catalog text → JA/ZH/KO. The DeepL key never reaches the
   browser. Access is restricted to signed-in staff (car_is_staff). */

import { ALL_LOCALES, DEEPL_SOURCE, DEEPL_TARGET, T_LOCALES } from "@/lib/i18nContent";
import type { Locale } from "@/lib/i18n";
import { bearerToken, isStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

type Body = {
  text?: string[];
  /** language the admin actually wrote in — defaults to the English base */
  source?: Locale;
  targets?: Locale[];
};

/** Call DeepL for one target language, preserving input order. */
async function translateTo(texts: string[], target: string, source: string, apiKey: string, host: string): Promise<string[]> {
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
    body: JSON.stringify({ text: payload, source_lang: source, target_lang: target }),
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
  if (!(await isStaff(bearerToken(request)))) {
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
  const source: Locale = ALL_LOCALES.includes(body.source as Locale) ? (body.source as Locale) : "en";
  // never translate a language into itself
  const targets = (body.targets ?? T_LOCALES)
    .filter((t): t is Locale => ALL_LOCALES.includes(t))
    .filter((t) => t !== source);
  if (text.length === 0 || targets.length === 0) return Response.json({ translations: {} });

  try {
    const entries = await Promise.all(
      targets.map(async (loc) => [loc, await translateTo(text, DEEPL_TARGET[loc], DEEPL_SOURCE[source], apiKey, host)] as const),
    );
    return Response.json({ translations: Object.fromEntries(entries) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
