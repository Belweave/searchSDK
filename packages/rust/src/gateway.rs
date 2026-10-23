//! Application-owned HTTPS gateway protocol v1; tokens are supplied per call.
use crate::{Error, ErrorCode, Result, transport::*, types::*};
use futures_util::{StreamExt, stream};
use reqwest::header::HeaderMap;
use serde_json::Value;
use std::sync::Arc;
#[derive(Clone)]
pub struct Gateway {
    endpoint: url::Url,
    core: Core,
}
impl Gateway {
    pub fn new(url: &str) -> Result<Self> {
        Self::with_transport(
            url,
            ClientConfig::default(),
            Arc::new(ReqwestTransport::new()?),
        )
    }
    pub fn with_transport(
        url: &str,
        config: ClientConfig,
        transport: Arc<dyn Transport>,
    ) -> Result<Self> {
        if config.retry.max_retries != 0 {
            return Err(Error::new(ErrorCode::UnsupportedOption));
        }
        Ok(Self {
            endpoint: endpoint(url)?,
            core: Core::new(config, transport)?,
        })
    }
    pub async fn search(
        &self,
        request: SearchRequest,
        token: Option<&str>,
        options: CallOptions,
    ) -> Result<SearchResponse> {
        let scope = Scope::new(self.core.config.timeout, &options)?;
        scope.run(self.execute(request, token, &scope)).await
    }
    async fn execute(
        &self,
        request: SearchRequest,
        token: Option<&str>,
        scope: &Scope,
    ) -> Result<SearchResponse> {
        let request = request.validated()?;
        let mut headers = HeaderMap::new();
        header(
            &mut headers,
            "content-type",
            "application/json",
            ErrorCode::InvalidRequest,
        )?;
        if let Some(token) = token {
            credential(token).map_err(|_| Error::new(ErrorCode::InvalidRequest))?;
            header(
                &mut headers,
                "authorization",
                &format!("Bearer {token}"),
                ErrorCode::InvalidRequest,
            )?;
        }
        let _permit = self.core.acquire(scope).await?;
        let response = self
            .core
            .send(
                HttpRequest {
                    method: "POST".into(),
                    url: self.endpoint.clone(),
                    headers,
                    body: RequestBody::Bytes(
                        serde_json::to_vec(&request)
                            .map_err(|_| Error::new(ErrorCode::InvalidRequest))?,
                    ),
                },
                scope,
            )
            .await?;
        if response
            .headers
            .get_all("x-searchsdk-protocol")
            .iter()
            .any(|v| v.as_bytes() != b"1")
        {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        let status = response.status;
        let fallback = status_error(status, &response.headers);
        let success = status == 200;
        if (200..300).contains(&status) && !success {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        let bytes = match self.core.read(response, scope).await {
            Ok(v) => v.bytes,
            Err(e) => {
                return Err(if !success && e.code == ErrorCode::InvalidResponse {
                    fallback
                } else {
                    e
                });
            }
        };
        let value: Value = match serde_json::from_slice(&bytes) {
            Ok(v) => v,
            Err(_) => {
                return Err(if success {
                    Error::new(ErrorCode::InvalidResponse)
                } else {
                    fallback
                });
            }
        };
        if !success {
            let error = value
                .get("error")
                .cloned()
                .and_then(|v| serde_json::from_value::<Error>(v).ok());
            return Err(match error {
                Some(mut e)
                    if e.attempts.len() <= 1024
                        && e.attempts.iter().all(SearchAttempt::valid)
                        && e.retry_after_ms.is_none_or(|n| n.is_finite() && n >= 0.0)
                        && e.status.is_none_or(|s| (100..=599).contains(&s)) =>
                {
                    e.status = e.status.or(Some(status));
                    e
                }
                _ => fallback,
            });
        }
        let r = SearchResponse::from_json(value)?;
        scope.check()?;
        Ok(r)
    }
    pub async fn search_batch(
        &self,
        requests: Vec<SearchRequest>,
        token: Option<&str>,
        concurrency: usize,
        options: CallOptions,
    ) -> Result<Vec<Result<SearchResponse>>> {
        if requests.len() > 1000 || !(1..=64).contains(&concurrency) {
            return Err(Error::new(ErrorCode::InvalidRequest));
        }
        let scope = Scope::new(self.core.config.timeout, &options)?;
        Ok(stream::iter(requests.into_iter().map(|r| {
            let scope = &scope;
            async move {
                scope.check()?;
                let result = self.execute(r, token, scope).await;
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
        .await)
    }
}
