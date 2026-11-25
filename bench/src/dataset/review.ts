// Turns builder candidates into a committed set by applying a review file:
// dropped items with reasons, pruned aliases, and how many survivors to keep
// per template (the first ones in the builder's seeded order). The review file
// is committed next to the set, so every change from the raw build is visible.
import type { Item } from "./items.ts";

export interface Review {
  for: string;
  reviewedOn: string;
  status: "agent-reviewed" | "human-verified";
  note: string;
  /** Keep the first N survivors of each template. */
  take?: Record<string, number>;
  /** Candidate key (id without its prefix) to the reason it was dropped. */
  drop?: Record<string, string>;
  /** Candidate key to the complete replacement alias list. */
  answers?: Record<string, string[]>;
  /** Candidate keys whose answers the reviewer could not check; they keep "builder-checked". */
  unchecked?: string[];
  /** Candidate key to a note added to that item's review note (for example, where the answer was confirmed). */
  notes?: Record<string, string>;
}

export interface BuildSpec {
  name: string;
  version: string;
  split: "public" | "fresh";
  seed: number;
  builtOn: string;
  templates: { id: string; count: number }[];
}

export const keyOf = (id: string) => id.replace(/^[a-z]+-/, "");

export function applyReview(candidates: readonly Item[], review: Review, idPrefix: "pub" | "fresh"): Item[] {
  const kept = new Map<string, number>();
  const out: Item[] = [];
  const known = new Set(candidates.map((c) => keyOf(c.id)));
  for (const k of [...Object.keys(review.drop ?? {}), ...Object.keys(review.answers ?? {}), ...(review.unchecked ?? []), ...Object.keys(review.notes ?? {})]) {
    if (!known.has(k)) throw new Error(`review names ${k}, which is not a candidate`);
  }
  for (const c of candidates) {
    const key = keyOf(c.id);
    if (review.drop?.[key]) continue;
    const t = c.builder.template;
    const n = kept.get(t) ?? 0;
    if (review.take?.[t] !== undefined && n >= review.take[t]!) continue;
    kept.set(t, n + 1);
    const unchecked = review.unchecked?.includes(key);
    out.push({
      ...c,
      id: `${idPrefix}-${key}`,
      answers: review.answers?.[key] ?? c.answers,
      review: unchecked
        ? { status: "builder-checked", on: review.reviewedOn, note: [c.review.note, "answer not independently checked"].filter(Boolean).join("; ") }
        : { status: review.status, on: review.reviewedOn, note: [review.note, review.notes?.[key]].filter(Boolean).join(" ") },
    });
  }
  return out;
}
