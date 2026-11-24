import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-section border-t border-line">
      <div className="mx-auto flex max-w-page flex-col gap-3 px-gutter py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          MIT licensed.{" "}
          <a href={site.repo} className="underline decoration-line-strong underline-offset-4 hover:text-fg">
            Source on GitHub
          </a>
          . <Link href="/llms.txt" className="underline decoration-line-strong underline-offset-4 hover:text-fg">llms.txt</Link>
        </p>
        <p>Provider names are trademarks of their respective owners. searchSDK is not affiliated with them.</p>
      </div>
    </footer>
  );
}
