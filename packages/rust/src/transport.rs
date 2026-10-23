//! Bounded transport with no redirects, cookies, proxy discovery, or ambient credentials.
use crate::{Error, ErrorCode, Result};
use bytes::Bytes;
use futures_util::{Stream, StreamExt};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use std::{future::Future, pin::Pin, sync::Arc, time::Duration};
use tokio::{
    sync::{OwnedSemaphorePermit, Semaphore},
    time::Instant,
};
pub use tokio_util::sync::CancellationToken;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;
pub type BodyStream = Pin<Box<dyn Stream<Item = Result<Bytes>> + Send>>;
#[derive(Clone, Debug, Default)]
pub struct CallOptions {
    pub cancellation: CancellationToken,
    pub timeout: Option<Duration>,
}
#[derive(Clone, Debug)]
pub struct RetryPolicy {
    pub max_retries: u8,
    pub base_delay: Duration,
    pub max_delay: Duration,
}
impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 0,
            base_delay: Duration::from_millis(250),
            max_delay: Duration::from_secs(5),
        }
    }
}
impl RetryPolicy {
    pub(crate) fn validate(&self) -> Result<()> {
        if self.max_retries > 5
            || self.base_delay > self.max_delay
            || self.max_delay > Duration::from_secs(86400)
        {
            Err(Error::new(ErrorCode::Configuration))
        } else {
            Ok(())
        }
    }
    pub(crate) fn delay(&self, attempt: u8, retry_after_ms: Option<f64>) -> Duration {
        self.base_delay
            .saturating_mul(1u32 << attempt.min(5))
            .min(self.max_delay)
            .max(Duration::from_nanos(
                (retry_after_ms.unwrap_or(0.0) * 1_000_000.0)
                    .ceil()
                    .clamp(0.0, 86_401_000_000_000.0) as u64,
            ))
    }
}
#[derive(Clone, Debug)]
pub struct ClientConfig {
    pub timeout: Duration,
    pub max_response_bytes: usize,
    pub max_concurrency: usize,
    pub retry: RetryPolicy,
}
impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(10),
            max_response_bytes: 10 * 1024 * 1024,
            max_concurrency: 8,
            retry: RetryPolicy::default(),
        }
    }
}
impl ClientConfig {
    pub(crate) fn validate(&self) -> Result<()> {
        self.retry.validate()?;
        if self.timeout.is_zero()
            || self.timeout > Duration::from_secs(86400)
            || self.max_response_bytes == 0
            || !(1..=1024).contains(&self.max_concurrency)
        {
            Err(Error::new(ErrorCode::Configuration))
        } else {
            Ok(())
        }
    }
}
#[derive(Clone, Default)]
pub enum RequestBody {
    #[default]
    Empty,
    Bytes(Vec<u8>),
    Multipart(Vec<MultipartPart>),
}
#[derive(Clone)]
pub struct MultipartPart {
    pub name: String,
    pub bytes: Vec<u8>,
    pub filename: Option<String>,
    pub content_type: Option<String>,
}
/// Intentionally has no Debug implementation: URLs and headers can contain secrets.
pub struct HttpRequest {
    pub method: String,
    pub url: url::Url,
    pub headers: HeaderMap,
    pub body: RequestBody,
}
/// Custom transports must return decoded bytes and must not follow redirects.
pub struct HttpResponse {
    pub status: u16,
    pub headers: HeaderMap,
    pub body: BodyStream,
}
impl HttpResponse {
    pub fn bytes(status: u16, headers: HeaderMap, body: impl Into<Bytes>) -> Self {
        let b = body.into();
        Self {
            status,
            headers,
            body: Box::pin(futures_util::stream::once(async { Ok(b) })),
        }
    }
}
pub trait Transport: Send + Sync {
    fn send(&self, request: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>>;
}
#[derive(Clone)]
pub struct ReqwestTransport {
    client: reqwest::Client,
}
impl ReqwestTransport {
    pub fn new() -> Result<Self> {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .retry(reqwest::retry::never())
            .no_proxy()
            .referer(false)
            .gzip(true)
            .brotli(true)
            .deflate(true)
            .build()
            .map_err(|_| Error::new(ErrorCode::Configuration))?;
        Ok(Self { client })
    }
}
impl Transport for ReqwestTransport {
    fn send(&self, r: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        Box::pin(async move {
            let method = reqwest::Method::from_bytes(r.method.as_bytes())
                .map_err(|_| Error::new(ErrorCode::InvalidRequest))?;
            let mut request = self.client.request(method, r.url).headers(r.headers);
            request = match r.body {
                RequestBody::Empty => request,
                RequestBody::Bytes(bytes) => request.body(bytes),
                RequestBody::Multipart(parts) => {
                    let mut form = reqwest::multipart::Form::new();
                    for part in parts {
                        if part.name.chars().any(|c| c.is_control())
                            || part
                                .filename
                                .as_ref()
                                .is_some_and(|f| f.chars().any(|c| c.is_control()))
                        {
                            return Err(Error::new(ErrorCode::InvalidRequest));
                        }
                        let mut p = reqwest::multipart::Part::bytes(part.bytes);
                        if let Some(filename) = part.filename {
                            p = p.file_name(filename);
                        }
                        if let Some(content_type) = part.content_type {
                            p = p
                                .mime_str(&content_type)
                                .map_err(|_| Error::new(ErrorCode::InvalidRequest))?;
                        }
                        form = form.part(part.name, p);
                    }
                    request.multipart(form)
                }
            };
            let response = request
                .send()
                .await
                .map_err(|_| Error::new(ErrorCode::Network))?;
            Ok(HttpResponse {
                status: response.status().as_u16(),
                headers: response.headers().clone(),
                body: Box::pin(
                    response
                        .bytes_stream()
                        .map(|r| r.map_err(|_| Error::new(ErrorCode::Network))),
                ),
            })
        })
    }
}
#[derive(Clone)]
pub(crate) struct Scope {
    pub deadline: Instant,
    pub cancel: CancellationToken,
    pub code: ErrorCode,
}
impl Scope {
    pub fn new(timeout: Duration, options: &CallOptions) -> Result<Self> {
        let timeout = options.timeout.unwrap_or(timeout);
        if timeout.is_zero() || timeout > Duration::from_secs(86400) {
            return Err(Error::new(ErrorCode::InvalidRequest));
        }
        Ok(Self {
            deadline: Instant::now() + timeout,
            cancel: options.cancellation.clone(),
            code: ErrorCode::Timeout,
        })
    }
    pub fn check(&self) -> Result<()> {
        if self.cancel.is_cancelled() {
            Err(Error::new(ErrorCode::Aborted))
        } else if Instant::now() >= self.deadline {
            Err(Error::new(self.code))
        } else {
            Ok(())
        }
    }
    pub async fn run<T>(&self, future: impl Future<Output = Result<T>>) -> Result<T> {
        self.check()?;
        let result = tokio::select! { biased;
            _ = self.cancel.cancelled() => Err(Error::new(ErrorCode::Aborted)),
            _ = tokio::time::sleep_until(self.deadline) => Err(Error::new(self.code)),
            r = future => r,
        };
        self.check()?;
        result
    }
}
#[derive(Clone)]
pub(crate) struct Core {
    pub transport: Arc<dyn Transport>,
    pub config: ClientConfig,
    pub semaphore: Arc<Semaphore>,
}
impl Core {
    pub fn new(config: ClientConfig, transport: Arc<dyn Transport>) -> Result<Self> {
        config.validate()?;
        Ok(Self {
            semaphore: Arc::new(Semaphore::new(config.max_concurrency)),
            config,
            transport,
        })
    }
    pub async fn acquire(&self, scope: &Scope) -> Result<OwnedSemaphorePermit> {
        scope
            .run(async {
                self.semaphore
                    .clone()
                    .acquire_owned()
                    .await
                    .map_err(|_| Error::new(ErrorCode::Unavailable))
            })
            .await
    }
    pub async fn send(&self, request: HttpRequest, scope: &Scope) -> Result<HttpResponse> {
        let response = scope
            .run(self.transport.send(request))
            .await
            .map_err(sanitize)?;
        if !(100..=599).contains(&response.status) {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        Ok(response)
    }
    pub async fn read(&self, response: HttpResponse, scope: &Scope) -> Result<BoundedResponse> {
        let HttpResponse {
            status,
            headers,
            mut body,
        } = response;
        let mut bytes = Vec::new();
        if !headers.contains_key("content-encoding")
            && headers
                .get("content-length")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
                .is_some_and(|v| v > self.config.max_response_bytes as u64)
        {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        while let Some(chunk) = scope
            .run(async { body.next().await.transpose() })
            .await
            .map_err(sanitize)?
        {
            if chunk.len() > self.config.max_response_bytes.saturating_sub(bytes.len()) {
                return Err(Error::new(ErrorCode::InvalidResponse));
            }
            bytes.extend_from_slice(&chunk);
        }
        scope.check()?;
        Ok(BoundedResponse {
            status,
            headers,
            bytes,
        })
    }
}
/// Raw responses are completely buffered under the decoded-byte ceiling.
pub struct BoundedResponse {
    pub status: u16,
    pub headers: HeaderMap,
    pub bytes: Vec<u8>,
}
pub(crate) fn sanitize(error: Error) -> Error {
    Error {
        code: error.code,
        status: error.status.filter(|s| (100..=599).contains(s)),
        retry_after_ms: error.retry_after_ms.filter(|n| n.is_finite() && *n >= 0.0),
        attempts: Vec::new(),
    }
}
pub(crate) fn status_error(status: u16, headers: &HeaderMap) -> Error {
    let mut e = Error::status(status);
    e.retry_after_ms = headers
        .get("retry-after")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            if let Ok(n) = v.trim().parse::<f64>() {
                if n.is_finite() && n >= 0.0 && (n * 1000.0).is_finite() {
                    return Some(n * 1000.0);
                }
                return None;
            }
            httpdate::parse_http_date(v).ok().map(|date| {
                date.duration_since(std::time::SystemTime::now())
                    .unwrap_or_default()
                    .as_secs_f64()
                    * 1000.0
            })
        });
    e
}
pub(crate) fn endpoint(value: &str) -> Result<url::Url> {
    if value
        .chars()
        .any(|c| c.is_whitespace() || c.is_control() || c == '\\')
        || value.contains(['?', '#'])
        || !value.to_ascii_lowercase().starts_with("https://")
    {
        return Err(Error::new(ErrorCode::Configuration));
    }
    let url = url::Url::parse(value).map_err(|_| Error::new(ErrorCode::Configuration))?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(Error::new(ErrorCode::Configuration));
    }
    Ok(url)
}
pub(crate) fn header(
    headers: &mut HeaderMap,
    name: &str,
    value: &str,
    code: ErrorCode,
) -> Result<()> {
    if [
        "host",
        "cookie",
        "connection",
        "content-length",
        "transfer-encoding",
        "proxy-authorization",
    ]
    .contains(&name.to_ascii_lowercase().as_str())
        || value.chars().any(|c| c.is_control())
    {
        return Err(Error::new(code));
    }
    let key = HeaderName::from_bytes(name.as_bytes()).map_err(|_| Error::new(code))?;
    let mut v = HeaderValue::from_str(value).map_err(|_| Error::new(code))?;
    v.set_sensitive(true);
    headers.insert(key, v);
    Ok(())
}
pub(crate) fn credential(key: &str) -> Result<()> {
    if key.is_empty() || !key.bytes().all(|b| (33..=126).contains(&b)) {
        Err(Error::new(ErrorCode::Configuration))
    } else {
        Ok(())
    }
}
