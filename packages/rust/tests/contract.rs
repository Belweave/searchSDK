use reqwest::header::HeaderMap;
use searchsdk::{
    normalized::{SearxngSettings, normalize},
    transport::*,
    *,
};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, VecDeque},
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};

fn fixture(name: &str) -> Value {
    serde_json::from_str(match name {
        "providers" => include_str!("fixtures/providers.json"),
        "request-cases" => include_str!("fixtures/request-cases.json"),
        "search-success" => include_str!("fixtures/search-success.json"),
        "search-errors" => include_str!("fixtures/search-errors.json"),
        _ => panic!("unknown fixture"),
    })
    .unwrap()
}
fn numeric(v: Value) -> Value {
    match v {
        Value::Number(n) => json!(n.as_f64().unwrap()),
        Value::Array(a) => Value::Array(a.into_iter().map(numeric).collect()),
        Value::Object(o) => Value::Object(o.into_iter().map(|(k, v)| (k, numeric(v))).collect()),
        v => v,
    }
}
#[derive(Clone)]
struct Recorded {
    url: url::Url,
    method: String,
    headers: HeaderMap,
    body: Value,
}
struct Mock {
    replies: Mutex<VecDeque<(u16, HeaderMap, Vec<u8>)>>,
    requests: Mutex<Vec<Recorded>>,
    delay: Duration,
    active: AtomicUsize,
    maximum: AtomicUsize,
}
impl Mock {
    fn new(values: Vec<(u16, Value)>) -> Arc<Self> {
        Arc::new(Self {
            replies: Mutex::new(
                values
                    .into_iter()
                    .map(|(s, v)| (s, HeaderMap::new(), serde_json::to_vec(&v).unwrap()))
                    .collect(),
            ),
            requests: Mutex::new(Vec::new()),
            delay: Duration::ZERO,
            active: AtomicUsize::new(0),
            maximum: AtomicUsize::new(0),
        })
    }
    fn count(&self) -> usize {
        self.requests.lock().unwrap().len()
    }
}
impl Transport for Mock {
    fn send(&self, r: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        Box::pin(async move {
            let body = match r.body {
                RequestBody::Empty => Value::Null,
                RequestBody::Bytes(b) => {
                    if r.headers
                        .get("content-type")
                        .is_some_and(|v| v == "application/x-www-form-urlencoded")
                    {
                        json!(
                            url::form_urlencoded::parse(&b)
                                .into_owned()
                                .collect::<BTreeMap<_, _>>()
                        )
                    } else {
                        serde_json::from_slice(&b).unwrap()
                    }
                }
                RequestBody::Multipart(_) => Value::Null,
            };
            self.requests.lock().unwrap().push(Recorded {
                url: r.url,
                method: r.method,
                headers: r.headers,
                body,
            });
            let active = self.active.fetch_add(1, Ordering::SeqCst) + 1;
            self.maximum.fetch_max(active, Ordering::SeqCst);
            tokio::time::sleep(self.delay).await;
            self.active.fetch_sub(1, Ordering::SeqCst);
            let (s, h, b) = self
                .replies
                .lock()
                .unwrap()
                .pop_front()
                .expect("unexpected provider call");
            Ok(HttpResponse::bytes(s, h, b))
        })
    }
}
#[test]
fn request_contract() {
    let f = fixture("request-cases");
    for c in f["valid"].as_array().unwrap() {
        let r = SearchRequest::from_json(c["input"].clone()).unwrap();
        assert_eq!(
            serde_json::to_value(r).unwrap(),
            c["normalized"],
            "{}",
            c["name"]
        );
    }
    for c in f["invalid"].as_array().unwrap() {
        assert_eq!(
            SearchRequest::from_json(c["input"].clone())
                .unwrap_err()
                .code,
            ErrorCode::InvalidRequest,
            "{}",
            c["name"]
        );
    }
}
#[tokio::test]
async fn all_24_provider_wire_cases() {
    let f = fixture("providers");
    assert_eq!(f["cases"].as_array().unwrap().len(), 24);
    for case in f["cases"].as_array().unwrap() {
        let id: ProviderId = serde_json::from_value(case["provider"].clone()).unwrap();
        let mock = Mock::new(vec![(200, case["upstreamResponse"].clone())]);
        let provider = if id == ProviderId::Searxng {
            Provider::searxng_with_transport(
                "https://searxng.example",
                SearxngSettings::default(),
                ClientConfig::default(),
                mock.clone(),
            )
            .unwrap()
        } else {
            Provider::with_transport(id, "fixture-key", ClientConfig::default(), mock.clone())
                .unwrap()
        };
        let cap = provider.capabilities();
        assert_eq!(
            json!(cap.domain_filters),
            case["capabilities"]["domainFilters"]
        );
        assert_eq!(
            json!(cap.max_include_domains),
            case["capabilities"]["maxIncludeDomains"]
        );
        assert_eq!(
            json!(cap.max_exclude_domains),
            case["capabilities"]["maxExcludeDomains"]
        );
        let r = SearchClient::new(provider)
            .unwrap()
            .search(
                SearchRequest::from_json(case["request"].clone()).unwrap(),
                CallOptions::default(),
            )
            .await
            .unwrap();
        assert_eq!(
            r.results.len(),
            case["response"]["results"].as_array().unwrap().len(),
            "{}",
            case["name"]
        );
        let mut actual = serde_json::to_value(r).unwrap();
        actual.as_object_mut().unwrap().remove("provider");
        actual.as_object_mut().unwrap().remove("attempts");
        for row in actual["results"].as_array_mut().unwrap() {
            row["provenance"]["retrievedAt"] = f["canonicalRetrievalTime"].clone();
        }
        assert_eq!(
            numeric(actual),
            numeric(case["response"].clone()),
            "{}",
            case["name"]
        );
        let sent = mock.requests.lock().unwrap();
        let sent = &sent[0];
        let expected = &case["upstreamRequest"];
        let mut actual_url = sent.url.clone();
        actual_url.set_query(None);
        assert_eq!(actual_url.as_str(), expected["url"].as_str().unwrap());
        assert_eq!(sent.method, expected["method"]);
        assert_eq!(
            json!(
                sent.url
                    .query_pairs()
                    .into_owned()
                    .collect::<BTreeMap<_, _>>()
            ),
            expected["query"]
        );
        assert_eq!(
            sent.body,
            expected.get("body").cloned().unwrap_or(Value::Null)
        );
        let headers: BTreeMap<_, _> = sent
            .headers
            .iter()
            .map(|(k, v)| (k.as_str(), v.to_str().unwrap()))
            .collect();
        assert_eq!(json!(headers), expected["headers"], "{}", case["name"]);
    }
}
#[test]
fn malformed_normalized_responses() {
    let f = fixture("providers");
    for c in f["cases"].as_array().unwrap() {
        let id = serde_json::from_value(c["provider"].clone()).unwrap();
        for invalid in [
            json!(null),
            json!([]),
            json!({}),
            json!({"results":false}),
            json!({"results":[{"url":"https://secret@example.com"}]}),
            json!({"results":[{"url":"javascript:alert(1)"}]}),
        ] {
            assert!(
                normalize(id, &invalid, "2026-10-22T00:00:00Z").is_err(),
                "{}",
                c["name"]
            );
        }
    }
    let c = &f["cases"][0];
    for bad in [
        json!(false),
        json!({"url":"https://x.com","title":3}),
        json!({"url":"https://x.com","description":4}),
        json!({"url":"http://a:b@example.com"}),
    ] {
        let mut body = c["upstreamResponse"].clone();
        body["results"] = json!([bad]);
        assert_eq!(
            normalize(ProviderId::Context, &body, "2026-10-22T00:00:00Z")
                .unwrap_err()
                .code,
            ErrorCode::InvalidResponse
        );
    }
}
#[tokio::test]
async fn gateway_success_and_sanitized_errors() {
    let body = fixture("search-success");
    let mock = Mock::new(vec![(200, body.clone())]);
    let gateway = Gateway::with_transport(
        "https://application.example/exact",
        ClientConfig::default(),
        mock.clone(),
    )
    .unwrap();
    let r = gateway
        .search(
            SearchRequest::new("private-query"),
            Some("private-token"),
            CallOptions::default(),
        )
        .await
        .unwrap();
    assert_eq!(numeric(serde_json::to_value(r).unwrap()), numeric(body));
    {
        let sent = mock.requests.lock().unwrap();
        assert_eq!(sent[0].url.as_str(), "https://application.example/exact");
        assert_eq!(sent[0].headers["authorization"], "Bearer private-token");
    }
    for c in fixture("search-errors").as_array().unwrap() {
        let mock = Mock::new(vec![(
            c["httpStatus"].as_u64().unwrap() as u16,
            c["body"].clone(),
        )]);
        let g =
            Gateway::with_transport("https://app.example", ClientConfig::default(), mock).unwrap();
        let e = g
            .search(
                SearchRequest::new("secret-query"),
                Some("secret-key"),
                CallOptions::default(),
            )
            .await
            .unwrap_err();
        assert_eq!(json!(e.code), c["body"]["error"]["code"]);
        assert!(!format!("{e:?} {e}").contains("secret"));
    }
    for (status, code) in [
        (401, ErrorCode::Auth),
        (402, ErrorCode::Auth),
        (403, ErrorCode::Auth),
        (432, ErrorCode::Auth),
        (433, ErrorCode::Auth),
        (429, ErrorCode::RateLimit),
        (408, ErrorCode::Unavailable),
        (500, ErrorCode::Unavailable),
        (302, ErrorCode::ProviderError),
        (418, ErrorCode::ProviderError),
    ] {
        let m = Mock::new(vec![(status, json!({"secret":"key-query-upstream-body"}))]);
        let g = Gateway::with_transport("https://app.example", ClientConfig::default(), m).unwrap();
        let e = g
            .search(
                SearchRequest::new("private-query"),
                Some("private-key"),
                CallOptions::default(),
            )
            .await
            .unwrap_err();
        assert_eq!(e.code, code);
        assert!(!serde_json::to_string(&e).unwrap().contains("private"));
    }
}
#[test]
fn strict_gateway_response_validation() {
    let mut good = fixture("search-success");
    good["attempts"][0]["status"] = json!(200);
    assert!(SearchResponse::from_json(good.clone()).is_ok());
    let mutations = vec![
        ("/provider", json!("bad provider")),
        ("/usage", json!({"unit":"tokens","value":3})),
        ("/warnings", json!([{"provider":"a","code":"secret"}])),
        ("/attempts/0/startedAt", json!("yesterday")),
        ("/attempts/0/durationMs", json!(-1)),
        ("/attempts/0/status", json!(999)),
        ("/results/0/url", json!("http://user:pass@example.com")),
        ("/results/0/url", json!("https://example.com/with space")),
        (
            "/results/0/provenance/sourceUrl",
            json!("ftp://example.com"),
        ),
        (
            "/results/0/provenance/retrievedAt",
            json!("+12026-01-01T00:00:00Z"),
        ),
        ("/results/0/provenance/requestId", json!("secret header\n")),
        ("/results/0/highlights", json!([false])),
        ("/results/0/score", json!("NaN")),
    ];
    for (path, bad) in mutations {
        let mut value = good.clone();
        *value
            .pointer_mut(path)
            .unwrap_or_else(|| panic!("missing {path}")) = bad;
        assert_eq!(
            SearchResponse::from_json(value).unwrap_err().code,
            ErrorCode::InvalidResponse,
            "{path}"
        );
    }
    let mut missing = good.clone();
    missing.as_object_mut().unwrap().remove("usage");
    assert!(SearchResponse::from_json(missing).is_err());
}
#[tokio::test]
async fn gateway_protocol_header_and_body_ceiling() {
    let m = Mock::new(vec![(200, fixture("search-success"))]);
    m.replies.lock().unwrap()[0]
        .1
        .insert("x-searchsdk-protocol", "2".parse().unwrap());
    let g = Gateway::with_transport("https://app.example", ClientConfig::default(), m).unwrap();
    assert_eq!(
        g.search(SearchRequest::new("x"), None, CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::InvalidResponse
    );
    let m = Mock::new(vec![(200, fixture("search-success"))]);
    let config = ClientConfig {
        max_response_bytes: 12,
        ..Default::default()
    };
    let g = Gateway::with_transport("https://app.example", config, m).unwrap();
    assert_eq!(
        g.search(SearchRequest::new("x"), None, CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::InvalidResponse
    );
}
#[test]
fn reject_unsafe_endpoints_and_configuration() {
    for url in [
        "http://example.com",
        "https://user:pass@example.com",
        "https://example.com?key=x",
        "https://example.com#f",
        "https://example.com?",
        "https://example.com#",
        "https:\\example.com",
        "https://example.com/with space",
    ] {
        assert!(Gateway::new(url).is_err(), "{url}");
    }
    assert!(Provider::new(ProviderId::Exa, " key").is_err());
    let m = Mock::new(vec![]);
    assert!(
        Gateway::with_transport(
            "https://app.example",
            ClientConfig {
                max_concurrency: 0,
                ..Default::default()
            },
            m.clone()
        )
        .is_err()
    );
    assert!(
        Gateway::with_transport(
            "https://app.example",
            ClientConfig {
                retry: RetryPolicy {
                    max_retries: 1,
                    ..Default::default()
                },
                ..Default::default()
            },
            m
        )
        .is_err()
    );
}
#[tokio::test]
async fn preflight_checks_entire_fallback_chain() {
    let m = Mock::new(vec![]);
    let a = Provider::with_transport(ProviderId::Exa, "key", ClientConfig::default(), m.clone())
        .unwrap();
    let b = Provider::with_transport(ProviderId::Brave, "key", ClientConfig::default(), m.clone())
        .unwrap();
    let client = SearchClient::with_fallback(a, vec![b], ClientConfig::default(), None).unwrap();
    let mut r = SearchRequest::new("x");
    r.include_domains = Some(vec!["example.com".into()]);
    assert_eq!(
        client
            .search(r, CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::UnsupportedOption
    );
    assert_eq!(m.count(), 0);
}
#[tokio::test]
async fn explicit_retry_and_fallback_preserve_attempts() {
    let response = fixture("providers")["cases"][4]["upstreamResponse"].clone();
    let m = Mock::new(vec![(503, json!({"private":"body"})), (200, response)]);
    let p = Provider::with_transport(ProviderId::Exa, "key", ClientConfig::default(), m.clone())
        .unwrap();
    let config = ClientConfig {
        retry: RetryPolicy {
            max_retries: 1,
            base_delay: Duration::ZERO,
            max_delay: Duration::ZERO,
        },
        ..Default::default()
    };
    let c = SearchClient::with_fallback(p, vec![], config, None).unwrap();
    let r = c
        .search(SearchRequest::new("x"), CallOptions::default())
        .await
        .unwrap();
    assert_eq!(r.attempts.len(), 2);
    assert_eq!(m.count(), 2);
    let m1 = Mock::new(vec![(503, json!({}))]);
    let m2 = Mock::new(vec![(200, json!({"results":[]}))]);
    let a = Provider::with_transport(ProviderId::Exa, "key", ClientConfig::default(), m1).unwrap();
    let b =
        Provider::with_transport(ProviderId::Tavily, "key", ClientConfig::default(), m2).unwrap();
    let r = SearchClient::with_fallback(a, vec![b], ClientConfig::default(), None)
        .unwrap()
        .search(SearchRequest::new("x"), CallOptions::default())
        .await
        .unwrap();
    assert_eq!(r.provider, "tavily");
    assert_eq!(r.attempts.len(), 2);
    assert_eq!(r.warnings[0].code, WarningCode::FallbackUsed);
}
#[tokio::test]
async fn cancellation_and_whole_call_deadline_stop_uncooperative_transport() {
    let m = Arc::new(Mock {
        delay: Duration::from_secs(30),
        ..Arc::try_unwrap(Mock::new(vec![])).ok().unwrap()
    });
    let g =
        Gateway::with_transport("https://app.example", ClientConfig::default(), m.clone()).unwrap();
    let cancel = CancellationToken::new();
    cancel.cancel();
    assert_eq!(
        g.search(
            SearchRequest::new("x"),
            None,
            CallOptions {
                cancellation: cancel,
                timeout: None
            }
        )
        .await
        .unwrap_err()
        .code,
        ErrorCode::Aborted
    );
    assert_eq!(m.count(), 0);
    let cancel = CancellationToken::new();
    let c = cancel.clone();
    let task = tokio::spawn(async move {
        tokio::time::sleep(Duration::from_millis(5)).await;
        c.cancel();
    });
    let e = g
        .search(
            SearchRequest::new("secret"),
            Some("private"),
            CallOptions {
                cancellation: cancel,
                timeout: None,
            },
        )
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::Aborted);
    task.await.unwrap();
    let e = g
        .search(
            SearchRequest::new("x"),
            None,
            CallOptions {
                timeout: Some(Duration::from_millis(5)),
                ..Default::default()
            },
        )
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::Timeout);
}
#[tokio::test]
async fn ordered_batch_keeps_siblings_and_bounds_concurrency() {
    let mut m = Arc::try_unwrap(Mock::new(
        (0..8).map(|_| (200, fixture("search-success"))).collect(),
    ))
    .ok()
    .unwrap();
    m.delay = Duration::from_millis(3);
    let m = Arc::new(m);
    let g = Gateway::with_transport(
        "https://app.example",
        ClientConfig {
            max_concurrency: 2,
            ..Default::default()
        },
        m.clone(),
    )
    .unwrap();
    let inputs = (0..9)
        .map(|n| SearchRequest::new(if n == 3 { String::new() } else { n.to_string() }))
        .collect();
    let out = g
        .search_batch(inputs, None, 4, CallOptions::default())
        .await
        .unwrap();
    assert_eq!(out.len(), 9);
    for (i, o) in out.iter().enumerate() {
        assert_eq!(o.is_ok(), i != 3);
    }
    assert!(m.maximum.load(Ordering::SeqCst) <= 2);
    assert_eq!(m.count(), 8);
    let cancel = CancellationToken::new();
    cancel.cancel();
    let out = g
        .search_batch(
            vec![SearchRequest::new("a"), SearchRequest::new("b")],
            None,
            1,
            CallOptions {
                cancellation: cancel,
                timeout: None,
            },
        )
        .await
        .unwrap();
    assert!(
        out.iter()
            .all(|v| v.as_ref().unwrap_err().code == ErrorCode::Aborted)
    );
}
