import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsProvider } from "@/components/docs/provider";
import { SiteFooter } from "@/components/site/footer";
import { SkipLink } from "@/components/site/skip-link";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Wordmark } from "@/components/site/wordmark";
import { primaryNav } from "@/lib/site";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <SkipLink target="nd-page" />
      <DocsLayout
        tree={source.getPageTree()}
        nav={{ title: <Wordmark />, url: "/" }}
        links={primaryNav.filter((l) => l.href !== "/docs").map((l) => ({ text: l.label, url: l.href }))}
        // A ReactNode, not a component, so it can cross the server/client boundary.
        themeSwitch={{ component: <ThemeToggle /> }}
        searchToggle={{ enabled: false }}
      >
        {children}
      </DocsLayout>
      <SiteFooter />
    </DocsProvider>
  );
}
