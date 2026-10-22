"""Hand-reviewed protocol details from official guides outside endpoint schemas."""
def extend(provider,code):
 if provider=='context':
  defs='''
/** Public Logo Link parameters: https://docs.context.dev/brand/logo-link */
export interface ContextLogoQuery {
  publicClientId: string;
  domain: string;
  theme?: "light" | "dark";
  type?: "icon" | "wordmark";
}
export interface ContextHeadLogoInput extends Pick<NativeRequestInput, "signal" | "timeoutMs" | "headers"> {
  query: ContextLogoQuery;
}
/** Direct embedding URL. The provider prohibits downloading, persisting, or rehosting Logo Link images. */
export function contextLogoUrl(query: ContextLogoQuery): string {
  if (!query || typeof query.publicClientId !== "string" || !query.publicClientId.trim() ||
    typeof query.domain !== "string" || !query.domain.trim()) throw new SearchError("invalid_request");
  const url = new URL("https://logos.context.dev/");
  for (const [key, value] of Object.entries(query)) {
    if (!["publicClientId", "domain", "theme", "type"].includes(key) || typeof value !== "string") throw new SearchError("invalid_request");
    url.searchParams.set(key, value);
  }
  if (query.theme !== undefined && !["light", "dark"].includes(query.theme) ||
    query.type !== undefined && !["icon", "wordmark"].includes(query.type)) throw new SearchError("invalid_request");
  return url.href;
}
'''
  code=code.replace('\nfunction credential(',defs+'\nfunction credential(')
  code=code.replace('export const contextOperations = Object.freeze({', '''export const contextOperations = Object.freeze({
  headLogo: Object.freeze({ id: "headLogo", method: "HEAD", path: "/", response: "raw", retryable: true }),''')
  code=code.replace('  return Object.freeze({','''  const logoTransport = createNativeTransport({ ...config, provider: "context", baseUrl: "https://logos.context.dev" });
  return Object.freeze({
    /** Build a public embedding URL without fetching or storing image bytes. */
    logoUrl: contextLogoUrl,
    /** HEAD https://logos.context.dev/ — inspect public image headers without downloading the image. */
    async headLogo(input: ContextHeadLogoInput): Promise<NativeResponse<Response>> {
      if (!input || typeof input !== "object") throw new SearchError("invalid_request");
      contextLogoUrl(input.query);
      return logoTransport.request(contextOperations.headLogo,
        { ...input, query: { ...input.query } });
    },''')
 if provider=='tavily':
  code=code.replace('  apiKey: string;','''  apiKey?: string;
  /** Explicit free keyless access supports Search and Extract only. Keyed access is the default. */
  accessMode?: "keyed" | "keyless";''',1)
  code=code.replace('  const { apiKey, ...config } = options;\n  const key = credential(apiKey);','''  const { apiKey, accessMode = "keyed", ...config } = options;
  if (!["keyed", "keyless"].includes(accessMode)) throw new SearchError("configuration");
  const key = apiKey === undefined && accessMode === "keyless" ? undefined : credential(apiKey as string);''')
  code=code.replace('headers: { Authorization: `Bearer ${key}` }','headers: key === undefined ? { "X-Tavily-Access-Mode": "keyless" } : { Authorization: `Bearer ${key}` }')
  import re
  for name in re.findall(r'^    async (\w+)\(input:',code,re.M):
   if name not in ['search','extract']:
    code=re.sub(r'(^    async '+name+r'\(input:[^\n]+\n)',r'\1      if (key === undefined) throw new SearchError("configuration");\n',code,flags=re.M)
  defs='''
/** Supply a payment signature acquired by an external x402 client. This SDK never signs payments. */
export interface TavilyPaidSearchInput extends Omit<TavilySearchInput, "headers" | "body"> {
  body: Omit<TavilySearchBody, "search_depth"> & { search_depth?: "advanced" };
  headers?: { "PAYMENT-SIGNATURE"?: string } & Readonly<Record<string, string>>;
}
export interface TavilyPaymentPricingInput extends Pick<NativeRequestInput, "signal" | "timeoutMs" | "headers"> {}
'''
  code=code.replace('\nfunction credential(',defs+'\nfunction credential(')
  code=code.replace('export const tavilyOperations = Object.freeze({', '''export const tavilyOperations = Object.freeze({
  getPaymentPricing: Object.freeze({ id: "getPaymentPricing", method: "GET", path: "/.well-known/pricing", response: "raw", retryable: true }),
  paidSearch: Object.freeze({ id: "paidSearch", method: "POST", path: "/search", retryable: false }),''')
  code=code.replace('  return Object.freeze({','''  const paymentTransport = createNativeTransport({ ...config, provider: "tavily", baseUrl: "https://x402.tavily.com" });
  return Object.freeze({
    /** GET https://x402.tavily.com/.well-known/pricing — bounded raw JSON; no stable response schema is published. */
    getPaymentPricing(input: TavilyPaymentPricingInput = {}): Promise<NativeResponse<Response>> {
      return paymentTransport.request(tavilyOperations.getPaymentPricing, input);
    },
    /** POST https://x402.tavily.com/search — externally authorized payment; never retried automatically. */
    paidSearch(input: TavilyPaidSearchInput): Promise<NativeResponse<TavilySearchResponse>> {
      return paymentTransport.request<TavilySearchResponse>(tavilyOperations.paidSearch, input);
    },''')
 if provider=='tinyfish':
  defs='''
/** Research event names documented by https://docs.tinyfish.ai/research-api/reference.
 * Their data payloads have no published exhaustive schema; preserve SSE data as text.
 */
export type TinyfishResearchEventName = "created" | "session" | "plan_updated" | "sources_searched" |
  "source_fetched" | "partial_summary" | "synthesis_delta" | "synthesis_discarded" | "heartbeat" |
  "evidence_snapshot" | "final_result" | "run_stats" | "error" | "done";
'''
  code=code.replace('\nfunction credential(',defs+'\nfunction credential(')
 return code
