export { createLocalServer, configuredProviders, localCorpus, settings, VERSION, type LocalServerOptions } from "./server.ts";
export {
  createDocsServer, registerDocs, searchDocs, findDoc, findExamples, estimateCost, validateOptions, providerSummary, docMarkdown,
  type Corpus, type DocPage, type Example, type DocHit, type DocsServerInfo,
} from "./core.ts";
