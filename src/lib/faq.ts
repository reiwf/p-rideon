/* FAQ help-desk matching.

   Deliberately dependency-free and deterministic: a typed question is scored
   against every FAQ entry and the result is either one confident answer, a
   short "did you mean" list, or a hand-off. `matchFaq` is the single seam —
   swapping in a model-backed engine later means replacing that one function,
   because the reply shape is what the UI renders, not the mechanism.

   Multilingual without a tokenizer: Latin script splits on words, while
   Japanese/Chinese/Korean runs (which have no reliable word boundaries) are
   indexed as character bigrams plus the whole run. Both sides of the
   comparison are tokenized identically, so "キャンセル" finds
   "予約のキャンセル" through the shared キャ/ャン/ンセ/セル bigrams. */

import { tText, type ContentI18n } from "./i18nContent";
import type { Locale } from "./i18n";

export type Faq = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  /** match terms in any language, entered by staff */
  keywords: string[];
  i18n?: ContentI18n;
};

/** What the widget should render next. Mirrors what a model-backed engine
    would have to return, so the UI is independent of the matcher. */
export type FaqReply =
  /** one entry matched clearly enough to just answer */
  | { kind: "answer"; faq: Faq }
  /** several plausible entries — the visitor picks */
  | { kind: "choose"; faqs: Faq[] }
  /** nothing matched — offer topics to browse, alongside contact details */
  | { kind: "topics"; topics: string[] }
  /** nothing matched and no topics to offer — contact details only */
  | { kind: "handoff" };

export const faqTopic = (f: Faq, locale: Locale) => tText(f.topic, f.i18n?.topic, locale);
export const faqQuestion = (f: Faq, locale: Locale) => tText(f.question, f.i18n?.question, locale);
export const faqAnswer = (f: Faq, locale: Locale) => tText(f.answer, f.i18n?.answer, locale);

/** Topics in the order their entries are sorted, deduped. */
export function faqTopics(faqs: Faq[], locale: Locale): string[] {
  const seen = new Set<string>();
  for (const f of faqs) {
    const topic = faqTopic(f, locale).trim();
    if (topic) seen.add(topic);
  }
  return [...seen];
}

// Latin function words carry no signal and would match nearly every entry.
// Only Latin needs this: CJK bigrams are discriminative on their own.
const STOP = new Set([
  "a", "an", "the", "is", "are", "am", "be", "was", "were", "do", "does", "did", "can", "could",
  "will", "would", "shall", "should", "may", "might", "must", "have", "has", "had", "i", "we",
  "you", "my", "our", "your", "it", "its", "to", "of", "for", "in", "on", "at", "by", "with",
  "and", "or", "but", "if", "so", "as", "that", "this", "there", "how", "what", "when", "where",
  "who", "why", "which", "please", "hi", "hello", "thanks", "thank",
]);

const LATIN = /[a-z0-9]+/g;
// Hiragana, katakana, CJK ideographs (incl. extension A), compatibility, Hangul
const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯]+/g;

const normalize = (s: string) => s.normalize("NFKC").toLowerCase();

/** Tokens for one string: Latin words plus CJK runs and their bigrams. */
function tokenize(raw: string): string[] {
  const s = normalize(raw);
  const out: string[] = [];

  for (const word of s.match(LATIN) ?? []) {
    if (word.length < 2 || STOP.has(word)) continue;
    out.push(word);
    // crude de-pluralising so "tolls" finds the keyword "toll". Both sides are
    // tokenized this way, so it costs nothing to also index the singular.
    if (word.length >= 4 && word.endsWith("s") && !word.endsWith("ss")) out.push(word.slice(0, -1));
  }

  for (const run of s.match(CJK) ?? []) {
    // the whole run matches short words outright (Korean especially, which is
    // spaced); bigrams handle the unspaced Japanese/Chinese case
    if (run.length <= 8) out.push(run);
    for (let i = 0; i + 2 <= run.length; i++) out.push(run.slice(i, i + 2));
    if (run.length === 1) out.push(run);
  }

  return out;
}

// A term found in the staff-entered keywords is a much stronger signal than one
// buried in the answer prose, which is long and matches loosely.
const WEIGHTS = { keywords: 4, question: 3, topic: 2, answer: 1 } as const;

/** token → best weight it carries for this entry. */
function indexFaq(f: Faq, locale: Locale): Map<string, number> {
  const index = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const token of tokenize(text)) {
      if ((index.get(token) ?? 0) < weight) index.set(token, weight);
    }
  };
  // English base *and* the localized text: staff may not have translated an
  // entry yet, and a visitor may type English on a Japanese page
  add(f.keywords.join(" "), WEIGHTS.keywords);
  add(f.question, WEIGHTS.question);
  add(faqQuestion(f, locale), WEIGHTS.question);
  add(f.topic, WEIGHTS.topic);
  add(faqTopic(f, locale), WEIGHTS.topic);
  add(f.answer, WEIGHTS.answer);
  add(faqAnswer(f, locale), WEIGHTS.answer);
  return index;
}

type Scored = { faq: Faq; score: number; coverage: number };

function score(faqs: Faq[], query: string, locale: Locale): Scored[] {
  const tokens = [...new Set(tokenize(query))];
  if (tokens.length === 0) return [];
  const needle = normalize(query).trim();

  return faqs
    .map((faq) => {
      const index = indexFaq(faq, locale);
      let total = 0;
      let hits = 0;
      for (const token of tokens) {
        const weight = index.get(token);
        if (weight) { total += weight; hits++; }
      }
      // a question typed almost verbatim should win outright, even when it is
      // short enough that few tokens carry weight
      if (needle.length >= 4) {
        const q = normalize(faqQuestion(faq, locale));
        if (q.includes(needle) || normalize(faq.question).includes(needle)) total += 6;
      }
      return { faq, score: total, coverage: hits / tokens.length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Decide what to show for a typed question. */
export function matchFaq(query: string, faqs: Faq[], locale: Locale): FaqReply {
  const usable = faqs.filter((f) => faqQuestion(f, locale).trim() && faqAnswer(f, locale).trim());
  const topics = faqTopics(usable, locale);
  const fallback: FaqReply = topics.length > 0 ? { kind: "topics", topics } : { kind: "handoff" };

  if (!query.trim()) return fallback;

  const ranked = score(usable, query, locale);
  if (ranked.length === 0) return fallback;

  const [best, runnerUp] = ranked;

  // Confident when the query is largely accounted for AND nothing else comes
  // close. Without the margin test a two-word query would "confidently" answer
  // whichever of five near-identical entries happened to sort first.
  const clearWinner = !runnerUp || best.score >= runnerUp.score * 1.6;
  if (best.coverage >= 0.5 && clearWinner) return { kind: "answer", faq: best.faq };

  // Otherwise let the visitor disambiguate — this is the "did you mean" step.
  const shortlist = ranked.filter((s) => s.score >= best.score * 0.4).slice(0, 4);
  if (shortlist.length === 1) return { kind: "answer", faq: shortlist[0].faq };
  if (shortlist.length > 1) return { kind: "choose", faqs: shortlist.map((s) => s.faq) };

  return fallback;
}

/** Entries filed under one topic, for the topic chips. */
export function faqsInTopic(faqs: Faq[], topic: string, locale: Locale): Faq[] {
  return faqs.filter((f) => faqTopic(f, locale) === topic);
}
