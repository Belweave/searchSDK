import file from "@/data/registry.sample.json";
import { type Dataset, toDataset } from "./dataset";

/**
 * The provider registry loader. The only module that knows where registry data comes from:
 * today a placeholder file (data/registry.sample.json); later the registry from branch v2/registry.
 * Pages import from here, never from the JSON.
 *
 * `null` anywhere means unknown. Pages show it as "Unknown"; they never fill it in.
 */

export type HueSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Unknown<T> = T | null;

export type Provider = {
  id: string;
  name: string;
  hue: HueSlot;
  capabilities: { search: Unknown<boolean>; contents: Unknown<boolean>; answer: Unknown<boolean> };
  pricing: {
    model: Unknown<string>;
    searchUsdPer1k: Unknown<number>;
    contentsUsdPer1k: Unknown<number>;
    freeTier: Unknown<string>;
  };
  limits: { maxResultsPerQuery: Unknown<number>; requestsPerSecond: Unknown<number>; timeoutMs: Unknown<number> };
  sources: { label: string; url: string }[];
};

export type Registry = { version: string; providers: Provider[] };

function isHue(value: unknown): value is HueSlot {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10;
}

function load(): Dataset<Registry> {
  const providers = file.providers.map((p): Provider => {
    if (!/^[a-z0-9-]+$/.test(p.id)) throw new Error(`Registry id "${p.id}" must be lowercase letters, digits and dashes.`);
    if (!isHue(p.hue)) throw new Error(`Registry provider "${p.id}" needs a hue slot from 1 to 10.`);
    return { ...p, hue: p.hue };
  });
  const ids = new Set(providers.map((p) => p.id));
  if (ids.size !== providers.length) throw new Error("Registry provider ids must be unique.");
  return toDataset(file, { version: file.version, providers }, "data/registry.sample.json");
}

const registry = load();

export function getRegistry(): Dataset<Registry> {
  return registry;
}

export function getProvider(id: string): Provider | undefined {
  return registry.data.providers.find((p) => p.id === id);
}

export function providerName(id: string): string {
  return getProvider(id)?.name ?? id;
}

/** The CSS variable for a provider's hue (styles/tokens.css). */
export function hueVar(slot: HueSlot): string {
  return `var(--hue-${slot})`;
}

export function providerHue(id: string): string {
  const provider = getProvider(id);
  return provider ? hueVar(provider.hue) : "var(--fg-subtle)";
}
