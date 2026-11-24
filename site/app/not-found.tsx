import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SkipLink } from "@/components/site/skip-link";

export const metadata: Metadata = {
  title: { absolute: "Page not found | searchSDK" },
  description: "This page does not exist. Start from the searchSDK home page or the documentation.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-page px-gutter py-section outline-none">
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-4 text-fg-muted">
          <Link href="/" className="text-accent underline underline-offset-4">Home</Link> or{" "}
          <Link href="/docs" className="text-accent underline underline-offset-4">docs</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
