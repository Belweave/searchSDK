//! Deterministic packaged-consumer example. Makes no provider or network calls.
use searchsdk::{
    CallOptions, ClientConfig, Gateway, Result, SearchRequest,
    native::{
        SerpApiClient,
        serpapi::{SerpApiSearchInput, SerpApiSearchQuery},
    },
    transport::{BoxFuture, HttpRequest, HttpResponse, Transport},
};
use std::sync::Arc;
struct Fixture;
impl Transport for Fixture {
    fn send(&self, request: HttpRequest) -> BoxFuture<'_, Result<HttpResponse>> {
        Box::pin(async move {
            let body: &[u8] = if request.url.host_str() == Some("serpapi.com") {
                br#"{"search_metadata":{"id":"fixture-id","status":"Success"},"organic_results":[{"title":"Synthetic","link":"https://example.com"}]}"#
            } else {
                br#"{"provider":"fixture","results":[{"url":"https://example.com","provenance":{"provider":"fixture","sourceUrl":"https://example.com","retrievedAt":"2026-10-22T00:00:00Z"}}],"usage":null,"warnings":[],"attempts":[]}"#
            };
            Ok(HttpResponse::bytes(200, Default::default(), body.to_vec()))
        })
    }
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let gateway = Gateway::with_transport(
        "https://application.example/search",
        ClientConfig::default(),
        Arc::new(Fixture),
    )?;
    let result = gateway
        .search(
            SearchRequest::new("synthetic query"),
            None,
            CallOptions::default(),
        )
        .await?;
    assert_eq!(result.results.len(), 1);
    let native =
        SerpApiClient::with_transport("synthetic-key", ClientConfig::default(), Arc::new(Fixture))?;
    let request = SerpApiSearchInput {
        query: SerpApiSearchQuery {
            engine: "google".into(),
            q: Some("synthetic query".into()),
            ..Default::default()
        },
        ..Default::default()
    };
    let response = native.search(&request, CallOptions::default()).await?;
    assert_eq!(
        response
            .data
            .search_metadata
            .as_ref()
            .and_then(|m| m.id.as_deref()),
        Some("fixture-id")
    );
    assert_eq!(searchsdk::native::OPERATION_COUNT, 493);
    println!("packaged consumer: gateway v1 and typed native client passed");
    Ok(())
}
