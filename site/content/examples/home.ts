import { search } from "@searchsdk/sdk";

const { results, cost } = await search("vector database indexing", { provider: "exa" });
console.log(results[0]?.url, cost.usd);
