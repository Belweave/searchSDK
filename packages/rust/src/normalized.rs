//! Conservative normalized web-search adapters. Native endpoint clients live in `native`.
use crate::{Error, ErrorCode, Result, transport::*, types::*};
use futures_util::{StreamExt, stream};
use reqwest::header::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{collections::BTreeMap, sync::Arc, time::Duration};
use tokio::time::Instant;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderId {
    Context,
    Exa,
    Tavily,
    Brave,
    Parallel,
    Perplexity,
    Linkup,
    You,
    Firecrawl,
    Valyu,
    Tinyfish,
    Serper,
    Serpapi,
    Searxng,
}
impl ProviderId {
    pub const ALL: [Self; 14] = [
        Self::Context,
        Self::Exa,
        Self::Tavily,
        Self::Brave,
        Self::Parallel,
        Self::Perplexity,
        Self::Linkup,
        Self::You,
        Self::Firecrawl,
        Self::Valyu,
        Self::Tinyfish,
        Self::Serper,
        Self::Serpapi,
        Self::Searxng,
    ];
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Context => "context",
            Self::Exa => "exa",
            Self::Tavily => "tavily",
            Self::Brave => "brave",
            Self::Parallel => "parallel",
            Self::Perplexity => "perplexity",
            Self::Linkup => "linkup",
            Self::You => "you",
            Self::Firecrawl => "firecrawl",
            Self::Valyu => "valyu",
            Self::Tinyfish => "tinyfish",
            Self::Serper => "serper",
            Self::Serpapi => "serpapi",
            Self::Searxng => "searxng",
        }
    }
    pub fn capabilities(self) -> Capabilities {
        let (
            max_include_domains,
            max_exclude_domains,
            mutually_exclusive_domain_filters,
            max_query_length,
        ) = match self {
            Self::Context => (100, 100, false, Some(500)),
            Self::Exa => (1200, 1200, false, None),
            Self::Tavily => (300, 150, false, None),
            Self::Parallel => (200, 200, true, None),
            Self::Perplexity => (20, 20, true, None),
            Self::Linkup => (100, 50, false, None),
            Self::You => (500, 5000, true, None),
            Self::Firecrawl => (100, 100, true, Some(500)),
            Self::Valyu | Self::Tinyfish => (100, 100, false, None),
            _ => (0, 0, false, None),
        };
        Capabilities {
            domain_filters: max_include_domains > 0,
            max_include_domains,
            max_exclude_domains,
            mutually_exclusive_domain_filters,
            max_query_length,
        }
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub domain_filters: bool,
    pub max_include_domains: usize,
    pub max_exclude_domains: usize,
    pub mutually_exclusive_domain_filters: bool,
    pub max_query_length: Option<usize>,
}
impl Capabilities {
    pub fn validate(&self, r: &SearchRequest) -> Result<()> {
        if r.include_domains
            .as_ref()
            .is_some_and(|v| v.len() > self.max_include_domains)
            || r.exclude_domains
                .as_ref()
                .is_some_and(|v| v.len() > self.max_exclude_domains)
            || (r.include_domains.is_some()
                && r.exclude_domains.is_some()
                && self.mutually_exclusive_domain_filters)
            || self
                .max_query_length
                .is_some_and(|n| r.query.encode_utf16().count() > n)
        {
            Err(Error::new(ErrorCode::UnsupportedOption))
        } else {
            Ok(())
        }
    }
}
#[derive(Clone, Debug, Default)]
pub struct ValyuSettings {
    pub max_price: Option<f64>,
    pub relevance_threshold: Option<f64>,
    pub response_length: Option<Value>,
    pub fast_mode: Option<bool>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub instructions: Option<String>,
}
#[derive(Clone, Default)]
pub struct SearxngSettings {
    pub headers: BTreeMap<String, String>,
    pub language: Option<String>,
    pub safe_search: Option<u8>,
    pub time_range: Option<String>,
    pub categories: Option<Vec<String>>,
}
#[derive(Clone)]
pub struct Provider {
    id: ProviderId,
    key: String,
    core: Core,
    searx_endpoint: Option<url::Url>,
    searx: SearxngSettings,
    valyu: ValyuSettings,
}
impl Provider {
    pub fn new(id: ProviderId, api_key: impl Into<String>) -> Result<Self> {
        Self::with_transport(
            id,
            api_key,
            ClientConfig::default(),
            Arc::new(ReqwestTransport::new()?),
        )
    }
    pub fn with_transport(
        id: ProviderId,
        api_key: impl Into<String>,
        config: ClientConfig,
        transport: Arc<dyn Transport>,
    ) -> Result<Self> {
        if config.retry.max_retries != 0 {
            return Err(Error::new(ErrorCode::UnsupportedOption));
        }
        if id == ProviderId::Searxng {
            return Err(Error::new(ErrorCode::Configuration));
        }
        let key = api_key.into();
        credential(&key)?;
        Ok(Self {
            id,
            key,
            core: Core::new(config, transport)?,
            searx_endpoint: None,
            searx: SearxngSettings::default(),
            valyu: ValyuSettings::default(),
        })
    }
    pub fn searxng(base: &str, settings: SearxngSettings) -> Result<Self> {
        Self::searxng_with_transport(
            base,
            settings,
            ClientConfig::default(),
            Arc::new(ReqwestTransport::new()?),
        )
    }
    pub fn searxng_with_transport(
        base: &str,
        settings: SearxngSettings,
        config: ClientConfig,
        transport: Arc<dyn Transport>,
    ) -> Result<Self> {
        if config.retry.max_retries != 0 {
            return Err(Error::new(ErrorCode::UnsupportedOption));
        }
        let base = endpoint(base)?;
        let ep = endpoint(&format!("{}/search", base.as_str().trim_end_matches('/')))?;
        if settings.headers.len() > 32
            || settings.headers.iter().any(|(k, v)| {
                ["accept", "content-type"].contains(&k.to_ascii_lowercase().as_str())
                    || v.len() > 8192
            })
        {
            return Err(Error::new(ErrorCode::Configuration));
        }
        let mut h = HeaderMap::new();
        for (k, v) in &settings.headers {
            header(&mut h, k, v, ErrorCode::Configuration)?;
        }
        if settings.safe_search.is_some_and(|s| s > 2)
            || settings
                .time_range
                .as_deref()
                .is_some_and(|s| !["day", "month", "year"].contains(&s))
            || settings.language.as_deref().is_some_and(|s| {
                s.is_empty()
                    || s.len() > 35
                    || !s.as_bytes()[0].is_ascii_alphabetic()
                    || !s
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b"_-".contains(&b))
            })
            || settings.categories.as_ref().is_some_and(|a| {
                a.is_empty()
                    || a.len() > 20
                    || a.iter().any(|s| {
                        s.is_empty()
                            || s.len() > 64
                            || !s.as_bytes()[0].is_ascii_alphabetic()
                            || !s
                                .bytes()
                                .all(|b| b.is_ascii_alphanumeric() || b" _-".contains(&b))
                    })
            })
        {
            return Err(Error::new(ErrorCode::Configuration));
        }
        Ok(Self {
            id: ProviderId::Searxng,
            key: String::new(),
            core: Core::new(config, transport)?,
            searx_endpoint: Some(ep),
            searx: settings,
            valyu: ValyuSettings::default(),
        })
    }
    pub fn with_valyu_settings(mut self, settings: ValyuSettings) -> Result<Self> {
        let valid_date = |s: &str| {
            s.len() == 10
                && time::Date::parse(
                    s,
                    &time::format_description::parse_borrowed::<2>("[year]-[month]-[day]")
                        .expect("static format"),
                )
                .is_ok()
        };
        if self.id != ProviderId::Valyu
            || settings
                .max_price
                .is_some_and(|x| !x.is_finite() || x <= 0.0)
            || settings
                .relevance_threshold
                .is_some_and(|x| !x.is_finite() || !(0.0..=1.0).contains(&x))
            || settings.response_length.as_ref().is_some_and(|x| {
                !x.as_str()
                    .is_some_and(|s| ["short", "medium", "large", "max"].contains(&s))
                    && !x
                        .as_u64()
                        .is_some_and(|n| n > 0 && n <= 9_007_199_254_740_991)
            })
            || [&settings.start_date, &settings.end_date]
                .into_iter()
                .flatten()
                .any(|s| !valid_date(s))
            || settings
                .start_date
                .as_ref()
                .zip(settings.end_date.as_ref())
                .is_some_and(|(s, e)| s > e)
            || settings
                .instructions
                .as_ref()
                .is_some_and(|s| s.trim().is_empty() || s.encode_utf16().count() > 500)
        {
            return Err(Error::new(ErrorCode::Configuration));
        }
        self.valyu = settings;
        Ok(self)
    }
    pub fn id(&self) -> ProviderId {
        self.id
    }
    pub fn capabilities(&self) -> Capabilities {
        self.id.capabilities()
    }
    fn wire(&self, r: &SearchRequest) -> Result<HttpRequest> {
        use ProviderId::*;
        let q = &r.query;
        let limit = r.limit.unwrap_or(5);
        let mut headers = HeaderMap::new();
        let mut method = "POST";
        let (base, mut body) = match self.id {
            Context => (
                "https://api.context.dev/v1/web/search",
                json!({"query":q,"numResults":limit.max(10)}),
            ),
            Exa => (
                "https://api.exa.ai/search",
                json!({"query":q,"numResults":limit,"type":"auto","contents":{"highlights":true}}),
            ),
            Tavily => (
                "https://api.tavily.com/search",
                json!({"query":q,"max_results":limit,"search_depth":"basic","include_usage":true,"auto_parameters":false,"include_answer":false,"include_raw_content":false}),
            ),
            Brave => {
                method = "GET";
                (
                    "https://api.search.brave.com/res/v1/web/search",
                    Value::Null,
                )
            }
            Parallel => (
                "https://api.parallel.ai/v1/search",
                json!({"search_queries":[q],"mode":"basic","advanced_settings":{"max_results":limit}}),
            ),
            Perplexity => (
                "https://api.perplexity.ai/search",
                json!({"query":q,"max_results":limit,"search_type":"web"}),
            ),
            Linkup => (
                "https://api.linkup.so/v1/search",
                json!({"q":q,"depth":"fast","outputType":"searchResults","includeImages":false,"maxResults":limit}),
            ),
            You => (
                "https://ydc-index.io/v1/search",
                json!({"query":q,"count":limit}),
            ),
            Firecrawl => (
                "https://api.firecrawl.dev/v2/search",
                json!({"query":q,"limit":limit,"sources":[{"type":"web"}],"highlights":false}),
            ),
            Valyu => (
                "https://api.valyu.ai/v1/search",
                json!({"query":q,"search_type":"web","max_num_results":limit}),
            ),
            Tinyfish => {
                method = "GET";
                ("https://api.search.tinyfish.ai", Value::Null)
            }
            Serper => (
                "https://google.serper.dev/search",
                json!({"q":q,"num":limit}),
            ),
            Serpapi => {
                method = "GET";
                ("https://serpapi.com/search.json", Value::Null)
            }
            Searxng => ("https://unused.invalid", Value::Null),
        };
        let mut url = if self.id == Searxng {
            self.searx_endpoint
                .clone()
                .ok_or_else(|| Error::new(ErrorCode::Configuration))?
        } else {
            endpoint(base)?
        };
        if let Some(domains) = &r.include_domains {
            match self.id {
                Context | Exa | Linkup | Firecrawl => body["includeDomains"] = json!(domains),
                Tavily => {
                    body["include_domains"] = json!(domains);
                    body["include_domains_mode"] = json!("restrict");
                }
                Parallel => {
                    body["advanced_settings"]["source_policy"] = json!({"include_domains":domains})
                }
                Perplexity => body["search_domain_filter"] = json!(domains),
                You => body["include_domains"] = json!(domains),
                Valyu => body["included_sources"] = json!(domains),
                Tinyfish => {
                    url.query_pairs_mut()
                        .append_pair("include_domains", &domains.join(","));
                }
                _ => return Err(Error::new(ErrorCode::UnsupportedOption)),
            }
        }
        if let Some(domains) = &r.exclude_domains {
            match self.id {
                Context | Exa | Linkup | Firecrawl => body["excludeDomains"] = json!(domains),
                Tavily | You => body["exclude_domains"] = json!(domains),
                Parallel => {
                    body["advanced_settings"]["source_policy"] = json!({"exclude_domains":domains})
                }
                Perplexity => {
                    body["search_domain_filter"] =
                        json!(domains.iter().map(|d| format!("-{d}")).collect::<Vec<_>>())
                }
                Valyu => body["excluded_sources"] = json!(domains),
                Tinyfish => {
                    url.query_pairs_mut()
                        .append_pair("exclude_domains", &domains.join(","));
                }
                _ => return Err(Error::new(ErrorCode::UnsupportedOption)),
            }
        }
        let auth = match self.id {
            Context | Tavily | Perplexity | Linkup | Firecrawl => {
                Some(("authorization", format!("Bearer {}", self.key)))
            }
            Exa | Parallel | You | Valyu | Tinyfish | Serper => {
                Some(("x-api-key", self.key.clone()))
            }
            Brave => Some(("x-subscription-token", self.key.clone())),
            _ => None,
        };
        if let Some((k, v)) = auth {
            header(&mut headers, k, &v, ErrorCode::Configuration)?;
        }
        let raw = match self.id {
            Brave => {
                url.query_pairs_mut()
                    .append_pair("q", q)
                    .append_pair("count", &limit.to_string())
                    .append_pair("extra_snippets", "true");
                header(
                    &mut headers,
                    "accept",
                    "application/json",
                    ErrorCode::Configuration,
                )?;
                RequestBody::Empty
            }
            Tinyfish => {
                url.query_pairs_mut()
                    .append_pair("query", q)
                    .append_pair("domain_type", "web")
                    .append_pair("page", "0");
                header(
                    &mut headers,
                    "accept",
                    "application/json",
                    ErrorCode::Configuration,
                )?;
                RequestBody::Empty
            }
            Serpapi => {
                url.query_pairs_mut()
                    .append_pair("engine", "google")
                    .append_pair("q", q)
                    .append_pair("api_key", &self.key);
                header(
                    &mut headers,
                    "accept",
                    "application/json",
                    ErrorCode::Configuration,
                )?;
                RequestBody::Empty
            }
            Searxng => {
                for (k, v) in &self.searx.headers {
                    header(&mut headers, k, v, ErrorCode::Configuration)?;
                }
                header(
                    &mut headers,
                    "accept",
                    "application/json",
                    ErrorCode::Configuration,
                )?;
                header(
                    &mut headers,
                    "content-type",
                    "application/x-www-form-urlencoded",
                    ErrorCode::Configuration,
                )?;
                let mut form = url::form_urlencoded::Serializer::new(String::new());
                form.append_pair("format", "json")
                    .append_pair("pageno", "1")
                    .append_pair(
                        "categories",
                        &self
                            .searx
                            .categories
                            .clone()
                            .unwrap_or_else(|| vec!["general".into()])
                            .join(","),
                    )
                    .append_pair("q", q);
                if let Some(s) = &self.searx.language {
                    form.append_pair("language", s);
                }
                if let Some(s) = self.searx.safe_search {
                    form.append_pair("safesearch", &s.to_string());
                }
                if let Some(s) = &self.searx.time_range {
                    form.append_pair("time_range", s);
                }
                RequestBody::Bytes(form.finish().into_bytes())
            }
            _ => {
                if self.id == Valyu {
                    for (k, v) in [
                        ("max_price", json!(self.valyu.max_price)),
                        ("relevance_threshold", json!(self.valyu.relevance_threshold)),
                        ("response_length", json!(self.valyu.response_length)),
                        ("fast_mode", json!(self.valyu.fast_mode)),
                        ("start_date", json!(self.valyu.start_date)),
                        ("end_date", json!(self.valyu.end_date)),
                        ("instructions", json!(self.valyu.instructions)),
                    ] {
                        if !v.is_null() {
                            body[k] = v;
                        }
                    }
                    header(
                        &mut headers,
                        "accept",
                        "application/json",
                        ErrorCode::Configuration,
                    )?;
                }
                header(
                    &mut headers,
                    "content-type",
                    "application/json",
                    ErrorCode::Configuration,
                )?;
                RequestBody::Bytes(
                    serde_json::to_vec(&body).map_err(|_| Error::new(ErrorCode::InvalidRequest))?,
                )
            }
        };
        Ok(HttpRequest {
            method: method.into(),
            url,
            headers,
            body: raw,
        })
    }
    async fn raw(&self, request: &SearchRequest, scope: &Scope) -> Result<Value> {
        let _permit = self.core.acquire(scope).await?;
        let response = self.core.send(self.wire(request)?, scope).await?;
        if !(200..300).contains(&response.status) {
            return Err(status_error(response.status, &response.headers));
        }
        let raw = self.core.read(response, scope).await?;
        let v = serde_json::from_slice(&raw.bytes)
            .map_err(|_| Error::new(ErrorCode::InvalidResponse))?;
        scope.check()?;
        Ok(v)
    }
    pub async fn search_raw(&self, request: SearchRequest, options: CallOptions) -> Result<Value> {
        let scope = Scope::new(self.core.config.timeout, &options)?;
        let r = request.validated()?;
        self.capabilities().validate(&r)?;
        let v = self.raw(&r, &scope).await?;
        normalize(self.id, &v, &now())?;
        scope.check()?;
        Ok(v)
    }
}
fn object(v: &Value) -> Result<&serde_json::Map<String, Value>> {
    v.as_object()
        .ok_or_else(|| Error::new(ErrorCode::InvalidResponse))
}
fn string(v: Option<&Value>) -> Result<Option<String>> {
    match v {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(s)) => Ok(Some(s.clone())),
        _ => Err(Error::new(ErrorCode::InvalidResponse)),
    }
}
fn number(v: Option<&Value>) -> Result<Option<f64>> {
    match v {
        None | Some(Value::Null) => Ok(None),
        Some(n) => n
            .as_f64()
            .filter(|x| x.is_finite())
            .map(Some)
            .ok_or_else(|| Error::new(ErrorCode::InvalidResponse)),
    }
}
fn strings(v: Option<&Value>) -> Result<Option<Vec<String>>> {
    match v {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Array(a)) => a
            .iter()
            .map(|x| {
                x.as_str()
                    .map(str::to_owned)
                    .ok_or_else(|| Error::new(ErrorCode::InvalidResponse))
            })
            .collect::<Result<Vec<_>>>()
            .map(Some),
        _ => Err(Error::new(ErrorCode::InvalidResponse)),
    }
}
fn usage(v: Option<&Value>, field: &str, unit: UsageUnit) -> Result<Option<SearchUsage>> {
    match v {
        None | Some(Value::Null) => Ok(None),
        Some(v) => {
            let amount = number(object(v)?.get(field))?;
            if amount.is_some_and(|n| n < 0.0) {
                return Err(Error::new(ErrorCode::InvalidResponse));
            }
            Ok(amount.map(|value| SearchUsage { unit, value }))
        }
    }
}
/// Used by the adapter and deterministic contract checks; caller supplies retrieval time.
pub fn normalize(id: ProviderId, v: &Value, retrieved_at: &str) -> Result<SearchResponse> {
    use ProviderId::*;
    let b = object(v)?;
    let invalid = || Error::new(ErrorCode::InvalidResponse);
    let provider_error = || Error::new(ErrorCode::ProviderError);
    let mut warnings = Vec::new();
    let mut u = None;
    let rid = match id {
        Context | Tavily => b.get("request_id"),
        Exa => b.get("requestId"),
        Parallel => b.get("search_id"),
        Perplexity | Firecrawl => b.get("id"),
        Valyu => b.get("tx_id"),
        You => match b.get("metadata") {
            None => None,
            Some(x) => object(x)?.get("search_uuid"),
        },
        Serpapi => object(b.get("search_metadata").ok_or_else(invalid)?)?.get("id"),
        _ => None,
    };
    let request_id = string(rid)?;
    if request_id.as_deref().is_some_and(|s| !valid_request_id(s)) {
        return Err(invalid());
    }
    let warn = match id {
        Context => {
            if b.get("partial").is_some_and(|x| !x.is_boolean()) {
                return Err(invalid());
            }
            u = usage(
                b.get("key_metadata"),
                "credits_consumed",
                UsageUnit::Credits,
            )?;
            b.get("partial") == Some(&Value::Bool(true))
        }
        Exa => {
            u = usage(b.get("costDollars"), "total", UsageUnit::Usd)?;
            ["warnings", "notices"].iter().any(|k| {
                b.get(*k)
                    .and_then(Value::as_array)
                    .is_some_and(|x| !x.is_empty())
            })
        }
        Tavily => {
            u = usage(b.get("usage"), "credits", UsageUnit::Credits)?;
            false
        }
        Parallel => {
            let w = b.get("warnings");
            if w.is_some_and(|x| !x.is_null() && !x.is_array()) {
                return Err(invalid());
            }
            w.and_then(Value::as_array).is_some_and(|x| !x.is_empty())
        }
        Firecrawl => {
            if b.get("success") != Some(&Value::Bool(true)) {
                return Err(if b.get("success") == Some(&Value::Bool(false)) {
                    provider_error()
                } else {
                    invalid()
                });
            }
            let n = number(b.get("creditsUsed"))?;
            if n.is_some_and(|x| x < 0.0 || x.fract() != 0.0) {
                return Err(invalid());
            }
            u = n.map(|value| SearchUsage {
                unit: UsageUnit::Credits,
                value,
            });
            string(b.get("warning"))?.is_some_and(|x| !x.is_empty())
        }
        Valyu => {
            if b.get("success") != Some(&Value::Bool(true)) {
                return Err(if b.get("success") == Some(&Value::Bool(false)) {
                    provider_error()
                } else {
                    invalid()
                });
            }
            u = usage(Some(v), "total_deduction_dollars", UsageUnit::Usd)?;
            let e = string(b.get("error"))?;
            let w = strings(b.get("warnings"))?;
            e.is_some_and(|x| !x.is_empty()) || w.is_some_and(|x| !x.is_empty())
        }
        Serper => {
            if b.contains_key("error") || (b.contains_key("message") && !b.contains_key("organic"))
            {
                return Err(provider_error());
            }
            u = usage(Some(v), "credits", UsageUnit::Credits)?;
            false
        }
        Searxng => {
            if b.contains_key("error") {
                return Err(provider_error());
            }
            if b.get("unresponsive_engines").is_some_and(|x| !x.is_array()) {
                return Err(invalid());
            }
            b.get("unresponsive_engines")
                .and_then(Value::as_array)
                .is_some_and(|x| !x.is_empty())
        }
        _ => false,
    };
    if warn {
        warnings.push(SearchWarning {
            code: WarningCode::ProviderWarning,
            provider: id.as_str().into(),
        });
    }
    let rows = match id {
        Brave => match b.get("web") {
            Some(w) => object(w)?.get("results").ok_or_else(invalid)?,
            None => {
                if !b
                    .get("query")
                    .and_then(|x| x.get("original"))
                    .is_some_and(Value::is_string)
                {
                    return Err(invalid());
                }
                &Value::Null
            }
        },
        You => {
            let s = object(b.get("results").ok_or_else(invalid)?)?;
            match s.get("web") {
                Some(w) => w,
                None => {
                    if !s.get("news").is_some_and(Value::is_array) {
                        return Err(invalid());
                    }
                    &Value::Null
                }
            }
        }
        Firecrawl => object(b.get("data").ok_or_else(invalid)?)?
            .get("web")
            .ok_or_else(invalid)?,
        Serper => b.get("organic").ok_or_else(invalid)?,
        Serpapi => {
            let m = object(b.get("search_metadata").ok_or_else(invalid)?)?;
            let empty = m.get("status").and_then(Value::as_str) == Some("Success")
                && b.get("error").and_then(Value::as_str)
                    == Some("Google hasn't returned any results for this query.")
                && b.get("search_information")
                    .and_then(|x| x.get("total_results"))
                    .and_then(Value::as_f64)
                    == Some(0.0)
                && b.get("search_information")
                    .and_then(|x| x.get("organic_results_state"))
                    .and_then(Value::as_str)
                    == Some("Fully empty")
                && b.get("organic_results")
                    .is_none_or(|x| x.as_array().is_some_and(Vec::is_empty));
            if (b.contains_key("error") && !empty)
                || m.get("status").and_then(Value::as_str) == Some("Error")
            {
                return Err(provider_error());
            }
            if m.get("status").and_then(Value::as_str) != Some("Success") {
                return Err(invalid());
            }
            if empty {
                &Value::Null
            } else {
                b.get("organic_results").ok_or_else(invalid)?
            }
        }
        _ => b.get("results").ok_or_else(invalid)?,
    };
    let empty = Vec::new();
    let rows = if rows.is_null() && (id == Brave || id == You || id == Serpapi) {
        &empty
    } else {
        rows.as_array().ok_or_else(invalid)?
    };
    let mut results = Vec::new();
    for v in rows {
        let row = object(v)?;
        if id == Linkup && row.get("type").is_some_and(|t| t.as_str() != Some("text")) {
            return Err(invalid());
        }
        let url = string(row.get(if id == Serper || id == Serpapi {
            "link"
        } else {
            "url"
        }))?
        .ok_or_else(invalid)?;
        if !result_url(&url) {
            return Err(invalid());
        }
        let title = string(row.get(if id == Linkup { "name" } else { "title" }))?;
        let snippet_field = match id {
            Context | Brave | You | Firecrawl => "description",
            Tavily | Linkup | Valyu | Searxng => "content",
            _ => "snippet",
        };
        let mut snippet = if id == Exa || id == Parallel {
            None
        } else {
            string(row.get(snippet_field))?
        };
        if id == You {
            let snippets = strings(row.get("snippets"))?;
            if snippet.is_none() {
                snippet = snippets.map(|s| s.join("\n"));
            }
        }
        let highlights = match id {
            Exa => strings(row.get("highlights"))?,
            Brave => strings(row.get("extra_snippets"))?,
            Parallel => strings(row.get("excerpts"))?,
            _ => None,
        };
        let score = match id {
            Exa | Tavily | Searxng => number(row.get("score"))?,
            Valyu => number(row.get("relevance_score"))?,
            _ => None,
        };
        results.push(SearchResult {
            url: url.clone(),
            title,
            snippet,
            highlights,
            score,
            provenance: Provenance {
                provider: id.as_str().into(),
                source_url: url,
                retrieved_at: retrieved_at.into(),
                request_id: request_id.clone(),
            },
        });
    }
    let r = SearchResponse {
        provider: id.as_str().into(),
        results,
        usage: u,
        warnings,
        attempts: Vec::new(),
        reuse: None,
    };
    r.validate()?;
    Ok(r)
}
#[derive(Clone)]
pub struct SearchClient {
    providers: Vec<Provider>,
    config: ClientConfig,
    attempt_timeout: Duration,
    semaphore: Arc<tokio::sync::Semaphore>,
}
impl SearchClient {
    pub fn new(provider: Provider) -> Result<Self> {
        Self::with_fallback(provider, Vec::new(), ClientConfig::default(), None)
    }
    pub fn with_fallback(
        provider: Provider,
        fallback: Vec<Provider>,
        config: ClientConfig,
        attempt_timeout: Option<Duration>,
    ) -> Result<Self> {
        config.validate()?;
        let attempt_timeout = attempt_timeout.unwrap_or(config.timeout);
        if attempt_timeout.is_zero() || attempt_timeout > Duration::from_secs(86400) {
            return Err(Error::new(ErrorCode::Configuration));
        }
        let mut providers = vec![provider];
        providers[0].core.config.max_response_bytes = providers[0]
            .core
            .config
            .max_response_bytes
            .min(config.max_response_bytes);
        for p in fallback {
            if providers.iter().any(|v| v.id == p.id) {
                return Err(Error::new(ErrorCode::Configuration));
            }
            let mut p = p;
            p.core.config.max_response_bytes = p
                .core
                .config
                .max_response_bytes
                .min(config.max_response_bytes);
            providers.push(p);
        }
        Ok(Self {
            providers,
            semaphore: Arc::new(tokio::sync::Semaphore::new(config.max_concurrency)),
            config,
            attempt_timeout,
        })
    }
    pub async fn search(
        &self,
        request: SearchRequest,
        options: CallOptions,
    ) -> Result<SearchResponse> {
        let scope = Scope::new(self.config.timeout, &options)?;
        self.execute(request, &scope).await
    }
    async fn execute(&self, request: SearchRequest, scope: &Scope) -> Result<SearchResponse> {
        let request = request.validated()?;
        for p in &self.providers {
            p.capabilities().validate(&request)?;
        }
        scope.check()?;
        let _permit = scope
            .run(async {
                self.semaphore
                    .clone()
                    .acquire_owned()
                    .await
                    .map_err(|_| Error::new(ErrorCode::Unavailable))
            })
            .await?;
        let mut attempts = Vec::new();
        let run = async {
            for (index, p) in self.providers.iter().enumerate() {
                for retry in 0..=self.config.retry.max_retries {
                    scope.check()?;
                    let start = Instant::now();
                    let started_at = now();
                    let deadline = (start + self.attempt_timeout).min(scope.deadline);
                    let attempt = Scope {
                        deadline,
                        cancel: scope.cancel.clone(),
                        code: if deadline == scope.deadline {
                            ErrorCode::Timeout
                        } else {
                            ErrorCode::AttemptTimeout
                        },
                    };
                    let outcome = attempt
                        .run(async {
                            let v = p.raw(&request, &attempt).await?;
                            let mut r = normalize(p.id, &v, &now())?;
                            r.results.truncate(request.limit.unwrap_or(5) as usize);
                            attempt.check()?;
                            Ok(r)
                        })
                        .await;
                    let code = outcome.as_ref().err().map(|e| e.code);
                    attempts.push(SearchAttempt {
                        provider: p.id.as_str().into(),
                        started_at,
                        duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                        outcome: if outcome.is_ok() {
                            AttemptOutcome::Success
                        } else {
                            AttemptOutcome::Error
                        },
                        code,
                        status: outcome.as_ref().err().and_then(|e| e.status),
                        retry_after_ms: outcome.as_ref().err().and_then(|e| e.retry_after_ms),
                    });
                    match outcome {
                        Ok(mut r) => {
                            if index > 0 {
                                r.warnings.push(SearchWarning {
                                    code: WarningCode::FallbackUsed,
                                    provider: p.id.as_str().into(),
                                });
                            }
                            r.attempts = attempts.clone();
                            return Ok(r);
                        }
                        Err(e) => {
                            if !e.code.transient() {
                                return Err(e);
                            }
                            if retry < self.config.retry.max_retries {
                                scope
                                    .run(async {
                                        tokio::time::sleep(
                                            self.config.retry.delay(retry, e.retry_after_ms),
                                        )
                                        .await;
                                        Ok(())
                                    })
                                    .await?;
                                continue;
                            }
                            if index == self.providers.len() - 1 {
                                return Err(e);
                            }
                            break;
                        }
                    }
                }
            }
            Err(Error::new(ErrorCode::Configuration))
        }
        .await;
        run.map_err(|mut e| {
            if let Err(stop) = scope.check() {
                e.code = stop.code;
            }
            e.attempts = attempts;
            e
        })
    }
    /// Ordered per-item results, 0–1000 inputs, 1–64 workers; queued time counts.
    pub async fn search_batch(
        &self,
        requests: Vec<SearchRequest>,
        concurrency: usize,
        options: CallOptions,
    ) -> Result<Vec<Result<SearchResponse>>> {
        if requests.len() > 1000 || !(1..=64).contains(&concurrency) {
            return Err(Error::new(ErrorCode::InvalidRequest));
        }
        let scope = Scope::new(self.config.timeout, &options)?;
        let outcomes = stream::iter(requests.into_iter().map(|r| {
            let scope = &scope;
            async move {
                scope.check()?;
                let result = self.execute(r, scope).await;
                if let Err(mut stopped) = scope.check() {
                    if let Err(error) = &result {
                        stopped.attempts = error.attempts.clone();
                    }
                    return Err(stopped);
                }
                result
            }
        }))
        .buffered(concurrency)
        .collect()
        .await;
        Ok(outcomes)
    }
}
