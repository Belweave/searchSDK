"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

/**
 * Fumadocs context for /docs only. The theme is ours (lib/theme.ts), not next-themes.
 * TODO(search): docs search is off in the scaffold; add the static Orama index when there are enough pages.
 */
export function DocsProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      {children}
    </RootProvider>
  );
}
