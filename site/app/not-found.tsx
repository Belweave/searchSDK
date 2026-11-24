import type { Metadata } from "next";
import Link from "next/link";
import { Backdrop } from "@/components/site/backdrop";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SkipLink } from "@/components/site/skip-link";
import "@/components/site/site.css";

export const metadata: Metadata = {
  title: { absolute: "Page not found | searchSDK" },
  description: "This page does not exist. Start from the searchSDK home page or the documentation.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <div aria-hidden="true" className="site-field field-grid" />
      <Backdrop />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="page-wrap not-found outline-none">
        <p className="type-label not-found-code">404</p>
        <h1 className="type-display">Page not found</h1>
        <p className="type-lead not-found-line">Nothing answers at this address. Start from the home page or the docs.</p>
        <nav aria-label="Where to go" className="not-found-keys">
          <Link href="/" className="key key-beam">
            <span className="key-face">Home</span>
          </Link>
          <Link href="/docs" className="key">
            <span className="key-face">Docs</span>
          </Link>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
