import { contents, search } from "@searchsdk/sdk";

const providers = ["brave", "context", "exa", "firecrawl", "perplexity", "tavily", "tinyfish"] as const;

const runs = await Promise.all(
  providers.map((provider) =>
    search("how do vector databases index embeddings", {
      provider,
      attemptTimeoutMs: 1500,
    }),
  ),
);

const top = runs[0]?.results[0];
if (top) {
  const { pages } = await contents(top.url, { provider: "context" });
  console.log(pages[0]?.content);
}
