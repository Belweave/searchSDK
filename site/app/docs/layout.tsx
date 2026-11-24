import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsProvider } from "@/components/docs/provider";
import { SiteFooter } from "@/components/site/footer";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Wordmark } from "@/components/site/wordmark";
import { primaryNav } from "@/lib/site";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      {/* Fumadocs renders its own skip link to #nd-page as the first focusable element. */}
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
