use bytes::Bytes;
use reqwest::header::HeaderMap;
use searchsdk::{
    native::{brave::*, context::*, exa::*, firecrawl::*, serpapi::*, tavily::*, *},
    transport::*,
    *,
};
use serde_json::{Value, json};
use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
    time::Duration,
};

struct Recorded {
    url: url::Url,
    headers: HeaderMap,
    body: RequestBody,
}
struct Reply {
    status: u16,
    headers: HeaderMap,
    chunks: Vec<Bytes>,
    pending: bool,
}
impl Reply {
    fn json(v: Value) -> Self {
        Self {
            status: 200,
            headers: HeaderMap::new(),
            chunks: vec![Bytes::from(serde_json::to_vec(&v).unwrap())],
            pending: false,
        }
    }
    fn sse(bytes: &[u8], chunk: usize) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(
            "content-type",
            "text/event-stream; charset=utf-8".parse().unwrap(),
        );
        Self {
            status: 200,
            headers,
            chunks: bytes.chunks(chunk).map(Bytes::copy_from_slice).collect(),
            pending: false,
        }
    }
}
struct Script {
    responses: Mutex<VecDeque<Reply>>,
    calls: Mutex<Vec<Recorded>>,
}
impl Script {
    fn new(responses: Vec<Reply>) -> Arc<Self> {
        Arc::new(Self {
            responses: Mutex::new(responses.into()),
            calls: Mutex::new(vec![]),
        })
    }
}
impl Transport for Script {
    fn send(&self, r: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        Box::pin(async move {
            self.calls.lock().unwrap().push(Recorded {
                url: r.url,
                headers: r.headers,
                body: r.body,
            });
            let reply = self
                .responses
                .lock()
                .unwrap()
                .pop_front()
                .expect("unexpected call");
            let body: BodyStream = if reply.pending {
                use futures_util::StreamExt;
                Box::pin(
                    futures_util::stream::iter(reply.chunks.into_iter().map(Ok))
                        .chain(futures_util::stream::pending()),
                )
            } else {
                Box::pin(futures_util::stream::iter(reply.chunks.into_iter().map(Ok)))
            };
            Ok(HttpResponse {
                status: reply.status,
                headers: reply.headers,
                body,
            })
        })
    }
}
fn config_retry() -> ClientConfig {
    ClientConfig {
        retry: RetryPolicy {
            max_retries: 1,
            base_delay: Duration::ZERO,
            max_delay: Duration::ZERO,
        },
        ..Default::default()
    }
}
#[test]
fn all_493_named_operations_have_fixed_https_origins_and_sources() {
    let lists = [
        context::OPERATIONS,
        exa::OPERATIONS,
        tavily::OPERATIONS,
        brave::OPERATIONS,
        tinyfish::OPERATIONS,
        perplexity::OPERATIONS,
        parallel::OPERATIONS,
        linkup::OPERATIONS,
        firecrawl::OPERATIONS,
        you::OPERATIONS,
        wondersearch::OPERATIONS,
        serper::OPERATIONS,
        serpapi::OPERATIONS,
    ];
    assert_eq!(lists.iter().map(|l| l.len()).sum::<usize>(), 493);
    assert_eq!(OPERATION_COUNT, 493);
    let sources: Value = serde_json::from_str(include_str!("../retained/operations.json")).unwrap();
    assert_eq!(sources.as_array().unwrap().len(), 493);
    for list in lists {
        let mut names = std::collections::BTreeSet::new();
        for op in list {
            assert!(names.insert(op.name));
            assert!(op.base.starts_with("https://"));
            assert!(op.path.starts_with('/'));
            assert!(!op.path.starts_with("//"));
            if ["POST", "PATCH", "PUT", "DELETE"].contains(&op.method) {
                assert!(!op.retryable);
            }
            assert!(sources.as_array().unwrap().iter().any(|s| {
                s["provider"] == op.provider
                    && s["name"] == op.name
                    && s["source"]
                        .as_str()
                        .is_some_and(|v| v.starts_with("https://"))
            }));
        }
    }
}
#[tokio::test]
async fn typed_native_json_and_unknown_fields_roundtrip() {
    let reply = json!({"search_metadata":{"id":"fixture","status":"Success","futureMetadata":4},"organic_results":[{"title":"title","link":"https://example.com","future":"kept"}],"unknown":{"a":1}});
    let script = Script::new(vec![Reply::json(reply.clone())]);
    let client =
        SerpApiClient::with_transport("secret-key", ClientConfig::default(), script.clone())
            .unwrap();
    let input = SerpApiSearchInput {
        query: serde_json::from_value(
            json!({"engine":"google","q":"private-query","custom_engine_option":true}),
        )
        .unwrap(),
        ..Default::default()
    };
    let r = client.search(&input, CallOptions::default()).await.unwrap();
    assert_eq!(
        r.data.search_metadata.as_ref().unwrap().id.as_deref(),
        Some("fixture")
    );
    assert_eq!(serde_json::to_value(r.data).unwrap(), reply);
    let calls = script.calls.lock().unwrap();
    let q = calls[0]
        .url
        .query_pairs()
        .into_owned()
        .collect::<std::collections::BTreeMap<_, _>>();
    assert_eq!(q["api_key"], "secret-key");
    assert_eq!(q["custom_engine_option"], "true");
    assert!(!calls[0].headers.contains_key("authorization"));
}
#[tokio::test]
async fn fixed_auth_path_encoding_and_query_serialization() {
    let script = Script::new(vec![Reply {
        status: 404,
        ..Reply::json(json!({}))
    }]);
    let client = ExaClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    let input = ExaGetMonitorInput {
        path: serde_json::from_value(json!({"id":"segment/with?x=# y"})).unwrap(),
        ..Default::default()
    };
    assert_eq!(
        client
            .get_monitor(&input, CallOptions::default())
            .await
            .err()
            .unwrap()
            .code,
        ErrorCode::ProviderError
    );
    {
        let calls = script.calls.lock().unwrap();
        assert_eq!(calls[0].url.host_str(), Some("api.exa.ai"));
        assert!(calls[0].url.path().contains("segment%2Fwith%3Fx%3D%23%20y"));
        assert_eq!(calls[0].headers["x-api-key"], "key");
    }
    let script = Script::new(vec![Reply {
        status: 404,
        ..Reply::json(json!({}))
    }]);
    let client =
        ContextClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    let input = ContextListLogsInput {
        query: Some(serde_json::from_value(json!({"tags":"a,b"})).unwrap()),
        ..Default::default()
    };
    let _ = client.list_logs(&input, CallOptions::default()).await;
    assert_eq!(
        script.calls.lock().unwrap()[0]
            .url
            .query_pairs()
            .find(|(k, _)| k == "tags")
            .unwrap()
            .1,
        "a,b"
    );
    let script = Script::new(vec![Reply {
        status: 404,
        ..Reply::json(json!({}))
    }]);
    let client =
        BraveClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    let input = BraveSearchInput {
        query: serde_json::from_value(
            json!({"q":"fixture","result_filter":["web","news"],"goggles":["one","two"]}),
        )
        .unwrap(),
        ..Default::default()
    };
    let _ = client.search(&input, CallOptions::default()).await;
    let calls = script.calls.lock().unwrap();
    assert_eq!(
        calls[0]
            .url
            .query_pairs()
            .filter(|(k, _)| k == "goggles")
            .count(),
        2
    );
    assert_eq!(
        calls[0]
            .url
            .query_pairs()
            .find(|(k, _)| k == "result_filter")
            .unwrap()
            .1,
        "web,news"
    );
}
#[tokio::test]
async fn rejects_credential_override_and_invalid_paths_without_dispatch() {
    let script = Script::new(vec![]);
    let client =
        ExaClient::with_transport("private-key", ClientConfig::default(), script.clone()).unwrap();
    for id in [".", "..", ""] {
        let input = ExaGetMonitorInput {
            path: serde_json::from_value(json!({"id":id})).unwrap(),
            ..Default::default()
        };
        assert_eq!(
            client
                .get_monitor(&input, CallOptions::default())
                .await
                .err()
                .unwrap()
                .code,
            ErrorCode::InvalidRequest
        );
    }
    for k in [
        "Authorization",
        "X-API-Key",
        "Cookie",
        "Host",
        "Content-Length",
        "Proxy-Authorization",
    ] {
        let mut input = ExaGetMonitorInput {
            path: serde_json::from_value(json!({"id":"fixture"})).unwrap(),
            ..Default::default()
        };
        input.headers.insert(k.into(), "attacker-key".into());
        let e = client
            .get_monitor(&input, CallOptions::default())
            .await
            .err()
            .unwrap();
        assert_eq!(e.code, ErrorCode::InvalidRequest);
        assert!(!format!("{e:?}").contains("key"));
    }
    let client =
        SerpApiClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    for k in ["api_key", "output"] {
        let input = SerpApiSearchInput {
            query: serde_json::from_value(json!({"engine":"google",k:"override"})).unwrap(),
            ..Default::default()
        };
        assert_eq!(
            client
                .search(&input, CallOptions::default())
                .await
                .err()
                .unwrap()
                .code,
            ErrorCode::InvalidRequest
        );
    }
    assert!(script.calls.lock().unwrap().is_empty());
}
#[tokio::test]
async fn no_mutation_retry_and_opt_in_read_retry() {
    let mut failure = Reply::json(json!({"message":"upstream-private-key-query"}));
    failure.status = 503;
    let script = Script::new(vec![failure]);
    let client = ExaClient::with_transport("private-key", config_retry(), script.clone()).unwrap();
    let input = ExaSearchInput {
        body: serde_json::from_value(json!({"query":"private-query"})).unwrap(),
        ..Default::default()
    };
    let e = client
        .search(&input, CallOptions::default())
        .await
        .err()
        .unwrap();
    assert_eq!(e.code, ErrorCode::Unavailable);
    assert_eq!(script.calls.lock().unwrap().len(), 1);
    assert!(!format!("{e:?} {e}").contains("private"));
    let script = Script::new(vec![
        Reply {
            status: 503,
            ..Reply::json(json!({}))
        },
        Reply {
            status: 401,
            ..Reply::json(json!({}))
        },
    ]);
    let client = SerpApiClient::with_transport("key", config_retry(), script.clone()).unwrap();
    let e = client
        .account(&SerpApiAccountInput::default(), CallOptions::default())
        .await
        .err()
        .unwrap();
    assert_eq!(e.code, ErrorCode::Auth);
    assert_eq!(script.calls.lock().unwrap().len(), 2);
}
#[tokio::test]
async fn json_schema_required_fields_and_type_mismatches() {
    let script = Script::new(vec![
        Reply::json(json!({})),
        Reply::json(json!({"requestId":false,"results":[]})),
    ]);
    let client = ContextClient::with_transport("key", ClientConfig::default(), script).unwrap();
    let input = ContextSearchInput {
        body: serde_json::from_value(json!({"query":"fixture"})).unwrap(),
        ..Default::default()
    };
    for _ in 0..2 {
        assert_eq!(
            client
                .search(&input, CallOptions::default())
                .await
                .err()
                .unwrap()
                .code,
            ErrorCode::InvalidResponse
        );
    }
}
#[tokio::test]
async fn context_logo_building_and_head_are_key_free() {
    let script = Script::new(vec![Reply::json(json!(null))]);
    let client =
        ContextClient::with_transport("private-key", ClientConfig::default(), script.clone())
            .unwrap();
    let input = ContextLogoUrlInput {
        query: serde_json::from_value(
            json!({"publicClientId":"public-client","domain":"example.com","theme":"dark"}),
        )
        .unwrap(),
        ..Default::default()
    };
    let url = client.logo_url(&input).unwrap();
    assert!(url.starts_with("https://logos.context.dev/"));
    assert!(!url.contains("private-key"));
    assert!(script.calls.lock().unwrap().is_empty());
    let input = ContextHeadLogoInput {
        query: serde_json::from_value(
            json!({"publicClientId":"public-client","domain":"example.com"}),
        )
        .unwrap(),
        ..Default::default()
    };
    let _ = client
        .head_logo(&input, CallOptions::default())
        .await
        .unwrap();
    let calls = script.calls.lock().unwrap();
    assert!(!calls[0].headers.contains_key("authorization"));
}
#[tokio::test]
async fn externally_authorized_x402_and_keyless_mode() {
    let script = Script::new(vec![Reply {
        status: 402,
        ..Reply::json(json!({"payment":"challenge"}))
    }]);
    let client =
        TavilyClient::with_transport("private-api-key", config_retry(), script.clone()).unwrap();
    let mut input = TavilyPaidSearchInput {
        body: serde_json::from_value(json!({"query":"fixture","search_depth":"advanced"})).unwrap(),
        ..Default::default()
    };
    input
        .headers
        .insert("PAYMENT-SIGNATURE".into(), "external-signature".into());
    let e = client
        .paid_search(&input, CallOptions::default())
        .await
        .err()
        .unwrap();
    assert_eq!(e.code, ErrorCode::Auth);
    assert!(!format!("{e:?}").contains("external-signature"));
    {
        let calls = script.calls.lock().unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].url.host_str(), Some("x402.tavily.com"));
        assert!(!calls[0].headers.contains_key("authorization"));
        assert_eq!(calls[0].headers["payment-signature"], "external-signature");
    }
    let script = Script::new(vec![Reply {
        status: 401,
        ..Reply::json(json!({}))
    }]);
    let client = TavilyClient::keyless(ClientConfig::default(), script.clone()).unwrap();
    let input = TavilySearchInput {
        body: serde_json::from_value(json!({"query":"fixture"})).unwrap(),
        ..Default::default()
    };
    let _ = client.search(&input, CallOptions::default()).await;
    assert_eq!(
        script.calls.lock().unwrap()[0].headers["x-tavily-access-mode"],
        "keyless"
    );
    let e = client
        .get_usage(&TavilyGetUsageInput::default(), CallOptions::default())
        .await
        .err()
        .unwrap();
    assert_eq!(e.code, ErrorCode::Configuration);
}
#[tokio::test]
async fn raw_multipart_and_secret_query_pinning() {
    let script = Script::new(vec![Reply::json(json!({"image_id":"fixture"}))]);
    let client =
        SerpApiClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    let part = MultipartPart {
        name: "image".into(),
        bytes: vec![1, 2, 3],
        filename: Some("fixture.png".into()),
        content_type: Some("image/png".into()),
    };
    let input = SerpApiUploadImageInput {
        raw_body: RawBody::Multipart(vec![part]),
        ..Default::default()
    };
    assert_eq!(
        client
            .upload_image(&input, CallOptions::default())
            .await
            .unwrap()
            .data
            .image_id
            .as_deref(),
        Some("fixture")
    );
    {
        let calls = script.calls.lock().unwrap();
        let RequestBody::Multipart(p) = &calls[0].body else {
            panic!("multipart expected")
        };
        assert_eq!(p.len(), 2);
        assert_eq!(p[1].name, "api_key");
        assert_eq!(p[1].bytes, b"key");
    }
    let script = Script::new(vec![Reply {
        status: 400,
        ..Reply::json(json!({}))
    }]);
    let client =
        FirecrawlClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    let input = FirecrawlParseFileInput {
        raw_body: RawBody::Multipart(vec![MultipartPart {
            name: "file".into(),
            bytes: b"fixture".to_vec(),
            filename: Some("fixture.txt".into()),
            content_type: Some("text/plain".into()),
        }]),
        ..Default::default()
    };
    let _ = client.parse_file(&input, CallOptions::default()).await;
    assert!(matches!(
        script.calls.lock().unwrap()[0].body,
        RequestBody::Multipart(_)
    ));
}
#[tokio::test]
async fn incremental_sse_utf8_multiline_bom_crlf_and_incomplete_event() {
    let bytes = "\u{feff}: comment\r\nid: first\r\nevent: token\r\nretry: 100\r\ndata: héllo\r\ndata: 世界\r\n\r\ndata: next\n\ndata: incomplete";
    let script = Script::new(vec![Reply::sse(bytes.as_bytes(), 1)]);
    let client =
        TavilyClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
    let input = TavilyResearchStreamInput {
        body: serde_json::from_value(json!({"input":"fixture"})).unwrap(),
        ..Default::default()
    };
    let mut response = client
        .research_stream(&input, CallOptions::default())
        .await
        .unwrap();
    let e = response.data.next().await.unwrap().unwrap();
    assert_eq!(e.data, "héllo\n世界");
    assert_eq!(e.event.as_deref(), Some("token"));
    assert_eq!(e.id.as_deref(), Some("first"));
    assert_eq!(e.retry, Some(100));
    let e = response.data.next().await.unwrap().unwrap();
    assert_eq!(e.data, "next");
    assert_eq!(e.id.as_deref(), Some("first"));
    assert!(response.data.next().await.unwrap().is_none());
    let calls = script.calls.lock().unwrap();
    let RequestBody::Bytes(body) = &calls[0].body else {
        panic!()
    };
    assert_eq!(
        serde_json::from_slice::<Value>(body).unwrap()["stream"],
        true
    );
    assert_eq!(calls[0].headers["accept"], "text/event-stream");
}
#[tokio::test]
async fn sse_cancellation_lifetime_deadline_limits_and_early_drop() {
    let mut reply = Reply::sse(b"data: first\n\n", 2);
    reply.pending = true;
    let script = Script::new(vec![reply]);
    let client = TavilyClient::with_transport("key", ClientConfig::default(), script).unwrap();
    let input = TavilyResearchStreamInput {
        body: serde_json::from_value(json!({"input":"fixture"})).unwrap(),
        ..Default::default()
    };
    let token = CancellationToken::new();
    let mut r = client
        .research_stream(
            &input,
            CallOptions {
                cancellation: token.clone(),
                timeout: None,
            },
        )
        .await
        .unwrap();
    assert!(r.data.next().await.unwrap().is_some());
    token.cancel();
    assert_eq!(r.data.next().await.unwrap_err().code, ErrorCode::Aborted);
    let mut reply = Reply::sse(b"", 1);
    reply.pending = true;
    let script = Script::new(vec![reply]);
    let client = TavilyClient::with_transport("key", ClientConfig::default(), script).unwrap();
    let mut r = client
        .research_stream(
            &input,
            CallOptions {
                timeout: Some(Duration::from_millis(5)),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    assert_eq!(r.data.next().await.unwrap_err().code, ErrorCode::Timeout);
    let script = Script::new(vec![Reply::sse(b"data: excessive\n\n", 3)]);
    let client = TavilyClient::with_transport(
        "key",
        ClientConfig {
            max_response_bytes: 5,
            ..Default::default()
        },
        script,
    )
    .unwrap();
    let mut r = client
        .research_stream(&input, CallOptions::default())
        .await
        .unwrap();
    assert_eq!(
        r.data.next().await.unwrap_err().code,
        ErrorCode::InvalidResponse
    );
    let mut pending = Reply::sse(b"", 1);
    pending.pending = true;
    let script = Script::new(vec![pending, Reply::sse(b"data: next\n\n", 1)]);
    let client = TavilyClient::with_transport(
        "key",
        ClientConfig {
            max_concurrency: 1,
            ..Default::default()
        },
        script,
    )
    .unwrap();
    let r = client
        .research_stream(&input, CallOptions::default())
        .await
        .unwrap();
    drop(r);
    let mut r = client
        .research_stream(
            &input,
            CallOptions {
                timeout: Some(Duration::from_millis(100)),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    assert_eq!(r.data.next().await.unwrap().unwrap().data, "next");
}

#[tokio::test]
async fn idle_stream_deadline_releases_transport_without_polling() {
    let mut pending = Reply::sse(b"", 1);
    pending.pending = true;
    let script = Script::new(vec![pending, Reply::json(json!({"pricing":"fixture"}))]);
    let client = TavilyClient::with_transport(
        "key",
        ClientConfig {
            max_concurrency: 1,
            ..Default::default()
        },
        script,
    )
    .unwrap();
    let input = TavilyResearchStreamInput {
        body: serde_json::from_value(json!({"input":"fixture"})).unwrap(),
        ..Default::default()
    };
    let _idle = client
        .research_stream(
            &input,
            CallOptions {
                timeout: Some(Duration::from_millis(5)),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    tokio::time::sleep(Duration::from_millis(15)).await;
    let result = client
        .get_payment_pricing(
            &TavilyGetPaymentPricingInput::default(),
            CallOptions {
                timeout: Some(Duration::from_millis(100)),
                ..Default::default()
            },
        )
        .await;
    assert!(result.is_ok());
}

#[test]
fn native_nullable_fields_preserve_absence_and_explicit_null() {
    let explicit: ExaSchemaSearchRequest =
        serde_json::from_value(json!({"query":"fixture","userIdentifier":null})).unwrap();
    assert_eq!(explicit.user_identifier, Some(None));
    assert_eq!(
        serde_json::to_value(explicit).unwrap(),
        json!({"query":"fixture","userIdentifier":null})
    );
    let absent: ExaSchemaSearchRequest =
        serde_json::from_value(json!({"query":"fixture"})).unwrap();
    assert_eq!(absent.user_identifier, None);
    let valid: ContextSearchResponseResultsItemMarkdown =
        serde_json::from_value(json!({"markdown":null,"code":"NOT_REQUESTED"})).unwrap();
    assert_eq!(
        serde_json::to_value(valid).unwrap(),
        json!({"markdown":null,"code":"NOT_REQUESTED"})
    );
    assert!(
        serde_json::from_value::<ContextSearchResponseResultsItemMarkdown>(
            json!({"code":"NOT_REQUESTED"})
        )
        .is_err()
    );
}

#[tokio::test]
async fn head_logo_does_not_treat_resource_size_as_downloaded_bytes() {
    let mut reply = Reply::json(json!(null));
    reply.chunks.clear();
    reply
        .headers
        .insert("content-length", "100000000".parse().unwrap());
    let script = Script::new(vec![reply]);
    let client = ContextClient::with_transport(
        "key",
        ClientConfig {
            max_response_bytes: 4,
            ..Default::default()
        },
        script,
    )
    .unwrap();
    let input = ContextHeadLogoInput {
        query: serde_json::from_value(json!({"publicClientId":"public","domain":"example.com"}))
            .unwrap(),
        ..Default::default()
    };
    let result = client
        .head_logo(&input, CallOptions::default())
        .await
        .unwrap();
    assert!(result.data.bytes.is_empty());
    assert_eq!(result.data.headers["content-length"], "100000000");
}

#[tokio::test]
async fn tinyfish_http_streaming_does_not_override_synthesis_delta_setting() {
    use searchsdk::native::{TinyfishClient, tinyfish::TinyfishRunResearchInput};
    for body in [
        json!({"query":"fixture"}),
        json!({"query":"fixture","stream":false}),
        json!({"query":"fixture","stream":true}),
    ] {
        let script = Script::new(vec![Reply::sse(b"data: fixture\n\n", 1)]);
        let client =
            TinyfishClient::with_transport("key", ClientConfig::default(), script.clone()).unwrap();
        let input = TinyfishRunResearchInput {
            body: serde_json::from_value(body.clone()).unwrap(),
            ..Default::default()
        };
        let response = client
            .run_research(&input, CallOptions::default())
            .await
            .unwrap();
        let calls = script.calls.lock().unwrap();
        assert_eq!(calls[0].headers["accept"], "text/event-stream");
        let RequestBody::Bytes(bytes) = &calls[0].body else {
            panic!("JSON body expected")
        };
        assert_eq!(serde_json::from_slice::<Value>(bytes).unwrap(), body);
        drop(response);
    }
}
