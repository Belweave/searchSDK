import type { ReactNode } from "react";
import { Backdrop } from "@/components/site/backdrop";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SkipLink } from "@/components/site/skip-link";
import "@/components/site/site.css";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <div aria-hidden="true" className="site-field field-grid" />
      <Backdrop />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
