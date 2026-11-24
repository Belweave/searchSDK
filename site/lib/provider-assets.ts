import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getRegistry, hueVar, type Provider } from "./registry";

/**
 * Provider brand assets: the providers' own logo files in public/providers/<id>/ (sources and
 * usage rules: public/providers/SOURCES.md). Read at build time. A provider with no folder or a
 * missing file gets `null` for that asset and renders as its name with a monogram; nothing fails.
 *
 * Each file's width and height come from its own viewBox, so every image reserves its exact box
 * before it loads and is only ever scaled in proportion.
 */

export const ASSETS_DIR = path.join(process.cwd(), "public", "providers");

export type Art = { src: string; width: number; height: number };
/** One asset in the two variants the provider supplies for dark and light surfaces. */
export type Variant = { dark: Art; light: Art };

/** Everything a component needs to show a provider. Plain data, so it can cross into client components. */
export type ProviderBrand = {
  id: string;
  name: string;
  /** CSS value of the provider's hue token. */
  hue: string;
  /** The provider's symbol, or null when it has none here. */
  mark: Variant | null;
  /** The provider's logo or wordmark, or null. */
  logo: Variant | null;
  /** One or two letters for providers without a mark. */
  monogram: string;
};

function art(id: string, file: string): Art | null {
  const full = path.join(ASSETS_DIR, id, file);
  if (!existsSync(full)) return null;
  const svg = readFileSync(full, "utf8");
  const box = svg.match(/viewBox\s*=\s*"\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  if (!box) return null; // without a viewBox the proportions are unknown: use the fallback
  const width = Number(box[1]);
  const height = Number(box[2]);
  if (!(width > 0 && height > 0)) return null;
  return { src: `/providers/${id}/${file}`, width, height };
}

function variant(id: string, kind: "mark" | "logo"): Variant | null {
  const dark = art(id, `${kind}-on-dark.svg`);
  const light = art(id, `${kind}-on-light.svg`);
  if (!dark && !light) return null;
  return { dark: (dark ?? light)!, light: (light ?? dark)! };
}

function monogram(name: string): string {
  const words = name.split(/[\s.]+/).filter(Boolean);
  return (words.length > 1 ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}` : name.slice(0, 2)).toUpperCase();
}

function toBrand(p: Provider): ProviderBrand {
  return { id: p.id, name: p.name, hue: hueVar(p.hue), mark: variant(p.id, "mark"), logo: variant(p.id, "logo"), monogram: monogram(p.name) };
}

const brands = new Map(getRegistry().providers.map((p) => [p.id, toBrand(p)]));

export function providerBrand(id: string): ProviderBrand {
  const known = brands.get(id);
  if (known) return known;
  return { id, name: id, hue: "var(--fg-subtle)", mark: null, logo: null, monogram: monogram(id) };
}

export function allBrands(): ProviderBrand[] {
  return [...brands.values()];
}
