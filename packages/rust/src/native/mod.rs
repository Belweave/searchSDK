//! Named provider-native operations generated from retained public schemas.
//! Native JSON types are schema-derived wire shapes, not full JSON Schema validators.
use crate::{Error, ErrorCode, Result, transport::*};
use bytes::Bytes;
use futures_util::StreamExt;
use reqwest::header::HeaderMap;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;
use std::{
    collections::{BTreeMap, VecDeque},
    sync::Arc,
};
use tokio::{
    sync::{OwnedSemaphorePermit, mpsc},
    time::Instant,
};
include!("generated.rs");

#[derive(Clone, Copy, Debug)]
pub struct Operation {
    pub provider: &'static str,
    pub name: &'static str,
    pub base: &'static str,
    pub path: &'static str,
    pub method: &'static str,
    pub retryable: bool,
    pub stream_field: bool,
    pub stream_value: bool,
    pub headers: &'static [(&'static str, &'static str)],
    pub comma: &'static [&'static str],
    pub required_headers: &'static [&'static str],
    pub body_required: bool,
    pub raw_required: bool,
    pub multipart: bool,
    pub query_required: bool,
}
/// Raw and multipart bodies are never formatted by SDK Debug/error implementations.
#[derive(Clone, Default)]
pub enum RawBody {
    #[default]
    Empty,
    Bytes(Vec<u8>),
    Multipart(Vec<MultipartPart>),
}
#[derive(Default)]
struct NativeInput {
    path: Value,
    query: Value,
    body: Option<Value>,
    raw_body: Option<RawBody>,
    headers: BTreeMap<String, String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAttempt {
    pub attempt: u8,
    pub duration_ms: f64,
    pub outcome: String,
    pub status: Option<u16>,
    pub code: Option<ErrorCode>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMetadata {
    pub provider: String,
    pub operation: String,
    pub status: u16,
    pub request_id: Option<String>,
    pub attempts: Vec<NativeAttempt>,
}
pub struct NativeResponse<T> {
    pub data: T,
    pub metadata: NativeMetadata,
}
#[derive(Clone)]
struct NativeClient {
    provider: &'static str,
    key: String,
    team_key: Option<String>,
    core: Core,
}
impl NativeClient {
    fn new(provider: &'static str, key: impl Into<String>) -> Result<Self> {
        Self::with_transport(
            provider,
            key,
            ClientConfig::default(),
            Arc::new(ReqwestTransport::new()?),
        )
    }
    fn with_transport(
        provider: &'static str,
        key: impl Into<String>,
        config: ClientConfig,
        transport: Arc<dyn Transport>,
    ) -> Result<Self> {
        let key = key.into();
        credential(&key)?;
        Ok(Self {
            provider,
            key,
            team_key: None,
            core: Core::new(config, transport)?,
        })
    }
    fn keyless(config: ClientConfig, transport: Arc<dyn Transport>) -> Result<Self> {
        Ok(Self {
            provider: "tavily",
            key: String::new(),
            team_key: None,
            core: Core::new(config, transport)?,
        })
    }
    fn with_team_api_key(mut self, key: impl Into<String>) -> Result<Self> {
        if self.provider != "exa" {
            return Err(Error::new(ErrorCode::UnsupportedOption));
        }
        let key = key.into();
        credential(&key)?;
        self.team_key = Some(key);
        Ok(self)
    }
    fn logo_url(&self, index: &usize, input: NativeInput) -> Result<String> {
        let op = &context::OPERATIONS[*index];
        Ok(self.wire(op, &input)?.url.into())
    }
    fn wire(&self, op: &Operation, input: &NativeInput) -> Result<HttpRequest> {
        if op.provider != self.provider {
            return Err(Error::new(ErrorCode::Configuration));
        }
        let invalid = || Error::new(ErrorCode::InvalidRequest);
        if op.body_required && input.body.is_none() && input.raw_body.is_none()
            || op.raw_required && input.raw_body.is_none()
            || op.query_required && input.query.is_null()
            || input.body.is_some() && input.raw_body.is_some()
        {
            return Err(invalid());
        }
        let mut path = op.path.to_owned();
        let mut names = Vec::new();
        while let Some(start) = path.find('{') {
            let end = path[start..]
                .find('}')
                .map(|x| x + start)
                .ok_or_else(invalid)?;
            let key = path[start + 1..end].to_owned();
            let v = input.path.get(&key).ok_or_else(invalid)?;
            let value = scalar(v)?;
            if value.is_empty() || value == "." || value == ".." {
                return Err(invalid());
            }
            let encoded = url::form_urlencoded::byte_serialize(value.as_bytes())
                .collect::<String>()
                .replace('+', "%20");
            path.replace_range(start..=end, &encoded);
            names.push(key);
        }
        if input
            .path
            .as_object()
            .is_some_and(|m| m.keys().any(|k| !names.contains(k)))
            || path.contains('}')
        {
            return Err(invalid());
        }
        let base = endpoint(op.base)?;
        let mut url = endpoint(&format!("{}{}", base.as_str().trim_end_matches('/'), path))?;
        if url.origin() != base.origin() {
            return Err(invalid());
        }
        if !input.query.is_null() {
            let query = input.query.as_object().ok_or_else(invalid)?;
            if query
                .keys()
                .any(|k| ["api_key", "apiKey", "authorization", "output"].contains(&k.as_str()))
            {
                return Err(invalid());
            }
            if self.provider == "serpapi"
                && query.get("async") == Some(&Value::Bool(true))
                && query.get("no_cache") == Some(&Value::Bool(true))
            {
                return Err(invalid());
            }
            for (key, value) in query {
                append_query(&mut url, key, value, op.comma.contains(&key.as_str()))?;
            }
        }
        if self.provider == "serpapi" {
            if [
                "search",
                "searchHtml",
                "searchMarkdown",
                "searchPixelPositions",
            ]
            .contains(&op.name)
                && url
                    .query_pairs()
                    .find(|(k, _)| k == "engine")
                    .is_none_or(|(_, v)| v.trim().is_empty())
            {
                return Err(invalid());
            }
            if op.name == "google" {
                if input
                    .query
                    .get("q")
                    .and_then(Value::as_str)
                    .is_none_or(|q| q.trim().is_empty())
                {
                    return Err(invalid());
                }
                url.query_pairs_mut().append_pair("engine", "google");
            }
            if ["extract", "extractMarkdown"].contains(&op.name) {
                if input
                    .query
                    .get("url")
                    .and_then(Value::as_str)
                    .is_none_or(str::is_empty)
                {
                    return Err(invalid());
                }
                url.query_pairs_mut().append_pair("engine", "extract");
            }
            if !["locations", "uploadImage"].contains(&op.name) {
                url.query_pairs_mut().append_pair("api_key", &self.key);
            }
        }
        if self.provider == "serper" && op.method == "GET" {
            url.query_pairs_mut().append_pair("apiKey", &self.key);
        }
        if self.provider == "context" && op.base == "https://logos.context.dev" {
            if input.query.as_object().is_some_and(|q| {
                q.keys()
                    .any(|k| !["publicClientId", "domain", "theme", "type"].contains(&k.as_str()))
            }) {
                return Err(invalid());
            }
            for k in ["publicClientId", "domain"] {
                if input
                    .query
                    .get(k)
                    .and_then(Value::as_str)
                    .is_none_or(|s| s.trim().is_empty())
                {
                    return Err(invalid());
                }
            }
            if input
                .query
                .get("theme")
                .is_some_and(|v| !v.is_null() && !matches!(v.as_str(), Some("light" | "dark")))
                || input.query.get("type").is_some_and(|v| {
                    !v.is_null() && !matches!(v.as_str(), Some("icon" | "wordmark"))
                })
            {
                return Err(invalid());
            }
        }
        let mut headers = HeaderMap::new();
        let public = op.base == "https://logos.context.dev" || op.base == "https://x402.tavily.com";
        if !public && self.provider != "serpapi" {
            let key = if op.base.contains("admin-api.exa.ai") {
                self.team_key
                    .as_deref()
                    .ok_or_else(|| Error::new(ErrorCode::Configuration))?
            } else {
                &self.key
            };
            if self.provider == "tavily" && key.is_empty() {
                if !["search", "extract"].contains(&op.name) {
                    return Err(Error::new(ErrorCode::Configuration));
                }
                header(
                    &mut headers,
                    "X-Tavily-Access-Mode",
                    "keyless",
                    ErrorCode::Configuration,
                )?;
            } else {
                let (k, v) = match self.provider {
                    "context" | "tavily" | "perplexity" | "linkup" | "firecrawl" => {
                        ("authorization", format!("Bearer {key}"))
                    }
                    "brave" => ("x-subscription-token", key.into()),
                    _ => ("x-api-key", key.into()),
                };
                header(&mut headers, k, &v, ErrorCode::Configuration)?;
            }
        }
        for (key, value) in &input.headers {
            if [
                "authorization",
                "x-api-key",
                "x-subscription-token",
                "x-tavily-access-mode",
            ]
            .contains(&key.to_ascii_lowercase().as_str())
                || op.headers.iter().any(|(k, _)| k.eq_ignore_ascii_case(key))
                || headers.contains_key(key)
            {
                return Err(invalid());
            }
            header(&mut headers, key, value, ErrorCode::InvalidRequest)?;
        }
        for (k, v) in op.headers {
            header(&mut headers, k, v, ErrorCode::Configuration)?;
        }
        if op
            .required_headers
            .iter()
            .any(|k| !headers.contains_key(*k))
        {
            return Err(invalid());
        }
        let mut body = input.body.clone();
        if self.provider == "tavily"
            && op.name == "paidSearch"
            && body
                .as_ref()
                .and_then(|b| b.get("search_depth"))
                .is_some_and(|d| !d.is_null() && d.as_str() != Some("advanced"))
        {
            return Err(Error::new(ErrorCode::UnsupportedOption));
        }

        if op.stream_field {
            if let Some(v) = body.as_mut() {
                let m = v.as_object_mut().ok_or_else(invalid)?;
                if m.get("stream")
                    .is_some_and(|s| s != &Value::Bool(op.stream_value))
                {
                    return Err(Error::new(ErrorCode::UnsupportedOption));
                }
                m.insert("stream".into(), Value::Bool(op.stream_value));
            }
            if self.provider == "exa"
                && op.name == "searchStream"
                && body
                    .as_ref()
                    .and_then(|v| v.get("outputSchema"))
                    .is_none_or(Value::is_null)
            {
                return Err(invalid());
            }
        }
        if op.raw_required && op.multipart != matches!(input.raw_body, Some(RawBody::Multipart(_)))
        {
            return Err(invalid());
        }
        let raw = match (&body, &input.raw_body) {
            (Some(v), None) => {
                if !headers.contains_key("content-type") {
                    header(
                        &mut headers,
                        "content-type",
                        "application/json",
                        ErrorCode::InvalidRequest,
                    )?;
                }
                RequestBody::Bytes(serde_json::to_vec(v).map_err(|_| invalid())?)
            }
            (None, Some(RawBody::Bytes(b))) => RequestBody::Bytes(b.clone()),
            (None, Some(RawBody::Multipart(parts))) => {
                if headers.contains_key("content-type") {
                    return Err(invalid());
                }
                let mut parts = parts.clone();
                if self.provider == "serpapi" {
                    if !parts.iter().any(|p| p.name == "image")
                        || parts.iter().any(|p| p.name == "api_key")
                    {
                        return Err(invalid());
                    }
                    parts.push(MultipartPart {
                        name: "api_key".into(),
                        bytes: self.key.as_bytes().to_vec(),
                        filename: None,
                        content_type: None,
                    });
                }
                RequestBody::Multipart(parts)
            }
            (None, None) => RequestBody::Empty,
            _ => return Err(invalid()),
        };
        Ok(HttpRequest {
            method: op.method.into(),
            url,
            headers,
            body: raw,
        })
    }
    async fn open(
        &self,
        op: &Operation,
        input: &NativeInput,
        scope: &Scope,
    ) -> Result<(HttpResponse, NativeMetadata, OwnedSemaphorePermit)> {
        let _ = self.wire(op, input)?;
        scope.check()?;
        let permit = self.core.acquire(scope).await?;
        let mut attempts = Vec::new();
        for retry in 0..=self.core.config.retry.max_retries {
            let start = Instant::now();
            let outcome = self
                .core
                .send(self.wire(op, input)?, scope)
                .await
                .and_then(|r| {
                    if (200..300).contains(&r.status) {
                        Ok(r)
                    } else {
                        Err(status_error(r.status, &r.headers))
                    }
                });
            attempts.push(NativeAttempt {
                attempt: retry + 1,
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                outcome: if outcome.is_ok() { "success" } else { "error" }.into(),
                status: outcome
                    .as_ref()
                    .map(|r| r.status)
                    .ok()
                    .or_else(|| outcome.as_ref().err().and_then(|e| e.status)),
                code: outcome.as_ref().err().map(|e| e.code),
            });
            match outcome {
                Ok(r) => {
                    let request_id = [
                        "x-request-id",
                        "request-id",
                        "x-amzn-requestid",
                        "x-search-id",
                    ]
                    .iter()
                    .find_map(|k| {
                        r.headers
                            .get(*k)
                            .and_then(|v| v.to_str().ok())
                            .filter(|s| crate::types::valid_request_id(s))
                            .map(str::to_owned)
                    });
                    let metadata = NativeMetadata {
                        provider: self.provider.into(),
                        operation: op.name.into(),
                        status: r.status,
                        request_id,
                        attempts,
                    };
                    return Ok((r, metadata, permit));
                }
                Err(e) => {
                    if !op.retryable
                        || !e.code.transient()
                        || retry == self.core.config.retry.max_retries
                    {
                        return Err(e);
                    }
                    scope
                        .run(async {
                            tokio::time::sleep(
                                self.core.config.retry.delay(retry, e.retry_after_ms),
                            )
                            .await;
                            Ok(())
                        })
                        .await?;
                }
            }
        }
        Err(Error::new(ErrorCode::Configuration))
    }
    async fn raw(
        &self,
        op: &Operation,
        input: NativeInput,
        options: CallOptions,
    ) -> Result<NativeResponse<BoundedResponse>> {
        let scope = Scope::new(self.core.config.timeout, &options)?;
        let (mut r, metadata, _permit) = self.open(op, &input, &scope).await?;
        // A HEAD Content-Length describes the resource, not a downloaded body.
        let advertised = if op.method == "HEAD" {
            r.headers.remove("content-length")
        } else {
            None
        };
        let mut data = self.core.read(r, &scope).await?;
        if let Some(length) = advertised {
            data.headers.insert("content-length", length);
        }
        Ok(NativeResponse { data, metadata })
    }
    async fn json<T: DeserializeOwned>(
        &self,
        op: &Operation,
        input: NativeInput,
        options: CallOptions,
    ) -> Result<NativeResponse<T>> {
        let scope = Scope::new(self.core.config.timeout, &options)?;
        let (r, metadata, _permit) = self.open(op, &input, &scope).await?;
        let raw = self.core.read(r, &scope).await?;
        let decoded = serde_json::from_slice(&raw.bytes);
        scope.check()?;
        let data = decoded.map_err(|_| Error::new(ErrorCode::InvalidResponse))?;
        Ok(NativeResponse { data, metadata })
    }
    async fn bytes(
        &self,
        op: &Operation,
        input: NativeInput,
        options: CallOptions,
    ) -> Result<NativeResponse<Vec<u8>>> {
        let r = self.raw(op, input, options).await?;
        Ok(NativeResponse {
            data: r.data.bytes,
            metadata: r.metadata,
        })
    }
    async fn text(
        &self,
        op: &Operation,
        input: NativeInput,
        options: CallOptions,
    ) -> Result<NativeResponse<String>> {
        let scope = Scope::new(self.core.config.timeout, &options)?;
        let (r, metadata, _permit) = self.open(op, &input, &scope).await?;
        let raw = self.core.read(r, &scope).await?;
        let decoded = String::from_utf8(raw.bytes);
        scope.check()?;
        let data = decoded.map_err(|_| Error::new(ErrorCode::InvalidResponse))?;
        Ok(NativeResponse { data, metadata })
    }
    async fn empty(
        &self,
        op: &Operation,
        input: NativeInput,
        options: CallOptions,
    ) -> Result<NativeResponse<()>> {
        let r = self.bytes(op, input, options).await?;
        if !r.data.is_empty() {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        Ok(NativeResponse {
            data: (),
            metadata: r.metadata,
        })
    }
    async fn sse(
        &self,
        op: &Operation,
        input: NativeInput,
        options: CallOptions,
    ) -> Result<NativeResponse<SseStream>> {
        let scope = Scope::new(self.core.config.timeout, &options)?;
        let (r, metadata, permit) = self.open(op, &input, &scope).await?;
        if r.headers
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .is_none_or(|s| {
                !s.split(';')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .eq_ignore_ascii_case("text/event-stream")
            })
        {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        let maximum = self.core.config.max_response_bytes;
        let (sender, receiver) = mpsc::channel(1);
        let stop = CancellationToken::new();
        let driver_stop = stop.clone();
        let driver_scope = scope.clone();
        // The driver owns the socket and permit so the deadline closes even an
        // idle, unpolled stream. A single queued chunk bounds prefetch.
        let driver = tokio::spawn(async move {
            let _permit = permit;
            let mut body = r.body;
            let mut received = 0usize;
            loop {
                let next = tokio::select! { biased;
                    _ = driver_stop.cancelled() => return,
                    next = driver_scope.run(async { body.next().await.transpose() }) => next.map_err(sanitize),
                };
                let (item, terminal) = match next {
                    Ok(None) => return,
                    Ok(Some(bytes)) => {
                        if bytes.len() > maximum.saturating_sub(received) {
                            (Err(Error::new(ErrorCode::InvalidResponse)), true)
                        } else {
                            received += bytes.len();
                            (Ok(bytes), false)
                        }
                    }
                    Err(e) => (Err(e), true),
                };
                tokio::select! { biased;
                    _ = driver_stop.cancelled() => return,
                    _ = tokio::time::sleep_until(driver_scope.deadline) => return,
                    _ = driver_scope.cancel.cancelled() => return,
                    sent = sender.send(item) => if sent.is_err() { return; },
                }
                if terminal {
                    return;
                }
            }
        });
        Ok(NativeResponse {
            data: SseStream {
                receiver,
                stop,
                driver,
                scope,
                maximum: self.core.config.max_response_bytes,
                received: 0,
                buffer: Vec::new(),
                data: Vec::new(),
                event: None,
                id: None,
                retry: None,
                events: VecDeque::new(),
                skip_lf: false,
                first: true,
                ended: false,
            },
            metadata,
        })
    }
}
fn scalar(v: &Value) -> Result<String> {
    match v {
        Value::String(s) => Ok(s.clone()),
        Value::Bool(b) => Ok(b.to_string()),
        Value::Number(n) => Ok(n.to_string()),
        _ => Err(Error::new(ErrorCode::InvalidRequest)),
    }
}
fn append_query(url: &mut url::Url, key: &str, value: &Value, comma: bool) -> Result<()> {
    match value {
        Value::Null => {}
        Value::Array(a) => {
            if comma {
                let v = a.iter().map(scalar).collect::<Result<Vec<_>>>()?.join(",");
                url.query_pairs_mut().append_pair(key, &v);
            } else {
                for v in a {
                    url.query_pairs_mut().append_pair(key, &scalar(v)?);
                }
            }
        }
        Value::Object(o) => {
            for (k, v) in o {
                if !v.is_null() {
                    url.query_pairs_mut()
                        .append_pair(&format!("{key}[{k}]"), &scalar(v)?);
                }
            }
        }
        v => {
            url.query_pairs_mut().append_pair(key, &scalar(v)?);
        }
    }
    Ok(())
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SseEvent {
    pub event: Option<String>,
    pub data: String,
    pub id: Option<String>,
    pub retry: Option<u64>,
}
/// Single subscription; no reconnect or replay. Dropping closes the body and releases concurrency.
pub struct SseStream {
    receiver: mpsc::Receiver<Result<Bytes>>,
    stop: CancellationToken,
    driver: tokio::task::JoinHandle<()>,
    scope: Scope,
    maximum: usize,
    received: usize,
    buffer: Vec<u8>,
    data: Vec<String>,
    event: Option<String>,
    id: Option<String>,
    retry: Option<u64>,
    events: VecDeque<SseEvent>,
    skip_lf: bool,
    first: bool,
    ended: bool,
}
impl SseStream {
    fn close(&mut self) {
        self.stop.cancel();
        self.driver.abort();
        self.receiver.close();
        self.ended = true;
    }
    fn line(&mut self) -> Result<()> {
        let bytes = std::mem::take(&mut self.buffer);
        let mut line =
            String::from_utf8(bytes).map_err(|_| Error::new(ErrorCode::InvalidResponse))?;
        if self.first {
            self.first = false;
            if line.starts_with('\u{feff}') {
                line = line.trim_start_matches('\u{feff}').into();
            }
        }
        if line.is_empty() {
            if !self.data.is_empty() {
                self.events.push_back(SseEvent {
                    event: self.event.take(),
                    data: self.data.join("\n"),
                    id: self.id.clone(),
                    retry: self.retry.take(),
                });
            }
            self.data.clear();
            self.event = None;
            self.retry = None;
            return Ok(());
        }
        if line.starts_with(':') {
            return Ok(());
        }
        let (name, value) = line.split_once(':').unwrap_or((&line, ""));
        let value = value.strip_prefix(' ').unwrap_or(value);
        match name {
            "data" => self.data.push(value.into()),
            "event" => self.event = Some(value.into()),
            "id" if !value.contains('\0') => self.id = Some(value.into()),
            "retry" if !value.is_empty() && value.bytes().all(|b| b.is_ascii_digit()) => {
                self.retry = value.parse().ok()
            }
            _ => {}
        }
        Ok(())
    }
    fn chunk(&mut self, bytes: Bytes) -> Result<()> {
        if bytes.len() > self.maximum.saturating_sub(self.received) {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        self.received += bytes.len();
        for b in bytes {
            if self.skip_lf {
                self.skip_lf = false;
                if b == b'\n' {
                    continue;
                }
            }
            if b == b'\r' {
                self.line()?;
                self.skip_lf = true;
            } else if b == b'\n' {
                self.line()?;
            } else {
                self.buffer.push(b);
            }
        }
        Ok(())
    }
    pub async fn next(&mut self) -> Result<Option<SseEvent>> {
        if self.ended {
            return Ok(None);
        }
        let result = self.next_inner().await;
        if result.is_err() {
            self.close();
        }
        result
    }
    async fn next_inner(&mut self) -> Result<Option<SseEvent>> {
        loop {
            self.scope.check()?;
            if let Some(e) = self.events.pop_front() {
                return Ok(Some(e));
            }
            let next = self
                .scope
                .run(async { self.receiver.recv().await.transpose() })
                .await?;
            match next {
                Some(b) => self.chunk(b)?,
                None => {
                    self.close();
                    return Ok(None);
                }
            }
        }
    }
}

impl Drop for SseStream {
    fn drop(&mut self) {
        self.close();
    }
}
