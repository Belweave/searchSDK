import { contents, search } from "searchsdk";

const providers = ["exa", "brave", "context", "firecrawl", "perplexity", "tavily", "tinyfish"] as const;

const runs = await Promise.all(
  providers.map((provider) =>
    search("how do vector databases index embeddings", {
      provider,
      fallback: ["brave"],
      attemptTimeoutMs: 1500,
    }),
  ),
);

const top = runs[0]?.results[0];
if (top) {
  const { pages } = await contents(top.url, { provider: "exa" });
  console.log(pages[0]?.content);
}
