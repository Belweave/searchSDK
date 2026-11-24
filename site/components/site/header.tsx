import Link from "next/link";
import { primaryNav } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

/** Phone: name and theme on the first row, navigation on the second. Wider: one row. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-row">
        <Link href="/" className="site-home" aria-label="searchSDK home">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="site-nav">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
