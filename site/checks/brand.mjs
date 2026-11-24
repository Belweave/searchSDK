// The site's identity comes from ../brand. This copies the brand's own files into the places the
// site serves or imports them from, byte for byte, and fails when a copy is stale.
//   node checks/brand.mjs           check: exit 1 if any copy differs from brand/, is missing, or is extra
//   node checks/brand.mjs --write   sync: copy brand/ → site/ (run by `npm run dev` and `npm run build`)
// Change the brand in brand/ (its own `npm run build`), never the copies here.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.resolve(SITE, "..", "brand");

/** site path ← brand path. Every brand value or asset the site uses arrives through this table. */
export const BRAND_FILES = {
  // Colour, type, space, radius and motion under the site's token names.
  "styles/brand.css": "tokens.site.css",
  // The two faces and their licences.
  "assets/fonts/InstrumentSans-latin.woff2": "fonts/InstrumentSans-latin.woff2",
  "assets/fonts/InstrumentSans-OFL.txt": "fonts/InstrumentSans-OFL.txt",
  "assets/fonts/MartianMono-latin.woff2": "fonts/MartianMono-latin.woff2",
  "assets/fonts/MartianMono-OFL.txt": "fonts/MartianMono-OFL.txt",
  // Lockup and mark sources, inlined at build time by components/brand/searchsdk.tsx.
  "assets/brand/horizontal-dark.svg": "src/lockup/horizontal-dark.svg",
  "assets/brand/horizontal-light.svg": "src/lockup/horizontal-light.svg",
  "assets/brand/mark-dark.svg": "src/mark/mark-dark.svg",
  "assets/brand/mark-light.svg": "src/mark/mark-light.svg",
  "assets/brand/mark-small-dark.svg": "src/mark/mark-small-dark.svg",
  "assets/brand/mark-small-light.svg": "src/mark/mark-small-light.svg",
  "assets/brand/mark-loader-dark.svg": "src/motion/mark-loader-dark.svg",
  "assets/brand/mark-loader-light.svg": "src/motion/mark-loader-light.svg",
  // Icons, through Next's metadata file conventions.
  "app/favicon.ico": "dist/icon/favicon.ico",
  "app/icon.svg": "dist/icon/favicon.svg",
  "app/apple-icon.png": "dist/icon/apple-touch-icon.png",
  // The web manifest's icons (app/manifest.ts), the social card every page names (lib/seo.ts) and
  // the repository's social preview (uploaded in the GitHub repository's settings).
  "public/brand/og.png": "dist/social/og.png",
  "public/brand/icon-192.png": "dist/icon/icon-192.png",
  "public/brand/icon-512.png": "dist/icon/app-icon-512.png",
  "public/brand/icon-maskable-512.png": "dist/icon/icon-maskable-512.png",
  "public/brand/github-social.png": "dist/social/github.png",
};

/** Directories that hold only brand copies: anything else in them is stale. */
const MANAGED_DIRS = ["assets/brand", "public/brand"];

const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 12);

async function readOrNull(file) {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export async function syncBrand({ write = false } = {}) {
  const failures = [];
  let written = 0;
  for (const [dest, from] of Object.entries(BRAND_FILES)) {
    const source = await readOrNull(path.join(BRAND, from));
    if (!source) {
      failures.push(`brand/${from} is missing (needed for site/${dest})`);
      continue;
    }
    const target = path.join(SITE, dest);
    const current = await readOrNull(target);
    if (current && current.equals(source)) continue;
    if (write) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, source);
      written += 1;
    } else {
      failures.push(`site/${dest} is ${current ? `stale (${hash(current)} ≠ brand/${from} ${hash(source)})` : "missing"}; run \`node checks/brand.mjs --write\``);
    }
  }
  const wanted = new Set(Object.keys(BRAND_FILES));
  for (const dir of MANAGED_DIRS) {
    let names = [];
    try {
      names = await readdir(path.join(SITE, dir));
    } catch {
      continue;
    }
    for (const name of names) {
      const rel = `${dir}/${name}`;
      if (wanted.has(rel) || name === ".DS_Store") continue;
      if (write) await rm(path.join(SITE, rel), { force: true });
      else failures.push(`site/${rel} is not a brand file; remove it`);
    }
  }
  return { failures, files: wanted.size, written };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  const { failures, files, written } = await syncBrand({ write });
  if (failures.length) {
    console.error(`${failures.length} brand failure(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(write ? `brand synced (${written} of ${files} files updated)` : `brand current (${files} files match brand/)`);
}
