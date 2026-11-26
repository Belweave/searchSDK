import Link from "next/link";
import { Mark } from "@/components/brand/searchsdk";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <p className="site-footer-own">
          <Mark px={20} />
          <span>
          MIT licensed.{" "}
          <a href={site.repo} className="prose-link">
            Source on GitHub
          </a>
          .{" "}
          <Link href="/docs/faq" className="prose-link">
            FAQ
          </Link>
          .{" "}
          <Link href="/docs/privacy" className="prose-link">
            Privacy
          </Link>
          .{" "}
          <Link href="/llms.txt" className="prose-link">
            llms.txt
          </Link>
          </span>
        </p>
        <p>Provider names and logos are trademarks of their respective owners. searchSDK is not affiliated with them.</p>
      </div>
    </footer>
  );
}
