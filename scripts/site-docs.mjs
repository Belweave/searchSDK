import { cp, mkdir } from "node:fs/promises";
import "../apps/web/src/docs/refresh-native-index.mjs";
const root = new URL("../", import.meta.url);
await mkdir(new URL("apps/web/public/", root), { recursive: true });
await cp(
  new URL("docs/sdk-alpha.md", root),
  new URL("apps/web/public/sdk-guide.md", root),
);

await cp(new URL("docs/provider-catalog.md", root), new URL("apps/web/public/provider-catalog.md", root));

await cp(new URL("docs/priority-adapters.md", root), new URL("apps/web/public/priority-adapters.md", root));
