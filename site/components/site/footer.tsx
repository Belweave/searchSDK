import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <p>
          MIT licensed.{" "}
          <a href={site.repo} className="prose-link">
            Source on GitHub
          </a>
          .{" "}
          <Link href="/llms.txt" className="prose-link">
            llms.txt
          </Link>
        </p>
        <p>Provider names and logos are trademarks of their respective owners. searchSDK is not affiliated with them.</p>
      </div>
    </footer>
  );
}
