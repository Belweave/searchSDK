// Answer matching for known-answer items. Deliberately simple and published:
// normalize both sides, then look for a whole-word alias, a pattern, or (for
// navigational items) a result URL on the official host.

/** Removes Latin, Greek and Cyrillic diacritics only; kana voicing marks (U+3099, U+309A) survive. */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
}

/** NFKC, lowercase, diacritics off, punctuation and symbols to spaces, whitespace collapsed. */
export function normalize(text: string): string {
  return stripDiacritics(text.normalize("NFKC").toLowerCase())
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const SCRIPT_WITHOUT_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

/** True when a normalized alias occurs in normalized text, on word boundaries for spaced scripts. */
export function containsAlias(normText: string, alias: string): boolean {
  const a = normalize(alias);
  if (!a) return false;
  if (SCRIPT_WITHOUT_SPACES.test(a)) return normText.includes(a);
  return ` ${normText} `.includes(` ${a} `);
}

export function compilePatterns(patterns: readonly string[]): RegExp[] {
  return patterns.map((p) => new RegExp(p, "iu"));
}

export interface AnswerKey {
  answers: readonly string[];
  answerPatterns: readonly string[];
  answerUrls: readonly string[];
}

/** Does the text contain the answer (any alias or any pattern)? */
export function textHasAnswer(text: string, key: AnswerKey): boolean {
  if (!text) return false;
  const n = normalize(text);
  if (key.answers.some((a) => containsAlias(n, a))) return true;
  const nfc = text.normalize("NFKC");
  return compilePatterns(key.answerPatterns).some((r) => r.test(nfc));
}

/** Host without a leading "www.", lowercased; null for unparsable URLs. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** A result URL is on the official site when its host equals the gold host or is a subdomain of it. */
export function urlMatches(resultUrl: string, goldUrls: readonly string[]): boolean {
  const h = hostOf(resultUrl);
  if (!h) return false;
  return goldUrls.some((g) => {
    const gh = hostOf(g);
    return gh !== null && (h === gh || h.endsWith(`.${gh}`));
  });
}
