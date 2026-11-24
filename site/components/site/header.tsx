import Link from "next/link";
import { primaryNav } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

/** Phone: name and theme on the first row, navigation on the second. Wider: one row. */
export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-4 px-gutter py-2 sm:h-14 sm:flex-nowrap sm:py-0">
        <Link href="/" className="order-1 rounded-sm" aria-label="searchSDK home">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="order-3 -ml-2 flex w-full items-center text-sm sm:order-2 sm:ml-auto sm:w-auto sm:gap-1">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-fg-muted transition-colors duration-[var(--motion-fast)] ease-standard hover:text-fg sm:px-3"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="order-2 sm:order-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
