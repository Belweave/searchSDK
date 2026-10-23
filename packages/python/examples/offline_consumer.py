"""Run against an installed wheel; injected fixtures only, no network or provider charges."""

from __future__ import annotations
import asyncio
from searchsdk import (
    AsyncExaClient,
    ExaClient,
    FirecrawlClient,
    GatewayClient,
    HttpResponse,
    MultipartBody,
    NativeFile,
    SearchClient,
    exa,
)


def fixture(request, context):
    context.check()
    return HttpResponse.json(
        {
            "requestId": "fixture-request",
            "results": [
                {
                    "url": "https://example.com/source",
                    "title": "Synthetic source",
                    "highlights": ["Fixture excerpt"],
                }
            ],
        }
    )


def main() -> None:
    response = SearchClient(exa("fixture-key", transport=fixture)).search(
        {"query": "synthetic", "limit": 1}
    )
    assert response.results[0].provenance.request_id == "fixture-request"
    assert response.usage is None
    gateway = GatewayClient(
        "https://application.example.com/search",
        transport=lambda r, c: HttpResponse.json(
            response.to_dict(), headers={"X-SearchSDK-Protocol": "1"}
        ),
    )
    assert gateway.search("synthetic", token="fixture-app-token").to_dict() == response.to_dict()
    assert (
        ExaClient("fixture-key", transport=fixture)
        .search(body={"query": "synthetic"})
        .data["results"][0]["url"]
        == "https://example.com/source"
    )
    calls = []

    def upload(request, context):
        calls.append(request)
        return HttpResponse.json({"success": True})

    parsed = FirecrawlClient("fixture-key", transport=upload).parse_file(
        raw_body=MultipartBody(
            {"file": NativeFile("fixture.txt", b"Synthetic content", "text/plain")}
        )
    )
    assert parsed.data["success"] is True
    assert b"Synthetic content" in calls[0].body

    async def stream_example() -> None:
        client = AsyncExaClient(
            "fixture-key",
            transport=lambda r, c: HttpResponse(
                200, {"Content-Type": "text/event-stream"}, b"data: fixture\n\n"
            ),
        )
        response = await client.answer_stream(body={"query": "synthetic"})
        async with response.data as stream:
            events = [event.data async for event in stream]
        assert events == ["fixture"]

    asyncio.run(stream_example())
    print("Installed searchsdk consumer passed (deterministic fixtures only).")


if __name__ == "__main__":
    main()
