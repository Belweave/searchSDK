//! Real sockets and Reqwest; explicitly routed to loopback by an injected transport.
//! Production endpoint validation still requires HTTPS and never accepts overrides.
use searchsdk::{
    native::{serpapi::*, tavily::*},
    transport::*,
    *,
};
use std::{io::Write, sync::Arc, time::Duration};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::oneshot,
};
struct Route {
    base: url::Url,
    http: ReqwestTransport,
}
impl Transport for Route {
    fn send(&self, mut r: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        // Assert that the SDK supplied the fixed HTTPS origin before test-only routing.
        assert_eq!(r.url.scheme(), "https");
        r.url.set_scheme("http").unwrap();
        r.url.set_host(self.base.host_str()).unwrap();
        r.url.set_port(self.base.port()).unwrap();
        self.http.send(r)
    }
}
async fn request(socket: &mut TcpStream) -> Vec<u8> {
    let mut bytes = Vec::new();
    let mut expected = None;
    loop {
        let mut buffer = [0u8; 4096];
        let n = socket.read(&mut buffer).await.unwrap();
        if n == 0 {
            break;
        }
        bytes.extend_from_slice(&buffer[..n]);
        if expected.is_none()
            && let Some(end) = bytes.windows(4).position(|x| x == b"\r\n\r\n")
        {
            let head = String::from_utf8_lossy(&bytes[..end]);
            let length = head.lines().find_map(|l| {
                l.to_ascii_lowercase()
                    .strip_prefix("content-length:")
                    .map(|s| s.trim().parse::<usize>().unwrap())
            });
            expected = Some(end + 4 + length.unwrap_or(0));
        }
        if expected.is_some_and(|n| bytes.len() >= n) {
            return bytes;
        }
    }
    bytes
}
async fn server(
    response: Vec<u8>,
) -> (
    Arc<Route>,
    oneshot::Receiver<Vec<u8>>,
    tokio::task::JoinHandle<()>,
) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let (sender, receiver) = oneshot::channel();
    let task = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let r = request(&mut socket).await;
        sender.send(r).unwrap();
        socket.write_all(&response).await.unwrap();
        socket.shutdown().await.unwrap();
    });
    (
        Arc::new(Route {
            base: url::Url::parse(&format!("http://127.0.0.1:{port}")).unwrap(),
            http: ReqwestTransport::new().unwrap(),
        }),
        receiver,
        task,
    )
}
fn response(status: &str, headers: &str, body: &[u8]) -> Vec<u8> {
    let mut r = format!(
        "HTTP/1.1 {status}\r\nContent-Length: {}\r\n{headers}Connection: close\r\n\r\n",
        body.len()
    )
    .into_bytes();
    r.extend_from_slice(body);
    r
}
#[tokio::test]
async fn actual_gateway_post_and_chunked_response() {
    let body = include_bytes!("fixtures/search-success.json");
    let mut r=b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nX-SearchSDK-Protocol: 1\r\nConnection: close\r\n\r\n".to_vec();
    for chunk in body.chunks(7) {
        r.extend_from_slice(format!("{:x}\r\n", chunk.len()).as_bytes());
        r.extend_from_slice(chunk);
        r.extend_from_slice(b"\r\n");
    }
    r.extend_from_slice(b"0\r\n\r\n");
    let (route, received, task) = server(r).await;
    let g = Gateway::with_transport(
        "https://app.example/exact-path",
        ClientConfig::default(),
        route,
    )
    .unwrap();
    let r = g
        .search(
            SearchRequest::new("fixture query"),
            Some("application-token"),
            CallOptions::default(),
        )
        .await
        .unwrap();
    assert_eq!(r.provider, "fixture");
    let bytes = received.await.unwrap();
    let request = String::from_utf8(bytes).unwrap();
    assert!(request.starts_with("POST /exact-path HTTP/1.1\r\n"));
    assert!(request.contains("authorization: Bearer application-token\r\n"));
    assert!(request.contains("\"limit\":5"));
    task.await.unwrap();
}
#[tokio::test]
async fn actual_redirect_does_not_forward_credentials() {
    let target = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let location = format!(
        "Location: http://127.0.0.1:{}/stolen\r\n",
        target.local_addr().unwrap().port()
    );
    let (route, received, task) =
        server(response("302 Found", &location, b"private-provider-body")).await;
    let g = Gateway::with_transport("https://app.example", ClientConfig::default(), route).unwrap();
    let e = g
        .search(
            SearchRequest::new("private-query"),
            Some("private-token"),
            CallOptions::default(),
        )
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::ProviderError);
    assert!(!format!("{e:?}").contains("private"));
    let _ = received.await.unwrap();
    task.await.unwrap();
    assert!(
        tokio::time::timeout(Duration::from_millis(40), target.accept())
            .await
            .is_err()
    );
}
#[tokio::test]
async fn gzip_counts_decoded_bytes_not_wire_size() {
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(&vec![b'a'; 16_000]).unwrap();
    let compressed = encoder.finish().unwrap();
    assert!(compressed.len() < 100);
    let (route, received, task) = server(response(
        "200 OK",
        "Content-Encoding: gzip\r\n",
        &compressed,
    ))
    .await;
    let g = Gateway::with_transport(
        "https://app.example",
        ClientConfig {
            max_response_bytes: 1024,
            ..Default::default()
        },
        route,
    )
    .unwrap();
    assert_eq!(
        g.search(SearchRequest::new("x"), None, CallOptions::default())
            .await
            .unwrap_err()
            .code,
        ErrorCode::InvalidResponse
    );
    let _ = received.await.unwrap();
    task.await.unwrap();
}
#[tokio::test]
async fn actual_text_and_multipart_native_requests() {
    let (route, received, task) = server(response(
        "200 OK",
        "Content-Type: text/html\r\n",
        b"<main>fixture</main>",
    ))
    .await;
    let c = SerpApiClient::with_transport("fixture-key", ClientConfig::default(), route).unwrap();
    let input = SerpApiSearchHtmlInput {
        query: serde_json::from_value(serde_json::json!({"engine":"google","q":"a & b"})).unwrap(),
        ..Default::default()
    };
    assert_eq!(
        c.search_html(&input, CallOptions::default())
            .await
            .unwrap()
            .data,
        "<main>fixture</main>"
    );
    let wire = String::from_utf8(received.await.unwrap()).unwrap();
    assert!(wire.starts_with("GET /search.html?"));
    assert!(wire.contains("api_key=fixture-key"));
    task.await.unwrap();
    let (route, received, task) = server(response(
        "200 OK",
        "Content-Type: application/json\r\n",
        b"{\"image_id\":\"fixture\"}",
    ))
    .await;
    let c = SerpApiClient::with_transport("fixture-key", ClientConfig::default(), route).unwrap();
    let input = SerpApiUploadImageInput {
        raw_body: searchsdk::native::RawBody::Multipart(vec![MultipartPart {
            name: "image".into(),
            bytes: b"image-bytes".to_vec(),
            filename: Some("fixture.png".into()),
            content_type: Some("image/png".into()),
        }]),
        ..Default::default()
    };
    assert_eq!(
        c.upload_image(&input, CallOptions::default())
            .await
            .unwrap()
            .data
            .image_id
            .as_deref(),
        Some("fixture")
    );
    let wire = String::from_utf8(received.await.unwrap()).unwrap();
    assert!(wire.contains("multipart/form-data; boundary="));
    assert!(wire.contains("name=\"image\"; filename=\"fixture.png\""));
    assert!(wire.contains("name=\"api_key\"\r\n\r\nfixture-key"));
    task.await.unwrap();
}
#[tokio::test]
async fn actual_raw_response_and_sanitized_network_error() {
    let (route, received, task) = server(response(
        "200 OK",
        "X-Request-ID: fixture-id\r\nContent-Type: application/json\r\n",
        b"{\"pricing\":3}",
    ))
    .await;
    let c = TavilyClient::with_transport("private-key", ClientConfig::default(), route).unwrap();
    let r = c
        .get_payment_pricing(
            &TavilyGetPaymentPricingInput::default(),
            CallOptions::default(),
        )
        .await
        .unwrap();
    assert_eq!(r.data.bytes, b"{\"pricing\":3}");
    assert_eq!(r.metadata.request_id.as_deref(), Some("fixture-id"));
    let wire = String::from_utf8(received.await.unwrap()).unwrap();
    assert!(!wire.contains("private-key"));
    task.await.unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);
    let route = Arc::new(Route {
        base: url::Url::parse(&format!("http://127.0.0.1:{port}")).unwrap(),
        http: ReqwestTransport::new().unwrap(),
    });
    let g = Gateway::with_transport("https://app.example", ClientConfig::default(), route).unwrap();
    let e = g
        .search(
            SearchRequest::new("private-query"),
            Some("private-key"),
            CallOptions::default(),
        )
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::Network);
    assert!(!format!("{e:?} {e}").contains("private"));
}
#[tokio::test]
async fn actual_slow_body_deadline_closes_socket() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let task = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let _ = request(&mut socket).await;
        socket
            .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 100000\r\n\r\n{")
            .await
            .unwrap();
        let mut b = [0u8; 1];
        tokio::time::timeout(Duration::from_secs(1), socket.read(&mut b))
            .await
            .unwrap()
            .unwrap()
    });
    let route = Arc::new(Route {
        base: url::Url::parse(&format!("http://127.0.0.1:{port}")).unwrap(),
        http: ReqwestTransport::new().unwrap(),
    });
    let g = Gateway::with_transport(
        "https://app.example",
        ClientConfig {
            max_response_bytes: 200_000,
            ..Default::default()
        },
        route,
    )
    .unwrap();
    let e = g
        .search(
            SearchRequest::new("x"),
            None,
            CallOptions {
                timeout: Some(Duration::from_millis(20)),
                ..Default::default()
            },
        )
        .await
        .unwrap_err();
    assert_eq!(e.code, ErrorCode::Timeout);
    assert_eq!(task.await.unwrap(), 0);
}

#[tokio::test]
async fn actual_native_binary_response_preserves_bytes() {
    use searchsdk::native::{
        WonderSearchClient, wondersearch::WonderSearchGetDriveDocumentSourceInput,
    };
    let content = b"\x00\xff\x01\xfe";
    let (route, received, task) = server(response(
        "200 OK",
        "Content-Type: application/octet-stream\r\n",
        content,
    ))
    .await;
    let client =
        WonderSearchClient::with_transport("fixture-key", ClientConfig::default(), route).unwrap();
    let input = WonderSearchGetDriveDocumentSourceInput {
        path: serde_json::from_value(
            serde_json::json!({"drive_id":"drive","document_id":"document"}),
        )
        .unwrap(),
        ..Default::default()
    };
    assert_eq!(
        client
            .get_drive_document_source(&input, CallOptions::default())
            .await
            .unwrap()
            .data,
        content
    );
    let request = String::from_utf8(received.await.unwrap()).unwrap();
    assert!(request.starts_with("GET /v1/drives/drive/documents/document/source HTTP/1.1"));
    task.await.unwrap();
}
