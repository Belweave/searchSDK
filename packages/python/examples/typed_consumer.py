"""Static type-checking example; functions make no calls unless explicitly invoked."""

from searchsdk import AsyncExaClient, BraveClient, ExaClient, SerpapiClient


def search_native(exa: ExaClient, brave: BraveClient, serpapi: SerpapiClient) -> None:
    exa.search(body={"query": "synthetic", "numResults": 3})
    brave.search(query={"q": "synthetic", "count": 3})
    serpapi.search(query={"engine": "google", "q": "synthetic", "no_cache": False})
    serpapi.get_search(path={"search_id": "fixture-id"})


async def search_native_async(exa: AsyncExaClient) -> None:
    result = await exa.search(body={"query": "synthetic"})
    for row in result.data["results"]:
        url: str = row["url"]
        assert url
