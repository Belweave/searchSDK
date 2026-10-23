use searchsdk::{
    native::{SerpApiClient, serpapi::SerpApiAccountInput},
    transport::*,
    *,
};
use std::{
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
struct Slow {
    calls: AtomicUsize,
}
impl Transport for Slow {
    fn send(&self, _: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        Box::pin(async move {
            self.calls.fetch_add(1, Ordering::SeqCst);
            tokio::time::sleep(Duration::from_secs(30)).await;
            Err(Error::new(ErrorCode::Network))
        })
    }
}
struct Status {
    status: u16,
    calls: AtomicUsize,
    retry_after: Option<&'static str>,
    body: &'static [u8],
}
impl Transport for Status {
    fn send(&self, _: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        Box::pin(async move {
            self.calls.fetch_add(1, Ordering::SeqCst);
            let mut h = Default::default();
            if let Some(delay) = self.retry_after {
                searchsdk_header(&mut h, delay);
            }
            Ok(HttpResponse::bytes(self.status, h, self.body.to_vec()))
        })
    }
}
fn searchsdk_header(h: &mut reqwest::header::HeaderMap, v: &str) {
    h.insert("retry-after", v.parse().unwrap());
}
fn retry() -> ClientConfig {
    ClientConfig {
        retry: RetryPolicy {
            max_retries: 1,
            base_delay: Duration::ZERO,
            max_delay: Duration::ZERO,
        },
        ..Default::default()
    }
}
#[tokio::test]
async fn attempt_timeout_can_fall_back_while_whole_call_timeout_cannot() {
    let slow = Arc::new(Slow {
        calls: AtomicUsize::new(0),
    });
    let success = Arc::new(Status {
        status: 200,
        calls: AtomicUsize::new(0),
        retry_after: None,
        body: b"{\"results\":[]}",
    });
    let a = Provider::with_transport(
        ProviderId::Exa,
        "key",
        ClientConfig::default(),
        slow.clone(),
    )
    .unwrap();
    let b = Provider::with_transport(
        ProviderId::Tavily,
        "key",
        ClientConfig::default(),
        success.clone(),
    )
    .unwrap();
    let c = SearchClient::with_fallback(
        a.clone(),
        vec![b.clone()],
        ClientConfig::default(),
        Some(Duration::from_millis(5)),
    )
    .unwrap();
    let r = c
        .search(SearchRequest::new("x"), CallOptions::default())
        .await
        .unwrap();
    assert_eq!(r.provider, "tavily");
    assert_eq!(r.attempts[0].code, Some(ErrorCode::AttemptTimeout));
    let c = SearchClient::with_fallback(
        a,
        vec![b],
        ClientConfig {
            timeout: Duration::from_millis(5),
            ..Default::default()
        },
        None,
    )
    .unwrap();
    assert_eq!(
        c.search(SearchRequest::new("x"), CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::Timeout
    );
    assert_eq!(success.calls.load(Ordering::SeqCst), 1);
}
#[tokio::test]
async fn retry_after_is_never_shortened_to_backoff_cap() {
    let http = Arc::new(Status {
        status: 429,
        calls: AtomicUsize::new(0),
        retry_after: Some("2"),
        body: b"private-error",
    });
    let c = SerpApiClient::with_transport("private-key", retry(), http.clone()).unwrap();
    let e = c
        .account(
            &SerpApiAccountInput::default(),
            CallOptions {
                timeout: Some(Duration::from_millis(5)),
                ..Default::default()
            },
        )
        .await
        .err()
        .unwrap();
    assert_eq!(e.code, ErrorCode::Timeout);
    assert_eq!(http.calls.load(Ordering::SeqCst), 1);
    assert!(!format!("{e:?}").contains("private"));
    let p = Provider::with_transport(
        ProviderId::Exa,
        "key",
        ClientConfig::default(),
        http.clone(),
    )
    .unwrap();
    let c = SearchClient::with_fallback(p, vec![], retry(), None).unwrap();
    let e = c
        .search(
            SearchRequest::new("x"),
            CallOptions {
                timeout: Some(Duration::from_millis(5)),
                ..Default::default()
            },
        )
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::Timeout);
    assert_eq!(http.calls.load(Ordering::SeqCst), 2);
    assert_eq!(e.attempts.len(), 1);
    assert_eq!(e.attempts[0].retry_after_ms, Some(2000.0));
}
#[tokio::test]
async fn auth_never_falls_back_and_defaults_never_retry() {
    let auth = Arc::new(Status {
        status: 401,
        calls: AtomicUsize::new(0),
        retry_after: None,
        body: b"private-error",
    });
    let slow = Arc::new(Slow {
        calls: AtomicUsize::new(0),
    });
    let a = Provider::with_transport(
        ProviderId::Exa,
        "key",
        ClientConfig::default(),
        auth.clone(),
    )
    .unwrap();
    let b = Provider::with_transport(
        ProviderId::Tavily,
        "key",
        ClientConfig::default(),
        slow.clone(),
    )
    .unwrap();
    let c = SearchClient::with_fallback(a, vec![b], retry(), None).unwrap();
    let e = c
        .search(SearchRequest::new("x"), CallOptions::default())
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::Auth);
    assert_eq!(auth.calls.load(Ordering::SeqCst), 1);
    assert_eq!(slow.calls.load(Ordering::SeqCst), 0);
    let http = Arc::new(Status {
        status: 503,
        calls: AtomicUsize::new(0),
        retry_after: None,
        body: b"error",
    });
    let c = SearchClient::new(
        Provider::with_transport(
            ProviderId::Exa,
            "key",
            ClientConfig::default(),
            http.clone(),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        c.search(SearchRequest::new("x"), CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::Unavailable
    );
    assert_eq!(http.calls.load(Ordering::SeqCst), 1);
}
#[tokio::test]
async fn queued_batch_deadline_applies_to_unstarted_and_invalid_items() {
    let slow = Arc::new(Slow {
        calls: AtomicUsize::new(0),
    });
    let g = Gateway::with_transport(
        "https://app.example",
        ClientConfig {
            max_concurrency: 1,
            ..Default::default()
        },
        slow.clone(),
    )
    .unwrap();
    let requests = vec![
        SearchRequest::new("a"),
        SearchRequest::new("b"),
        SearchRequest::new(""),
    ];
    let outcomes = g
        .search_batch(
            requests,
            None,
            1,
            CallOptions {
                timeout: Some(Duration::from_millis(5)),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    assert_eq!(outcomes.len(), 3);
    assert!(
        outcomes
            .iter()
            .all(|r| r.as_ref().unwrap_err().code == ErrorCode::Timeout)
    );
    assert_eq!(slow.calls.load(Ordering::SeqCst), 1);
}
#[test]
fn strict_deserialization_and_noncanonical_result_urls() {
    for s in [
        r#"{"query":"x","limit":null}"#,
        r#"{"query":"x","includeDomains":null}"#,
        r#"{"query":"x","excludeDomains":null}"#,
    ] {
        assert!(serde_json::from_str::<SearchRequest>(s).is_err());
    }
    let mut response: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/search-success.json")).unwrap();
    response["results"][0]["url"] = serde_json::json!("https:///example.com/path");
    assert!(SearchResponse::from_json(response).is_err());
}

#[tokio::test]
async fn search_client_response_ceiling_also_bounds_the_adapter() {
    let http = Arc::new(Status {
        status: 200,
        calls: AtomicUsize::new(0),
        retry_after: None,
        body: b"{\"results\":[]}",
    });
    let provider =
        Provider::with_transport(ProviderId::Exa, "key", ClientConfig::default(), http).unwrap();
    let client = SearchClient::with_fallback(
        provider,
        vec![],
        ClientConfig {
            max_response_bytes: 5,
            ..Default::default()
        },
        None,
    )
    .unwrap();
    assert_eq!(
        client
            .search(SearchRequest::new("x"), CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::InvalidResponse
    );
}

#[tokio::test]
async fn invalid_transport_status_is_rejected() {
    let http = Arc::new(Status {
        status: 999,
        calls: AtomicUsize::new(0),
        retry_after: None,
        body: b"{}",
    });
    let gateway =
        Gateway::with_transport("https://app.example", ClientConfig::default(), http).unwrap();
    assert_eq!(
        gateway
            .search(SearchRequest::new("x"), None, CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::InvalidResponse
    );
}

#[tokio::test]
async fn gateway_preserves_fractional_retry_metadata_and_rejects_negative_values() {
    struct Fractional;
    impl Transport for Fractional {
        fn send(&self, _: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
            Box::pin(async {
                Ok(HttpResponse::bytes(
                    429,
                    Default::default(),
                    br#"{"error":{"code":"rate_limit","retryAfterMs":0.5,"attempts":[]}}"#.to_vec(),
                ))
            })
        }
    }
    let gateway = Gateway::with_transport(
        "https://app.example",
        ClientConfig::default(),
        Arc::new(Fractional),
    )
    .unwrap();
    assert_eq!(
        gateway
            .search(SearchRequest::new("x"), None, CallOptions::default())
            .await
            .unwrap_err()
            .retry_after_ms,
        Some(0.5)
    );
    let mut response: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/search-success.json")).unwrap();
    response["attempts"][0]["retryAfterMs"] = serde_json::json!(0.5);
    assert_eq!(
        SearchResponse::from_json(response.clone())
            .unwrap()
            .attempts[0]
            .retry_after_ms,
        Some(0.5)
    );
    for value in [serde_json::json!(-0.5), serde_json::Value::Null] {
        response["attempts"][0]["retryAfterMs"] = value;
        assert!(SearchResponse::from_json(response.clone()).is_err());
    }
}
