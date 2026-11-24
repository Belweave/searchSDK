import Link from "next/link";
import { primaryNav } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-gutter">
        <Link href="/" className="rounded-sm" aria-label="searchSDK home">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-fg-muted transition-colors duration-[var(--motion-fast)] ease-standard hover:text-fg sm:px-3"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
