import type { Metadata } from "next";
import Link from "next/link";
import { AgentKey } from "@/components/home/agent-key";
import { HomeSections } from "@/components/home/sections";
import { HomeStage } from "@/components/home/stage";
import { getRegistry } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import "@/components/home/home.css";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "searchSDK: one interface to every web search API",
  description: "One interface for AI apps and agents to many web search providers, in TypeScript and Python, with fallback, honest cost and open benchmarks. MIT licensed.",
});

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export default function Home() {
  const count = getRegistry().providers.filter((p) => p.search).length;
  const counted = NUMBERS[count] ?? String(count);
  return (
    <>
      <section data-cap="30" data-cap-name="hero" className="hero">
        <div className="page-wrap">
          <h1 className="type-display hero-h1">
            Every search API. One call.
          </h1>
          <div className="hero-side">
            <p className="type-lead hero-lead">
              searchSDK gives AI apps and agents one interface to {counted} web search providers, with fallback, honest cost and
              open benchmarks.
            </p>
            <nav aria-label="Get started" className="hero-keys">
              <Link href="/docs" className="key key-beam">
                <span className="key-face">Read the docs</span>
              </Link>
              <a href="#stage" className="key">
                <span className="key-face">Watch it work</span>
              </a>
              <AgentKey prompt={`Read ${absoluteUrl("/llms.txt")} and add searchSDK to this project for web search.`} />
            </nav>
          </div>
          <div id="stage" className="hero-stage" tabIndex={-1}>
            <HomeStage />
          </div>
        </div>
      </section>
      <HomeSections />
    </>
  );
}
