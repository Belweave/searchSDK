"""Generated named native clients. Run scripts/generate_native.py --check."""
from __future__ import annotations
from typing import Any, Mapping, cast
from . import native_types as nt
from .native import NativeClient, NativeResponse, MultipartBody, RawResponse, SSEStream, UNSET, UnsetType
from .client import RetryPolicy
from .transport import CancellationToken, Transport

class BraveClient(NativeClient):
    """brave provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('brave', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def answers(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveAnswersBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveAnswersResponse]:
        """https://api-dashboard.search.brave.com/api-reference/ai/answers — POST https://api.search.brave.com/res/v1/chat/completions"""
        return cast(NativeResponse[nt.BraveAnswersResponse], self.request('answers', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def answers_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveAnswersStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://api-dashboard.search.brave.com/api-reference/ai/answers — POST https://api.search.brave.com/res/v1/chat/completions"""
        return cast(NativeResponse[SSEStream], self.request('answersStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def images(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveImagesQuery, headers: nt.BraveImagesHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveImagesResponse]:
        """https://api-dashboard.search.brave.com/api-reference/images/image_search — GET https://api.search.brave.com/res/v1/images/search"""
        return cast(NativeResponse[nt.BraveImagesResponse], self.request('images', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def llm_context(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveLlmContextQuery, headers: nt.BraveLlmContextHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveLlmContextResponse]:
        """https://api-dashboard.search.brave.com/api-reference/ai/llm_context/get — GET https://api.search.brave.com/res/v1/llm/context"""
        return cast(NativeResponse[nt.BraveLlmContextResponse], self.request('llmContext', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def llm_context_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveLlmContextPostBody, headers: nt.BraveLlmContextPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveLlmContextPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/ai/llm_context/post — POST https://api.search.brave.com/res/v1/llm/context"""
        return cast(NativeResponse[nt.BraveLlmContextPostResponse], self.request('llmContextPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def local_pois(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveLocalPoisQuery, headers: nt.BraveLocalPoisHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveLocalPoisResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/local_pois — GET https://api.search.brave.com/res/v1/local/pois"""
        return cast(NativeResponse[nt.BraveLocalPoisResponse], self.request('localPois', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def news(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveNewsQuery, headers: nt.BraveNewsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveNewsResponse]:
        """https://api-dashboard.search.brave.com/api-reference/news/news_search/get — GET https://api.search.brave.com/res/v1/news/search"""
        return cast(NativeResponse[nt.BraveNewsResponse], self.request('news', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def news_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveNewsPostBody, headers: nt.BraveNewsPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveNewsPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/news/news_search/post — POST https://api.search.brave.com/res/v1/news/search"""
        return cast(NativeResponse[nt.BraveNewsPostResponse], self.request('newsPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def places(self, *, path: Mapping[str, Any] | None = None, query: nt.BravePlacesQuery | None = None, headers: nt.BravePlacesHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BravePlacesResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/place_search — GET https://api.search.brave.com/res/v1/local/place_search"""
        return cast(NativeResponse[nt.BravePlacesResponse], self.request('places', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def poi_descriptions(self, *, path: Mapping[str, Any] | None = None, query: nt.BravePoiDescriptionsQuery, headers: nt.BravePoiDescriptionsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BravePoiDescriptionsResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/poi_descriptions — GET https://api.search.brave.com/res/v1/local/descriptions"""
        return cast(NativeResponse[nt.BravePoiDescriptionsResponse], self.request('poiDescriptions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def rich(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveRichQuery, headers: nt.BraveRichHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveRichResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/rich_search — GET https://api.search.brave.com/res/v1/web/rich"""
        return cast(NativeResponse[nt.BraveRichResponse], self.request('rich', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveSearchQuery, headers: nt.BraveSearchHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSearchResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/search/get — GET https://api.search.brave.com/res/v1/web/search"""
        return cast(NativeResponse[nt.BraveSearchResponse], self.request('search', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveSearchPostBody, headers: nt.BraveSearchPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSearchPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/search/post — POST https://api.search.brave.com/res/v1/web/search"""
        return cast(NativeResponse[nt.BraveSearchPostResponse], self.request('searchPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def spellcheck(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveSpellcheckQuery, headers: nt.BraveSpellcheckHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSpellcheckResponse]:
        """https://api-dashboard.search.brave.com/api-reference/other/spell_check — GET https://api.search.brave.com/res/v1/spellcheck/search"""
        return cast(NativeResponse[nt.BraveSpellcheckResponse], self.request('spellcheck', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def suggest(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveSuggestQuery, headers: nt.BraveSuggestHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSuggestResponse]:
        """https://api-dashboard.search.brave.com/api-reference/other/suggestions — GET https://api.search.brave.com/res/v1/suggest/search"""
        return cast(NativeResponse[nt.BraveSuggestResponse], self.request('suggest', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def videos(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveVideosQuery, headers: nt.BraveVideosHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveVideosResponse]:
        """https://api-dashboard.search.brave.com/api-reference/videos/video_search/get — GET https://api.search.brave.com/res/v1/videos/search"""
        return cast(NativeResponse[nt.BraveVideosResponse], self.request('videos', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def videos_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveVideosPostBody, headers: nt.BraveVideosPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveVideosPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/videos/video_search/post — POST https://api.search.brave.com/res/v1/videos/search"""
        return cast(NativeResponse[nt.BraveVideosPostResponse], self.request('videosPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncBraveClient(NativeClient):
    """brave provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('brave', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def answers(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveAnswersBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveAnswersResponse]:
        """https://api-dashboard.search.brave.com/api-reference/ai/answers — POST https://api.search.brave.com/res/v1/chat/completions"""
        return cast(NativeResponse[nt.BraveAnswersResponse], await self.request_async('answers', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def answers_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveAnswersStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://api-dashboard.search.brave.com/api-reference/ai/answers — POST https://api.search.brave.com/res/v1/chat/completions"""
        return cast(NativeResponse[SSEStream], await self.request_async('answersStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def images(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveImagesQuery, headers: nt.BraveImagesHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveImagesResponse]:
        """https://api-dashboard.search.brave.com/api-reference/images/image_search — GET https://api.search.brave.com/res/v1/images/search"""
        return cast(NativeResponse[nt.BraveImagesResponse], await self.request_async('images', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def llm_context(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveLlmContextQuery, headers: nt.BraveLlmContextHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveLlmContextResponse]:
        """https://api-dashboard.search.brave.com/api-reference/ai/llm_context/get — GET https://api.search.brave.com/res/v1/llm/context"""
        return cast(NativeResponse[nt.BraveLlmContextResponse], await self.request_async('llmContext', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def llm_context_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveLlmContextPostBody, headers: nt.BraveLlmContextPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveLlmContextPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/ai/llm_context/post — POST https://api.search.brave.com/res/v1/llm/context"""
        return cast(NativeResponse[nt.BraveLlmContextPostResponse], await self.request_async('llmContextPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def local_pois(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveLocalPoisQuery, headers: nt.BraveLocalPoisHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveLocalPoisResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/local_pois — GET https://api.search.brave.com/res/v1/local/pois"""
        return cast(NativeResponse[nt.BraveLocalPoisResponse], await self.request_async('localPois', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def news(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveNewsQuery, headers: nt.BraveNewsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveNewsResponse]:
        """https://api-dashboard.search.brave.com/api-reference/news/news_search/get — GET https://api.search.brave.com/res/v1/news/search"""
        return cast(NativeResponse[nt.BraveNewsResponse], await self.request_async('news', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def news_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveNewsPostBody, headers: nt.BraveNewsPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveNewsPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/news/news_search/post — POST https://api.search.brave.com/res/v1/news/search"""
        return cast(NativeResponse[nt.BraveNewsPostResponse], await self.request_async('newsPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def places(self, *, path: Mapping[str, Any] | None = None, query: nt.BravePlacesQuery | None = None, headers: nt.BravePlacesHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BravePlacesResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/place_search — GET https://api.search.brave.com/res/v1/local/place_search"""
        return cast(NativeResponse[nt.BravePlacesResponse], await self.request_async('places', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def poi_descriptions(self, *, path: Mapping[str, Any] | None = None, query: nt.BravePoiDescriptionsQuery, headers: nt.BravePoiDescriptionsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BravePoiDescriptionsResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/poi_descriptions — GET https://api.search.brave.com/res/v1/local/descriptions"""
        return cast(NativeResponse[nt.BravePoiDescriptionsResponse], await self.request_async('poiDescriptions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def rich(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveRichQuery, headers: nt.BraveRichHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveRichResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/rich_search — GET https://api.search.brave.com/res/v1/web/rich"""
        return cast(NativeResponse[nt.BraveRichResponse], await self.request_async('rich', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveSearchQuery, headers: nt.BraveSearchHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSearchResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/search/get — GET https://api.search.brave.com/res/v1/web/search"""
        return cast(NativeResponse[nt.BraveSearchResponse], await self.request_async('search', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveSearchPostBody, headers: nt.BraveSearchPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSearchPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/web/search/post — POST https://api.search.brave.com/res/v1/web/search"""
        return cast(NativeResponse[nt.BraveSearchPostResponse], await self.request_async('searchPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def spellcheck(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveSpellcheckQuery, headers: nt.BraveSpellcheckHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSpellcheckResponse]:
        """https://api-dashboard.search.brave.com/api-reference/other/spell_check — GET https://api.search.brave.com/res/v1/spellcheck/search"""
        return cast(NativeResponse[nt.BraveSpellcheckResponse], await self.request_async('spellcheck', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def suggest(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveSuggestQuery, headers: nt.BraveSuggestHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveSuggestResponse]:
        """https://api-dashboard.search.brave.com/api-reference/other/suggestions — GET https://api.search.brave.com/res/v1/suggest/search"""
        return cast(NativeResponse[nt.BraveSuggestResponse], await self.request_async('suggest', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def videos(self, *, path: Mapping[str, Any] | None = None, query: nt.BraveVideosQuery, headers: nt.BraveVideosHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveVideosResponse]:
        """https://api-dashboard.search.brave.com/api-reference/videos/video_search/get — GET https://api.search.brave.com/res/v1/videos/search"""
        return cast(NativeResponse[nt.BraveVideosResponse], await self.request_async('videos', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def videos_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.BraveVideosPostBody, headers: nt.BraveVideosPostHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.BraveVideosPostResponse]:
        """https://api-dashboard.search.brave.com/api-reference/videos/video_search/post — POST https://api.search.brave.com/res/v1/videos/search"""
        return cast(NativeResponse[nt.BraveVideosPostResponse], await self.request_async('videosPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class ContextClient(NativeClient):
    """context provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('context', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def answers(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextAnswersBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextAnswersResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/answers"""
        return cast(NativeResponse[nt.ContextAnswersResponse], self.request('answers', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_batch(self, *, path: nt.ContextCancelBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextCancelBatchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/batch/{batch_id}/cancel"""
        return cast(NativeResponse[nt.ContextCancelBatchResponse], self.request('cancelBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def classify_naics(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextClassifyNaicsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextClassifyNaicsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/naics"""
        return cast(NativeResponse[nt.ContextClassifyNaicsResponse], self.request('classifyNaics', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def classify_sic(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextClassifySicQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextClassifySicResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/sic"""
        return cast(NativeResponse[nt.ContextClassifySicResponse], self.request('classifySic', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def crawl(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextCrawlBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextCrawlResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/crawl"""
        return cast(NativeResponse[nt.ContextCrawlResponse], self.request('crawl', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextCreateMonitorResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/monitors"""
        return cast(NativeResponse[nt.ContextCreateMonitorResponse], self.request('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_batch(self, *, path: nt.ContextDeleteBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextDeleteBatchResponse]:
        """https://docs.context.dev/openapi.json — DELETE https://api.context.dev/v1/batch/{batch_id}"""
        return cast(NativeResponse[nt.ContextDeleteBatchResponse], self.request('deleteBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_monitor(self, *, path: nt.ContextDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextDeleteMonitorResponse]:
        """https://docs.context.dev/openapi.json — DELETE https://api.context.dev/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ContextDeleteMonitorResponse], self.request('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def enrich_person(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextEnrichPersonBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextEnrichPersonResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/people/enrich"""
        return cast(NativeResponse[nt.ContextEnrichPersonResponse], self.request('enrichPerson', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextExtractResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/extract"""
        return cast(NativeResponse[nt.ContextExtractResponse], self.request('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def fonts(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextFontsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextFontsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/fonts"""
        return cast(NativeResponse[nt.ContextFontsResponse], self.request('fonts', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_batch(self, *, path: nt.ContextGetBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetBatchResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/batch/{batch_id}"""
        return cast(NativeResponse[nt.ContextGetBatchResponse], self.request('getBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_batch_results(self, *, path: nt.ContextGetBatchResultsPath, query: nt.ContextGetBatchResultsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetBatchResultsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/batch/{batch_id}/results"""
        return cast(NativeResponse[nt.ContextGetBatchResultsResponse], self.request('getBatchResults', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_change(self, *, path: nt.ContextGetChangePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetChangeResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/changes/{change_id}"""
        return cast(NativeResponse[nt.ContextGetChangeResponse], self.request('getChange', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_log(self, *, path: nt.ContextGetLogPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetLogResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/logs/{request_id}"""
        return cast(NativeResponse[nt.ContextGetLogResponse], self.request('getLog', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor(self, *, path: nt.ContextGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetMonitorResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ContextGetMonitorResponse], self.request('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor_limits(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetMonitorLimitsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/limits"""
        return cast(NativeResponse[nt.ContextGetMonitorLimitsResponse], self.request('getMonitorLimits', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor_run(self, *, path: nt.ContextGetMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetMonitorRunResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}/runs/{run_id}"""
        return cast(NativeResponse[nt.ContextGetMonitorRunResponse], self.request('getMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetUsageResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/usage"""
        return cast(NativeResponse[nt.ContextGetUsageResponse], self.request('getUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_usage_history(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextGetUsageHistoryQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetUsageHistoryResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/usage/history"""
        return cast(NativeResponse[nt.ContextGetUsageHistoryResponse], self.request('getUsageHistory', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webhook_delivery(self, *, path: nt.ContextGetWebhookDeliveryPath, query: nt.ContextGetWebhookDeliveryQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetWebhookDeliveryResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/webhooks/deliveries/{delivery_id}"""
        return cast(NativeResponse[nt.ContextGetWebhookDeliveryResponse], self.request('getWebhookDelivery', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def head_logo(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextHeadLogoQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.context.dev/brand/logo-link.md — HEAD https://logos.context.dev/"""
        return cast(NativeResponse[RawResponse], self.request('headLogo', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_account_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListAccountRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListAccountRunsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/runs"""
        return cast(NativeResponse[nt.ContextListAccountRunsResponse], self.request('listAccountRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_batches(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListBatchesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListBatchesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/batch/list"""
        return cast(NativeResponse[nt.ContextListBatchesResponse], self.request('listBatches', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_changes(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListChangesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListChangesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/changes"""
        return cast(NativeResponse[nt.ContextListChangesResponse], self.request('listChanges', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_logs(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListLogsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListLogsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/logs"""
        return cast(NativeResponse[nt.ContextListLogsResponse], self.request('listLogs', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitor_changes(self, *, path: nt.ContextListMonitorChangesPath, query: nt.ContextListMonitorChangesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorChangesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}/changes"""
        return cast(NativeResponse[nt.ContextListMonitorChangesResponse], self.request('listMonitorChanges', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitor_credit_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListMonitorCreditUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorCreditUsageResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/credit-usage"""
        return cast(NativeResponse[nt.ContextListMonitorCreditUsageResponse], self.request('listMonitorCreditUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitor_runs(self, *, path: nt.ContextListMonitorRunsPath, query: nt.ContextListMonitorRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorRunsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}/runs"""
        return cast(NativeResponse[nt.ContextListMonitorRunsResponse], self.request('listMonitorRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors"""
        return cast(NativeResponse[nt.ContextListMonitorsResponse], self.request('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_profiles(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListProfilesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListProfilesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/browser/profiles"""
        return cast(NativeResponse[nt.ContextListProfilesResponse], self.request('listProfiles', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webhook_deliveries(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextListWebhookDeliveriesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListWebhookDeliveriesResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/webhooks/deliveries"""
        return cast(NativeResponse[nt.ContextListWebhookDeliveriesResponse], self.request('listWebhookDeliveries', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webhook_delivery_attempts(self, *, path: nt.ContextListWebhookDeliveryAttemptsPath, query: nt.ContextListWebhookDeliveryAttemptsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListWebhookDeliveryAttemptsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/attempts"""
        return cast(NativeResponse[nt.ContextListWebhookDeliveryAttemptsResponse], self.request('listWebhookDeliveryAttempts', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def logo_url(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextLogoUrlQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://docs.context.dev/brand/logo-link.md — GET https://logos.context.dev/"""
        return cast(NativeResponse[str], self.request('logoUrl', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def map(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextMapQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextMapResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/urls"""
        return cast(NativeResponse[nt.ContextMapResponse], self.request('map', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def parse(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextParseQuery | None = None, raw_body: bytes, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextParseResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/parse"""
        return cast(NativeResponse[nt.ContextParseResponse], self.request('parse', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def prefetch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextPrefetchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextPrefetchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/utility/prefetch"""
        return cast(NativeResponse[nt.ContextPrefetchResponse], self.request('prefetch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_brand(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextRetrieveBrandBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRetrieveBrandResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/brand/retrieve"""
        return cast(NativeResponse[nt.ContextRetrieveBrandResponse], self.request('retrieveBrand', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retry_webhook_delivery(self, *, path: nt.ContextRetryWebhookDeliveryPath, query: Mapping[str, Any] | None = None, body: nt.ContextRetryWebhookDeliveryBody | UnsetType = UNSET, headers: nt.ContextRetryWebhookDeliveryHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRetryWebhookDeliveryResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/retry"""
        return cast(NativeResponse[nt.ContextRetryWebhookDeliveryResponse], self.request('retryWebhookDelivery', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def rotate_monitor_webhook_secret(self, *, path: nt.ContextRotateMonitorWebhookSecretPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRotateMonitorWebhookSecretResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/monitors/{monitor_id}/webhook/rotate-secret"""
        return cast(NativeResponse[nt.ContextRotateMonitorWebhookSecretResponse], self.request('rotateMonitorWebhookSecret', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_monitor_now(self, *, path: nt.ContextRunMonitorNowPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRunMonitorNowResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/monitors/{monitor_id}/run"""
        return cast(NativeResponse[nt.ContextRunMonitorNowResponse], self.request('runMonitorNow', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextScrapeResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/scrape"""
        return cast(NativeResponse[nt.ContextScrapeResponse], self.request('scrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/search"""
        return cast(NativeResponse[nt.ContextSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_brands(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextSearchBrandsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchBrandsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/brand/search"""
        return cast(NativeResponse[nt.ContextSearchBrandsResponse], self.request('searchBrands', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_companies(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSearchCompaniesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchCompaniesResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/company/search"""
        return cast(NativeResponse[nt.ContextSearchCompaniesResponse], self.request('searchCompanies', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_news(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSearchNewsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchNewsResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/news/search"""
        return cast(NativeResponse[nt.ContextSearchNewsResponse], self.request('searchNews', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def styleguide(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextStyleguideQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextStyleguideResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/styleguide"""
        return cast(NativeResponse[nt.ContextStyleguideResponse], self.request('styleguide', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def submit_batch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSubmitBatchBody, headers: nt.ContextSubmitBatchHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSubmitBatchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/batch/submit"""
        return cast(NativeResponse[nt.ContextSubmitBatchResponse], self.request('submitBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def submit_feedback(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSubmitFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSubmitFeedbackResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/feedback"""
        return cast(NativeResponse[nt.ContextSubmitFeedbackResponse], self.request('submitFeedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_monitor(self, *, path: nt.ContextUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ContextUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextUpdateMonitorResponse]:
        """https://docs.context.dev/openapi.json — PATCH https://api.context.dev/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ContextUpdateMonitorResponse], self.request('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncContextClient(NativeClient):
    """context provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('context', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def answers(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextAnswersBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextAnswersResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/answers"""
        return cast(NativeResponse[nt.ContextAnswersResponse], await self.request_async('answers', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_batch(self, *, path: nt.ContextCancelBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextCancelBatchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/batch/{batch_id}/cancel"""
        return cast(NativeResponse[nt.ContextCancelBatchResponse], await self.request_async('cancelBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def classify_naics(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextClassifyNaicsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextClassifyNaicsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/naics"""
        return cast(NativeResponse[nt.ContextClassifyNaicsResponse], await self.request_async('classifyNaics', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def classify_sic(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextClassifySicQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextClassifySicResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/sic"""
        return cast(NativeResponse[nt.ContextClassifySicResponse], await self.request_async('classifySic', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def crawl(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextCrawlBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextCrawlResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/crawl"""
        return cast(NativeResponse[nt.ContextCrawlResponse], await self.request_async('crawl', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextCreateMonitorResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/monitors"""
        return cast(NativeResponse[nt.ContextCreateMonitorResponse], await self.request_async('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_batch(self, *, path: nt.ContextDeleteBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextDeleteBatchResponse]:
        """https://docs.context.dev/openapi.json — DELETE https://api.context.dev/v1/batch/{batch_id}"""
        return cast(NativeResponse[nt.ContextDeleteBatchResponse], await self.request_async('deleteBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_monitor(self, *, path: nt.ContextDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextDeleteMonitorResponse]:
        """https://docs.context.dev/openapi.json — DELETE https://api.context.dev/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ContextDeleteMonitorResponse], await self.request_async('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def enrich_person(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextEnrichPersonBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextEnrichPersonResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/people/enrich"""
        return cast(NativeResponse[nt.ContextEnrichPersonResponse], await self.request_async('enrichPerson', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextExtractResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/extract"""
        return cast(NativeResponse[nt.ContextExtractResponse], await self.request_async('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def fonts(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextFontsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextFontsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/fonts"""
        return cast(NativeResponse[nt.ContextFontsResponse], await self.request_async('fonts', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_batch(self, *, path: nt.ContextGetBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetBatchResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/batch/{batch_id}"""
        return cast(NativeResponse[nt.ContextGetBatchResponse], await self.request_async('getBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_batch_results(self, *, path: nt.ContextGetBatchResultsPath, query: nt.ContextGetBatchResultsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetBatchResultsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/batch/{batch_id}/results"""
        return cast(NativeResponse[nt.ContextGetBatchResultsResponse], await self.request_async('getBatchResults', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_change(self, *, path: nt.ContextGetChangePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetChangeResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/changes/{change_id}"""
        return cast(NativeResponse[nt.ContextGetChangeResponse], await self.request_async('getChange', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_log(self, *, path: nt.ContextGetLogPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetLogResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/logs/{request_id}"""
        return cast(NativeResponse[nt.ContextGetLogResponse], await self.request_async('getLog', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor(self, *, path: nt.ContextGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetMonitorResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ContextGetMonitorResponse], await self.request_async('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor_limits(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetMonitorLimitsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/limits"""
        return cast(NativeResponse[nt.ContextGetMonitorLimitsResponse], await self.request_async('getMonitorLimits', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor_run(self, *, path: nt.ContextGetMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetMonitorRunResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}/runs/{run_id}"""
        return cast(NativeResponse[nt.ContextGetMonitorRunResponse], await self.request_async('getMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetUsageResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/usage"""
        return cast(NativeResponse[nt.ContextGetUsageResponse], await self.request_async('getUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_usage_history(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextGetUsageHistoryQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetUsageHistoryResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/usage/history"""
        return cast(NativeResponse[nt.ContextGetUsageHistoryResponse], await self.request_async('getUsageHistory', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webhook_delivery(self, *, path: nt.ContextGetWebhookDeliveryPath, query: nt.ContextGetWebhookDeliveryQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextGetWebhookDeliveryResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/webhooks/deliveries/{delivery_id}"""
        return cast(NativeResponse[nt.ContextGetWebhookDeliveryResponse], await self.request_async('getWebhookDelivery', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def head_logo(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextHeadLogoQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.context.dev/brand/logo-link.md — HEAD https://logos.context.dev/"""
        return cast(NativeResponse[RawResponse], await self.request_async('headLogo', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_account_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListAccountRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListAccountRunsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/runs"""
        return cast(NativeResponse[nt.ContextListAccountRunsResponse], await self.request_async('listAccountRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_batches(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListBatchesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListBatchesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/batch/list"""
        return cast(NativeResponse[nt.ContextListBatchesResponse], await self.request_async('listBatches', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_changes(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListChangesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListChangesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/changes"""
        return cast(NativeResponse[nt.ContextListChangesResponse], await self.request_async('listChanges', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_logs(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListLogsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListLogsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/logs"""
        return cast(NativeResponse[nt.ContextListLogsResponse], await self.request_async('listLogs', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitor_changes(self, *, path: nt.ContextListMonitorChangesPath, query: nt.ContextListMonitorChangesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorChangesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}/changes"""
        return cast(NativeResponse[nt.ContextListMonitorChangesResponse], await self.request_async('listMonitorChanges', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitor_credit_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListMonitorCreditUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorCreditUsageResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/credit-usage"""
        return cast(NativeResponse[nt.ContextListMonitorCreditUsageResponse], await self.request_async('listMonitorCreditUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitor_runs(self, *, path: nt.ContextListMonitorRunsPath, query: nt.ContextListMonitorRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorRunsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors/{monitor_id}/runs"""
        return cast(NativeResponse[nt.ContextListMonitorRunsResponse], await self.request_async('listMonitorRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListMonitorsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/monitors"""
        return cast(NativeResponse[nt.ContextListMonitorsResponse], await self.request_async('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_profiles(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextListProfilesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListProfilesResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/org/browser/profiles"""
        return cast(NativeResponse[nt.ContextListProfilesResponse], await self.request_async('listProfiles', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webhook_deliveries(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextListWebhookDeliveriesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListWebhookDeliveriesResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/webhooks/deliveries"""
        return cast(NativeResponse[nt.ContextListWebhookDeliveriesResponse], await self.request_async('listWebhookDeliveries', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webhook_delivery_attempts(self, *, path: nt.ContextListWebhookDeliveryAttemptsPath, query: nt.ContextListWebhookDeliveryAttemptsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextListWebhookDeliveryAttemptsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/attempts"""
        return cast(NativeResponse[nt.ContextListWebhookDeliveryAttemptsResponse], await self.request_async('listWebhookDeliveryAttempts', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def logo_url(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextLogoUrlQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://docs.context.dev/brand/logo-link.md — GET https://logos.context.dev/"""
        return cast(NativeResponse[str], await self.request_async('logoUrl', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def map(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextMapQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextMapResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/urls"""
        return cast(NativeResponse[nt.ContextMapResponse], await self.request_async('map', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def parse(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextParseQuery | None = None, raw_body: bytes, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextParseResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/parse"""
        return cast(NativeResponse[nt.ContextParseResponse], await self.request_async('parse', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def prefetch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextPrefetchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextPrefetchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/utility/prefetch"""
        return cast(NativeResponse[nt.ContextPrefetchResponse], await self.request_async('prefetch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_brand(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextRetrieveBrandBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRetrieveBrandResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/brand/retrieve"""
        return cast(NativeResponse[nt.ContextRetrieveBrandResponse], await self.request_async('retrieveBrand', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retry_webhook_delivery(self, *, path: nt.ContextRetryWebhookDeliveryPath, query: Mapping[str, Any] | None = None, body: nt.ContextRetryWebhookDeliveryBody | UnsetType = UNSET, headers: nt.ContextRetryWebhookDeliveryHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRetryWebhookDeliveryResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/retry"""
        return cast(NativeResponse[nt.ContextRetryWebhookDeliveryResponse], await self.request_async('retryWebhookDelivery', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def rotate_monitor_webhook_secret(self, *, path: nt.ContextRotateMonitorWebhookSecretPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRotateMonitorWebhookSecretResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/monitors/{monitor_id}/webhook/rotate-secret"""
        return cast(NativeResponse[nt.ContextRotateMonitorWebhookSecretResponse], await self.request_async('rotateMonitorWebhookSecret', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_monitor_now(self, *, path: nt.ContextRunMonitorNowPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextRunMonitorNowResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/monitors/{monitor_id}/run"""
        return cast(NativeResponse[nt.ContextRunMonitorNowResponse], await self.request_async('runMonitorNow', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextScrapeResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/scrape"""
        return cast(NativeResponse[nt.ContextScrapeResponse], await self.request_async('scrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/web/search"""
        return cast(NativeResponse[nt.ContextSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_brands(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextSearchBrandsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchBrandsResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/brand/search"""
        return cast(NativeResponse[nt.ContextSearchBrandsResponse], await self.request_async('searchBrands', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_companies(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSearchCompaniesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchCompaniesResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/company/search"""
        return cast(NativeResponse[nt.ContextSearchCompaniesResponse], await self.request_async('searchCompanies', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_news(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSearchNewsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSearchNewsResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/news/search"""
        return cast(NativeResponse[nt.ContextSearchNewsResponse], await self.request_async('searchNews', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def styleguide(self, *, path: Mapping[str, Any] | None = None, query: nt.ContextStyleguideQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextStyleguideResponse]:
        """https://docs.context.dev/openapi.json — GET https://api.context.dev/v1/web/styleguide"""
        return cast(NativeResponse[nt.ContextStyleguideResponse], await self.request_async('styleguide', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def submit_batch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSubmitBatchBody, headers: nt.ContextSubmitBatchHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSubmitBatchResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/batch/submit"""
        return cast(NativeResponse[nt.ContextSubmitBatchResponse], await self.request_async('submitBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def submit_feedback(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ContextSubmitFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextSubmitFeedbackResponse]:
        """https://docs.context.dev/openapi.json — POST https://api.context.dev/v1/feedback"""
        return cast(NativeResponse[nt.ContextSubmitFeedbackResponse], await self.request_async('submitFeedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_monitor(self, *, path: nt.ContextUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ContextUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ContextUpdateMonitorResponse]:
        """https://docs.context.dev/openapi.json — PATCH https://api.context.dev/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ContextUpdateMonitorResponse], await self.request_async('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class ExaClient(NativeClient):
    """exa provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None, team_api_key: str | None = None) -> None:
        super().__init__('exa', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry, team_api_key=team_api_key)

    def answer(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaAnswerBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaAnswerResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/answer"""
        return cast(NativeResponse[nt.ExaAnswerResponse], self.request('answer', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def answer_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaAnswerStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/answer"""
        return cast(NativeResponse[SSEStream], self.request('answerStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def batch_monitors(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaBatchMonitorsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaBatchMonitorsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/monitors/batch"""
        return cast(NativeResponse[nt.ExaBatchMonitorsResponse], self.request('batchMonitors', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_agent_run(self, *, path: nt.ExaCancelAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelAgentRunResponse], self.request('cancelAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_batch(self, *, path: nt.ExaCancelBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/batches/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelBatchResponse], self.request('cancelBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_webset(self, *, path: nt.ExaCancelWebsetPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelWebsetResponse], self.request('cancelWebset', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_webset_enrichment(self, *, path: nt.ExaCancelWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelWebsetEnrichmentResponse], self.request('cancelWebsetEnrichment', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_webset_search(self, *, path: nt.ExaCancelWebsetSearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelWebsetSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelWebsetSearchResponse], self.request('cancelWebsetSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_agent_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateAgentRunBody, headers: nt.ExaCreateAgentRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs"""
        return cast(NativeResponse[nt.ExaCreateAgentRunResponse], self.request('createAgentRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_agent_run_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateAgentRunStreamBody, headers: nt.ExaCreateAgentRunStreamHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs"""
        return cast(NativeResponse[SSEStream], self.request('createAgentRunStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_api_key(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateApiKeyBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — POST https://admin-api.exa.ai/team-management/api-keys"""
        return cast(NativeResponse[nt.ExaCreateApiKeyResponse], self.request('createApiKey', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_batch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/batches"""
        return cast(NativeResponse[nt.ExaCreateBatchResponse], self.request('createBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_import(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/imports"""
        return cast(NativeResponse[nt.ExaCreateImportResponse], self.request('createImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/monitors"""
        return cast(NativeResponse[nt.ExaCreateMonitorResponse], self.request('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_webhook(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebhookBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/webhooks"""
        return cast(NativeResponse[nt.ExaCreateWebhookResponse], self.request('createWebhook', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_webset(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets"""
        return cast(NativeResponse[nt.ExaCreateWebsetResponse], self.request('createWebset', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_webset_enrichment(self, *, path: nt.ExaCreateWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetEnrichmentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/enrichments"""
        return cast(NativeResponse[nt.ExaCreateWebsetEnrichmentResponse], self.request('createWebsetEnrichment', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_webset_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/monitors"""
        return cast(NativeResponse[nt.ExaCreateWebsetMonitorResponse], self.request('createWebsetMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_webset_search(self, *, path: nt.ExaCreateWebsetSearchPath, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/searches"""
        return cast(NativeResponse[nt.ExaCreateWebsetSearchResponse], self.request('createWebsetSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_agent_run(self, *, path: nt.ExaDeleteAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/agent/runs/{id}"""
        return cast(NativeResponse[nt.ExaDeleteAgentRunResponse], self.request('deleteAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_api_key(self, *, path: nt.ExaDeleteApiKeyPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — DELETE https://admin-api.exa.ai/team-management/api-keys/{id}"""
        return cast(NativeResponse[nt.ExaDeleteApiKeyResponse], self.request('deleteApiKey', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_batch(self, *, path: nt.ExaDeleteBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/batches/{id}"""
        return cast(NativeResponse[nt.ExaDeleteBatchResponse], self.request('deleteBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_import(self, *, path: nt.ExaDeleteImportPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/imports/{id}"""
        return cast(NativeResponse[nt.ExaDeleteImportResponse], self.request('deleteImport', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_monitor(self, *, path: nt.ExaDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/monitors/{id}"""
        return cast(NativeResponse[nt.ExaDeleteMonitorResponse], self.request('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_webhook(self, *, path: nt.ExaDeleteWebhookPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/webhooks/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebhookResponse], self.request('deleteWebhook', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_webset(self, *, path: nt.ExaDeleteWebsetPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/websets/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetResponse], self.request('deleteWebset', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_webset_enrichment(self, *, path: nt.ExaDeleteWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetEnrichmentResponse], self.request('deleteWebsetEnrichment', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_webset_item(self, *, path: nt.ExaDeleteWebsetItemPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetItemResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/websets/{webset}/items/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetItemResponse], self.request('deleteWebsetItem', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_webset_monitor(self, *, path: nt.ExaDeleteWebsetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/monitors/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetMonitorResponse], self.request('deleteWebsetMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def find_similar(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaFindSimilarBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaFindSimilarResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/findSimilar"""
        return cast(NativeResponse[nt.ExaFindSimilarResponse], self.request('findSimilar', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_agent_run(self, *, path: nt.ExaGetAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs/{id}"""
        return cast(NativeResponse[nt.ExaGetAgentRunResponse], self.request('getAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_api_key(self, *, path: nt.ExaGetApiKeyPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — GET https://admin-api.exa.ai/team-management/api-keys/{id}"""
        return cast(NativeResponse[nt.ExaGetApiKeyResponse], self.request('getApiKey', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_api_key_usage(self, *, path: nt.ExaGetApiKeyUsagePath, query: nt.ExaGetApiKeyUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetApiKeyUsageResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — GET https://admin-api.exa.ai/team-management/api-keys/{id}/usage"""
        return cast(NativeResponse[nt.ExaGetApiKeyUsageResponse], self.request('getApiKeyUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_batch(self, *, path: nt.ExaGetBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/batches/{id}"""
        return cast(NativeResponse[nt.ExaGetBatchResponse], self.request('getBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_contents(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaGetContentsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetContentsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/contents"""
        return cast(NativeResponse[nt.ExaGetContentsResponse], self.request('getContents', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_event(self, *, path: nt.ExaGetEventPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetEventResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/events/{id}"""
        return cast(NativeResponse[nt.ExaGetEventResponse], self.request('getEvent', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_import(self, *, path: nt.ExaGetImportPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/imports/{id}"""
        return cast(NativeResponse[nt.ExaGetImportResponse], self.request('getImport', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor(self, *, path: nt.ExaGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors/{id}"""
        return cast(NativeResponse[nt.ExaGetMonitorResponse], self.request('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor_run(self, *, path: nt.ExaGetMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetMonitorRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors/{id}/runs/{runId}"""
        return cast(NativeResponse[nt.ExaGetMonitorRunResponse], self.request('getMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_team_info(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetTeamInfoResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/v0/teams/me"""
        return cast(NativeResponse[nt.ExaGetTeamInfoResponse], self.request('getTeamInfo', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webhook(self, *, path: nt.ExaGetWebhookPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/webhooks/{id}"""
        return cast(NativeResponse[nt.ExaGetWebhookResponse], self.request('getWebhook', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webset(self, *, path: nt.ExaGetWebsetPath, query: nt.ExaGetWebsetQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetResponse], self.request('getWebset', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webset_enrichment(self, *, path: nt.ExaGetWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetEnrichmentResponse], self.request('getWebsetEnrichment', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webset_item(self, *, path: nt.ExaGetWebsetItemPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetItemResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/items/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetItemResponse], self.request('getWebsetItem', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webset_monitor(self, *, path: nt.ExaGetWebsetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetMonitorResponse], self.request('getWebsetMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webset_monitor_run(self, *, path: nt.ExaGetWebsetMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetMonitorRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors/{monitor}/runs/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetMonitorRunResponse], self.request('getWebsetMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_webset_search(self, *, path: nt.ExaGetWebsetSearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetSearchResponse], self.request('getWebsetSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_agent_run_events(self, *, path: nt.ExaListAgentRunEventsPath, query: nt.ExaListAgentRunEventsQuery | None = None, headers: nt.ExaListAgentRunEventsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListAgentRunEventsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs/{id}/events"""
        return cast(NativeResponse[nt.ExaListAgentRunEventsResponse], self.request('listAgentRunEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_agent_run_events_stream(self, *, path: nt.ExaListAgentRunEventsStreamPath, query: nt.ExaListAgentRunEventsStreamQuery | None = None, headers: nt.ExaListAgentRunEventsStreamHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs/{id}/events"""
        return cast(NativeResponse[SSEStream], self.request('listAgentRunEventsStream', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_agent_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListAgentRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListAgentRunsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs"""
        return cast(NativeResponse[nt.ExaListAgentRunsResponse], self.request('listAgentRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_api_keys(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListApiKeysQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListApiKeysResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — GET https://admin-api.exa.ai/team-management/api-keys"""
        return cast(NativeResponse[nt.ExaListApiKeysResponse], self.request('listApiKeys', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_batches(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListBatchesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListBatchesResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/batches"""
        return cast(NativeResponse[nt.ExaListBatchesResponse], self.request('listBatches', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_events(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListEventsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListEventsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/events"""
        return cast(NativeResponse[nt.ExaListEventsResponse], self.request('listEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_imports(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListImportsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListImportsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/imports"""
        return cast(NativeResponse[nt.ExaListImportsResponse], self.request('listImports', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitor_runs(self, *, path: nt.ExaListMonitorRunsPath, query: nt.ExaListMonitorRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListMonitorRunsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors/{id}/runs"""
        return cast(NativeResponse[nt.ExaListMonitorRunsResponse], self.request('listMonitorRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListMonitorsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors"""
        return cast(NativeResponse[nt.ExaListMonitorsResponse], self.request('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webhook_attempts(self, *, path: nt.ExaListWebhookAttemptsPath, query: nt.ExaListWebhookAttemptsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebhookAttemptsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/webhooks/{id}/attempts"""
        return cast(NativeResponse[nt.ExaListWebhookAttemptsResponse], self.request('listWebhookAttempts', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webhooks(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListWebhooksQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebhooksResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/webhooks"""
        return cast(NativeResponse[nt.ExaListWebhooksResponse], self.request('listWebhooks', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webset_items(self, *, path: nt.ExaListWebsetItemsPath, query: nt.ExaListWebsetItemsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetItemsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/items"""
        return cast(NativeResponse[nt.ExaListWebsetItemsResponse], self.request('listWebsetItems', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webset_monitor_runs(self, *, path: nt.ExaListWebsetMonitorRunsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetMonitorRunsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors/{monitor}/runs"""
        return cast(NativeResponse[nt.ExaListWebsetMonitorRunsResponse], self.request('listWebsetMonitorRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_webset_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListWebsetMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetMonitorsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors"""
        return cast(NativeResponse[nt.ExaListWebsetMonitorsResponse], self.request('listWebsetMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_websets(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListWebsetsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets"""
        return cast(NativeResponse[nt.ExaListWebsetsResponse], self.request('listWebsets', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def preview_webset(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaPreviewWebsetQuery | None = None, body: nt.ExaPreviewWebsetBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaPreviewWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/preview"""
        return cast(NativeResponse[nt.ExaPreviewWebsetResponse], self.request('previewWebset', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/search"""
        return cast(NativeResponse[nt.ExaSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaSearchStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/search"""
        return cast(NativeResponse[SSEStream], self.request('searchStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stop_agent_run(self, *, path: nt.ExaStopAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaStopAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs/{id}/stop"""
        return cast(NativeResponse[nt.ExaStopAgentRunResponse], self.request('stopAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def trigger_monitor(self, *, path: nt.ExaTriggerMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaTriggerMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/monitors/{id}/trigger"""
        return cast(NativeResponse[nt.ExaTriggerMonitorResponse], self.request('triggerMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_api_key(self, *, path: nt.ExaUpdateApiKeyPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateApiKeyBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — PUT https://admin-api.exa.ai/team-management/api-keys/{id}"""
        return cast(NativeResponse[nt.ExaUpdateApiKeyResponse], self.request('updateApiKey', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_import(self, *, path: nt.ExaUpdateImportPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/imports/{id}"""
        return cast(NativeResponse[nt.ExaUpdateImportResponse], self.request('updateImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_monitor(self, *, path: nt.ExaUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/monitors/{id}"""
        return cast(NativeResponse[nt.ExaUpdateMonitorResponse], self.request('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_webhook(self, *, path: nt.ExaUpdateWebhookPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebhookBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/webhooks/{id}"""
        return cast(NativeResponse[nt.ExaUpdateWebhookResponse], self.request('updateWebhook', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_webset(self, *, path: nt.ExaUpdateWebsetPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebsetBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{id}"""
        return cast(NativeResponse[nt.ExaUpdateWebsetResponse], self.request('updateWebset', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_webset_enrichment(self, *, path: nt.ExaUpdateWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebsetEnrichmentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[None]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}"""
        return cast(NativeResponse[None], self.request('updateWebsetEnrichment', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_webset_monitor(self, *, path: nt.ExaUpdateWebsetMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebsetMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/monitors/{id}"""
        return cast(NativeResponse[nt.ExaUpdateWebsetMonitorResponse], self.request('updateWebsetMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncExaClient(NativeClient):
    """exa provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None, team_api_key: str | None = None) -> None:
        super().__init__('exa', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry, team_api_key=team_api_key)

    async def answer(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaAnswerBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaAnswerResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/answer"""
        return cast(NativeResponse[nt.ExaAnswerResponse], await self.request_async('answer', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def answer_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaAnswerStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/answer"""
        return cast(NativeResponse[SSEStream], await self.request_async('answerStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def batch_monitors(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaBatchMonitorsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaBatchMonitorsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/monitors/batch"""
        return cast(NativeResponse[nt.ExaBatchMonitorsResponse], await self.request_async('batchMonitors', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_agent_run(self, *, path: nt.ExaCancelAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelAgentRunResponse], await self.request_async('cancelAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_batch(self, *, path: nt.ExaCancelBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/batches/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelBatchResponse], await self.request_async('cancelBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_webset(self, *, path: nt.ExaCancelWebsetPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelWebsetResponse], await self.request_async('cancelWebset', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_webset_enrichment(self, *, path: nt.ExaCancelWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelWebsetEnrichmentResponse], await self.request_async('cancelWebsetEnrichment', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_webset_search(self, *, path: nt.ExaCancelWebsetSearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCancelWebsetSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}/cancel"""
        return cast(NativeResponse[nt.ExaCancelWebsetSearchResponse], await self.request_async('cancelWebsetSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_agent_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateAgentRunBody, headers: nt.ExaCreateAgentRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs"""
        return cast(NativeResponse[nt.ExaCreateAgentRunResponse], await self.request_async('createAgentRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_agent_run_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateAgentRunStreamBody, headers: nt.ExaCreateAgentRunStreamHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs"""
        return cast(NativeResponse[SSEStream], await self.request_async('createAgentRunStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_api_key(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateApiKeyBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — POST https://admin-api.exa.ai/team-management/api-keys"""
        return cast(NativeResponse[nt.ExaCreateApiKeyResponse], await self.request_async('createApiKey', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_batch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/batches"""
        return cast(NativeResponse[nt.ExaCreateBatchResponse], await self.request_async('createBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_import(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/imports"""
        return cast(NativeResponse[nt.ExaCreateImportResponse], await self.request_async('createImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/monitors"""
        return cast(NativeResponse[nt.ExaCreateMonitorResponse], await self.request_async('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_webhook(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebhookBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/webhooks"""
        return cast(NativeResponse[nt.ExaCreateWebhookResponse], await self.request_async('createWebhook', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_webset(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets"""
        return cast(NativeResponse[nt.ExaCreateWebsetResponse], await self.request_async('createWebset', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_webset_enrichment(self, *, path: nt.ExaCreateWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetEnrichmentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/enrichments"""
        return cast(NativeResponse[nt.ExaCreateWebsetEnrichmentResponse], await self.request_async('createWebsetEnrichment', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_webset_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/monitors"""
        return cast(NativeResponse[nt.ExaCreateWebsetMonitorResponse], await self.request_async('createWebsetMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_webset_search(self, *, path: nt.ExaCreateWebsetSearchPath, query: Mapping[str, Any] | None = None, body: nt.ExaCreateWebsetSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaCreateWebsetSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{webset}/searches"""
        return cast(NativeResponse[nt.ExaCreateWebsetSearchResponse], await self.request_async('createWebsetSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_agent_run(self, *, path: nt.ExaDeleteAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/agent/runs/{id}"""
        return cast(NativeResponse[nt.ExaDeleteAgentRunResponse], await self.request_async('deleteAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_api_key(self, *, path: nt.ExaDeleteApiKeyPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — DELETE https://admin-api.exa.ai/team-management/api-keys/{id}"""
        return cast(NativeResponse[nt.ExaDeleteApiKeyResponse], await self.request_async('deleteApiKey', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_batch(self, *, path: nt.ExaDeleteBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/batches/{id}"""
        return cast(NativeResponse[nt.ExaDeleteBatchResponse], await self.request_async('deleteBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_import(self, *, path: nt.ExaDeleteImportPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/imports/{id}"""
        return cast(NativeResponse[nt.ExaDeleteImportResponse], await self.request_async('deleteImport', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_monitor(self, *, path: nt.ExaDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/monitors/{id}"""
        return cast(NativeResponse[nt.ExaDeleteMonitorResponse], await self.request_async('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_webhook(self, *, path: nt.ExaDeleteWebhookPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/webhooks/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebhookResponse], await self.request_async('deleteWebhook', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_webset(self, *, path: nt.ExaDeleteWebsetPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/websets/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetResponse], await self.request_async('deleteWebset', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_webset_enrichment(self, *, path: nt.ExaDeleteWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetEnrichmentResponse], await self.request_async('deleteWebsetEnrichment', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_webset_item(self, *, path: nt.ExaDeleteWebsetItemPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetItemResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/websets/{webset}/items/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetItemResponse], await self.request_async('deleteWebsetItem', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_webset_monitor(self, *, path: nt.ExaDeleteWebsetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaDeleteWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — DELETE https://api.exa.ai/websets/v0/monitors/{id}"""
        return cast(NativeResponse[nt.ExaDeleteWebsetMonitorResponse], await self.request_async('deleteWebsetMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def find_similar(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaFindSimilarBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaFindSimilarResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/findSimilar"""
        return cast(NativeResponse[nt.ExaFindSimilarResponse], await self.request_async('findSimilar', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_agent_run(self, *, path: nt.ExaGetAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs/{id}"""
        return cast(NativeResponse[nt.ExaGetAgentRunResponse], await self.request_async('getAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_api_key(self, *, path: nt.ExaGetApiKeyPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — GET https://admin-api.exa.ai/team-management/api-keys/{id}"""
        return cast(NativeResponse[nt.ExaGetApiKeyResponse], await self.request_async('getApiKey', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_api_key_usage(self, *, path: nt.ExaGetApiKeyUsagePath, query: nt.ExaGetApiKeyUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetApiKeyUsageResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — GET https://admin-api.exa.ai/team-management/api-keys/{id}/usage"""
        return cast(NativeResponse[nt.ExaGetApiKeyUsageResponse], await self.request_async('getApiKeyUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_batch(self, *, path: nt.ExaGetBatchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetBatchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/batches/{id}"""
        return cast(NativeResponse[nt.ExaGetBatchResponse], await self.request_async('getBatch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_contents(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaGetContentsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetContentsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/contents"""
        return cast(NativeResponse[nt.ExaGetContentsResponse], await self.request_async('getContents', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_event(self, *, path: nt.ExaGetEventPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetEventResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/events/{id}"""
        return cast(NativeResponse[nt.ExaGetEventResponse], await self.request_async('getEvent', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_import(self, *, path: nt.ExaGetImportPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/imports/{id}"""
        return cast(NativeResponse[nt.ExaGetImportResponse], await self.request_async('getImport', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor(self, *, path: nt.ExaGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors/{id}"""
        return cast(NativeResponse[nt.ExaGetMonitorResponse], await self.request_async('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor_run(self, *, path: nt.ExaGetMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetMonitorRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors/{id}/runs/{runId}"""
        return cast(NativeResponse[nt.ExaGetMonitorRunResponse], await self.request_async('getMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_team_info(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetTeamInfoResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/v0/teams/me"""
        return cast(NativeResponse[nt.ExaGetTeamInfoResponse], await self.request_async('getTeamInfo', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webhook(self, *, path: nt.ExaGetWebhookPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/webhooks/{id}"""
        return cast(NativeResponse[nt.ExaGetWebhookResponse], await self.request_async('getWebhook', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webset(self, *, path: nt.ExaGetWebsetPath, query: nt.ExaGetWebsetQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetResponse], await self.request_async('getWebset', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webset_enrichment(self, *, path: nt.ExaGetWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetEnrichmentResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetEnrichmentResponse], await self.request_async('getWebsetEnrichment', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webset_item(self, *, path: nt.ExaGetWebsetItemPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetItemResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/items/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetItemResponse], await self.request_async('getWebsetItem', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webset_monitor(self, *, path: nt.ExaGetWebsetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetMonitorResponse], await self.request_async('getWebsetMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webset_monitor_run(self, *, path: nt.ExaGetWebsetMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetMonitorRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors/{monitor}/runs/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetMonitorRunResponse], await self.request_async('getWebsetMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_webset_search(self, *, path: nt.ExaGetWebsetSearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaGetWebsetSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}"""
        return cast(NativeResponse[nt.ExaGetWebsetSearchResponse], await self.request_async('getWebsetSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_agent_run_events(self, *, path: nt.ExaListAgentRunEventsPath, query: nt.ExaListAgentRunEventsQuery | None = None, headers: nt.ExaListAgentRunEventsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListAgentRunEventsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs/{id}/events"""
        return cast(NativeResponse[nt.ExaListAgentRunEventsResponse], await self.request_async('listAgentRunEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_agent_run_events_stream(self, *, path: nt.ExaListAgentRunEventsStreamPath, query: nt.ExaListAgentRunEventsStreamQuery | None = None, headers: nt.ExaListAgentRunEventsStreamHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs/{id}/events"""
        return cast(NativeResponse[SSEStream], await self.request_async('listAgentRunEventsStream', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_agent_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListAgentRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListAgentRunsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/agent/runs"""
        return cast(NativeResponse[nt.ExaListAgentRunsResponse], await self.request_async('listAgentRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_api_keys(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListApiKeysQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListApiKeysResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — GET https://admin-api.exa.ai/team-management/api-keys"""
        return cast(NativeResponse[nt.ExaListApiKeysResponse], await self.request_async('listApiKeys', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_batches(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListBatchesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListBatchesResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/batches"""
        return cast(NativeResponse[nt.ExaListBatchesResponse], await self.request_async('listBatches', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_events(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListEventsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListEventsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/events"""
        return cast(NativeResponse[nt.ExaListEventsResponse], await self.request_async('listEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_imports(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListImportsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListImportsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/imports"""
        return cast(NativeResponse[nt.ExaListImportsResponse], await self.request_async('listImports', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitor_runs(self, *, path: nt.ExaListMonitorRunsPath, query: nt.ExaListMonitorRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListMonitorRunsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors/{id}/runs"""
        return cast(NativeResponse[nt.ExaListMonitorRunsResponse], await self.request_async('listMonitorRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListMonitorsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/monitors"""
        return cast(NativeResponse[nt.ExaListMonitorsResponse], await self.request_async('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webhook_attempts(self, *, path: nt.ExaListWebhookAttemptsPath, query: nt.ExaListWebhookAttemptsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebhookAttemptsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/webhooks/{id}/attempts"""
        return cast(NativeResponse[nt.ExaListWebhookAttemptsResponse], await self.request_async('listWebhookAttempts', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webhooks(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListWebhooksQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebhooksResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/webhooks"""
        return cast(NativeResponse[nt.ExaListWebhooksResponse], await self.request_async('listWebhooks', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webset_items(self, *, path: nt.ExaListWebsetItemsPath, query: nt.ExaListWebsetItemsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetItemsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets/{webset}/items"""
        return cast(NativeResponse[nt.ExaListWebsetItemsResponse], await self.request_async('listWebsetItems', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webset_monitor_runs(self, *, path: nt.ExaListWebsetMonitorRunsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetMonitorRunsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors/{monitor}/runs"""
        return cast(NativeResponse[nt.ExaListWebsetMonitorRunsResponse], await self.request_async('listWebsetMonitorRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_webset_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListWebsetMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetMonitorsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/monitors"""
        return cast(NativeResponse[nt.ExaListWebsetMonitorsResponse], await self.request_async('listWebsetMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_websets(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaListWebsetsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaListWebsetsResponse]:
        """https://exa.ai/docs/exa-spec.yaml — GET https://api.exa.ai/websets/v0/websets"""
        return cast(NativeResponse[nt.ExaListWebsetsResponse], await self.request_async('listWebsets', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def preview_webset(self, *, path: Mapping[str, Any] | None = None, query: nt.ExaPreviewWebsetQuery | None = None, body: nt.ExaPreviewWebsetBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaPreviewWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/preview"""
        return cast(NativeResponse[nt.ExaPreviewWebsetResponse], await self.request_async('previewWebset', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaSearchResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/search"""
        return cast(NativeResponse[nt.ExaSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ExaSearchStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/search"""
        return cast(NativeResponse[SSEStream], await self.request_async('searchStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stop_agent_run(self, *, path: nt.ExaStopAgentRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaStopAgentRunResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/agent/runs/{id}/stop"""
        return cast(NativeResponse[nt.ExaStopAgentRunResponse], await self.request_async('stopAgentRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def trigger_monitor(self, *, path: nt.ExaTriggerMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaTriggerMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/monitors/{id}/trigger"""
        return cast(NativeResponse[nt.ExaTriggerMonitorResponse], await self.request_async('triggerMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_api_key(self, *, path: nt.ExaUpdateApiKeyPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateApiKeyBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateApiKeyResponse]:
        """https://exa.ai/docs/team-management-spec.yaml — PUT https://admin-api.exa.ai/team-management/api-keys/{id}"""
        return cast(NativeResponse[nt.ExaUpdateApiKeyResponse], await self.request_async('updateApiKey', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_import(self, *, path: nt.ExaUpdateImportPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateImportResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/imports/{id}"""
        return cast(NativeResponse[nt.ExaUpdateImportResponse], await self.request_async('updateImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_monitor(self, *, path: nt.ExaUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/monitors/{id}"""
        return cast(NativeResponse[nt.ExaUpdateMonitorResponse], await self.request_async('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_webhook(self, *, path: nt.ExaUpdateWebhookPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebhookBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateWebhookResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/webhooks/{id}"""
        return cast(NativeResponse[nt.ExaUpdateWebhookResponse], await self.request_async('updateWebhook', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_webset(self, *, path: nt.ExaUpdateWebsetPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebsetBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateWebsetResponse]:
        """https://exa.ai/docs/exa-spec.yaml — POST https://api.exa.ai/websets/v0/websets/{id}"""
        return cast(NativeResponse[nt.ExaUpdateWebsetResponse], await self.request_async('updateWebset', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_webset_enrichment(self, *, path: nt.ExaUpdateWebsetEnrichmentPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebsetEnrichmentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[None]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}"""
        return cast(NativeResponse[None], await self.request_async('updateWebsetEnrichment', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_webset_monitor(self, *, path: nt.ExaUpdateWebsetMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ExaUpdateWebsetMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ExaUpdateWebsetMonitorResponse]:
        """https://exa.ai/docs/exa-spec.yaml — PATCH https://api.exa.ai/websets/v0/monitors/{id}"""
        return cast(NativeResponse[nt.ExaUpdateWebsetMonitorResponse], await self.request_async('updateWebsetMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class FirecrawlClient(NativeClient):
    """firecrawl provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('firecrawl', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def ask_support_agent(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlAskSupportAgentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlAskSupportAgentResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/support/ask"""
        return cast(NativeResponse[nt.FirecrawlAskSupportAgentResponse], self.request('askSupportAgent', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def batch_scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlBatchScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlBatchScrapeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/batch/scrape"""
        return cast(NativeResponse[nt.FirecrawlBatchScrapeResponse], self.request('batchScrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_agent(self, *, path: nt.FirecrawlCancelAgentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCancelAgentResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/agent/{jobId}"""
        return cast(NativeResponse[nt.FirecrawlCancelAgentResponse], self.request('cancelAgent', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_batch_scrape(self, *, path: nt.FirecrawlCancelBatchScrapePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCancelBatchScrapeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/batch/scrape/{id}"""
        return cast(NativeResponse[nt.FirecrawlCancelBatchScrapeResponse], self.request('cancelBatchScrape', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_crawl(self, *, path: nt.FirecrawlCancelCrawlPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCancelCrawlResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/crawl/{id}"""
        return cast(NativeResponse[nt.FirecrawlCancelCrawlResponse], self.request('cancelCrawl', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def crawl(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCrawlBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCrawlResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/crawl"""
        return cast(NativeResponse[nt.FirecrawlCrawlResponse], self.request('crawl', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def crawl_params_preview(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCrawlParamsPreviewBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCrawlParamsPreviewResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/crawl/params-preview"""
        return cast(NativeResponse[nt.FirecrawlCrawlParamsPreviewResponse], self.request('crawlParamsPreview', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_browser_session(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCreateBrowserSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCreateBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/interact"""
        return cast(NativeResponse[nt.FirecrawlCreateBrowserSessionResponse], self.request('createBrowserSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCreateMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/monitor"""
        return cast(NativeResponse[nt.FirecrawlCreateMonitorResponse], self.request('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_browser_session(self, *, path: nt.FirecrawlDeleteBrowserSessionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeleteBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/interact/{sessionId}"""
        return cast(NativeResponse[nt.FirecrawlDeleteBrowserSessionResponse], self.request('deleteBrowserSession', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_monitor(self, *, path: nt.FirecrawlDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeleteMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/monitor/{monitorId}"""
        return cast(NativeResponse[nt.FirecrawlDeleteMonitorResponse], self.request('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def developer_search(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlDeveloperSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeveloperSearchResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/developer"""
        return cast(NativeResponse[nt.FirecrawlDeveloperSearchResponse], self.request('developerSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def developer_search_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlDeveloperSearchPostBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeveloperSearchPostResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search/developer"""
        return cast(NativeResponse[nt.FirecrawlDeveloperSearchPostResponse], self.request('developerSearchPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def execute_browser_code(self, *, path: nt.FirecrawlExecuteBrowserCodePath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlExecuteBrowserCodeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlExecuteBrowserCodeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/interact/{sessionId}/execute"""
        return cast(NativeResponse[nt.FirecrawlExecuteBrowserCodeResponse], self.request('executeBrowserCode', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlExtractResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/extract"""
        return cast(NativeResponse[nt.FirecrawlExtractResponse], self.request('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_active_crawls(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetActiveCrawlsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/crawl/active"""
        return cast(NativeResponse[nt.FirecrawlGetActiveCrawlsResponse], self.request('getActiveCrawls', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_activity(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGetActivityQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetActivityResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/activity"""
        return cast(NativeResponse[nt.FirecrawlGetActivityResponse], self.request('getActivity', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_agent_snapshot(self, *, path: nt.FirecrawlGetAgentSnapshotPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetAgentSnapshotResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent/{jobId}/snapshots/{snapshotId}"""
        return cast(NativeResponse[nt.FirecrawlGetAgentSnapshotResponse], self.request('getAgentSnapshot', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_agent_status(self, *, path: nt.FirecrawlGetAgentStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetAgentStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent/{jobId}"""
        return cast(NativeResponse[nt.FirecrawlGetAgentStatusResponse], self.request('getAgentStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_agent_trace(self, *, path: nt.FirecrawlGetAgentTracePath, query: nt.FirecrawlGetAgentTraceQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetAgentTraceResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent/{jobId}/trace"""
        return cast(NativeResponse[nt.FirecrawlGetAgentTraceResponse], self.request('getAgentTrace', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_batch_scrape_errors(self, *, path: nt.FirecrawlGetBatchScrapeErrorsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetBatchScrapeErrorsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/batch/scrape/{id}/errors"""
        return cast(NativeResponse[nt.FirecrawlGetBatchScrapeErrorsResponse], self.request('getBatchScrapeErrors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_batch_scrape_status(self, *, path: nt.FirecrawlGetBatchScrapeStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetBatchScrapeStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/batch/scrape/{id}"""
        return cast(NativeResponse[nt.FirecrawlGetBatchScrapeStatusResponse], self.request('getBatchScrapeStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_crawl_errors(self, *, path: nt.FirecrawlGetCrawlErrorsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetCrawlErrorsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/crawl/{id}/errors"""
        return cast(NativeResponse[nt.FirecrawlGetCrawlErrorsResponse], self.request('getCrawlErrors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_crawl_status(self, *, path: nt.FirecrawlGetCrawlStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetCrawlStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/crawl/{id}"""
        return cast(NativeResponse[nt.FirecrawlGetCrawlStatusResponse], self.request('getCrawlStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_credit_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetCreditUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/credit-usage"""
        return cast(NativeResponse[nt.FirecrawlGetCreditUsageResponse], self.request('getCreditUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_extract_status(self, *, path: nt.FirecrawlGetExtractStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetExtractStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/extract/{id}"""
        return cast(NativeResponse[nt.FirecrawlGetExtractStatusResponse], self.request('getExtractStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_historical_credit_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGetHistoricalCreditUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetHistoricalCreditUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/credit-usage/historical"""
        return cast(NativeResponse[nt.FirecrawlGetHistoricalCreditUsageResponse], self.request('getHistoricalCreditUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_historical_token_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGetHistoricalTokenUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetHistoricalTokenUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/token-usage/historical"""
        return cast(NativeResponse[nt.FirecrawlGetHistoricalTokenUsageResponse], self.request('getHistoricalTokenUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor(self, *, path: nt.FirecrawlGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor/{monitorId}"""
        return cast(NativeResponse[nt.FirecrawlGetMonitorResponse], self.request('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor_check(self, *, path: nt.FirecrawlGetMonitorCheckPath, query: nt.FirecrawlGetMonitorCheckQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetMonitorCheckResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor/{monitorId}/checks/{checkId}"""
        return cast(NativeResponse[nt.FirecrawlGetMonitorCheckResponse], self.request('getMonitorCheck', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_parse_formats(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetParseFormatsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/parse/formats"""
        return cast(NativeResponse[nt.FirecrawlGetParseFormatsResponse], self.request('getParseFormats', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_queue_status(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetQueueStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/queue-status"""
        return cast(NativeResponse[nt.FirecrawlGetQueueStatusResponse], self.request('getQueueStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_scrape_status(self, *, path: nt.FirecrawlGetScrapeStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetScrapeStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/scrape/{jobId}"""
        return cast(NativeResponse[nt.FirecrawlGetScrapeStatusResponse], self.request('getScrapeStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_threat_protection(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetThreatProtectionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/threat-protection"""
        return cast(NativeResponse[nt.FirecrawlGetThreatProtectionResponse], self.request('getThreatProtection', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_token_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetTokenUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/token-usage"""
        return cast(NativeResponse[nt.FirecrawlGetTokenUsageResponse], self.request('getTokenUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def gov_search(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGovSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGovSearchResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/gov"""
        return cast(NativeResponse[nt.FirecrawlGovSearchResponse], self.request('govSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def gov_search_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlGovSearchPostBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGovSearchPostResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search/gov"""
        return cast(NativeResponse[nt.FirecrawlGovSearchPostResponse], self.request('govSearchPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def interact_with_scrape_browser_session(self, *, path: nt.FirecrawlInteractWithScrapeBrowserSessionPath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlInteractWithScrapeBrowserSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlInteractWithScrapeBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/scrape/{jobId}/interact"""
        return cast(NativeResponse[nt.FirecrawlInteractWithScrapeBrowserSessionResponse], self.request('interactWithScrapeBrowserSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_agents(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlListAgentsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListAgentsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent"""
        return cast(NativeResponse[nt.FirecrawlListAgentsResponse], self.request('listAgents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_browser_sessions(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlListBrowserSessionsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListBrowserSessionsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/interact"""
        return cast(NativeResponse[nt.FirecrawlListBrowserSessionsResponse], self.request('listBrowserSessions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitor_checks(self, *, path: nt.FirecrawlListMonitorChecksPath, query: nt.FirecrawlListMonitorChecksQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListMonitorChecksResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor/{monitorId}/checks"""
        return cast(NativeResponse[nt.FirecrawlListMonitorChecksResponse], self.request('listMonitorChecks', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListMonitorsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor"""
        return cast(NativeResponse[nt.FirecrawlListMonitorsResponse], self.request('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def map(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlMapBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlMapResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/map"""
        return cast(NativeResponse[nt.FirecrawlMapResponse], self.request('map', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def parse_file(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlParseFileResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/parse"""
        return cast(NativeResponse[nt.FirecrawlParseFileResponse], self.request('parseFile', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def research_get_paper(self, *, path: nt.FirecrawlResearchGetPaperPath, query: nt.FirecrawlResearchGetPaperQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlResearchGetPaperResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/research/papers/{id}"""
        return cast(NativeResponse[nt.FirecrawlResearchGetPaperResponse], self.request('researchGetPaper', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def research_related_papers(self, *, path: nt.FirecrawlResearchRelatedPapersPath, query: nt.FirecrawlResearchRelatedPapersQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlResearchRelatedPapersResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/research/papers/{id}/similar"""
        return cast(NativeResponse[nt.FirecrawlResearchRelatedPapersResponse], self.request('researchRelatedPapers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def research_search_papers(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlResearchSearchPapersQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlResearchSearchPapersResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/research/papers"""
        return cast(NativeResponse[nt.FirecrawlResearchSearchPapersResponse], self.request('researchSearchPapers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_monitor(self, *, path: nt.FirecrawlRunMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlRunMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/monitor/{monitorId}/run"""
        return cast(NativeResponse[nt.FirecrawlRunMonitorResponse], self.request('runMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlScrapeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/scrape"""
        return cast(NativeResponse[nt.FirecrawlScrapeResponse], self.request('scrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSearchResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search"""
        return cast(NativeResponse[nt.FirecrawlSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_support_docs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSearchSupportDocsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSearchSupportDocsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/support/docs-search"""
        return cast(NativeResponse[nt.FirecrawlSearchSupportDocsResponse], self.request('searchSupportDocs', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def start_agent(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlStartAgentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlStartAgentResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/agent"""
        return cast(NativeResponse[nt.FirecrawlStartAgentResponse], self.request('startAgent', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stop_interactive_scrape_browser_session(self, *, path: nt.FirecrawlStopInteractiveScrapeBrowserSessionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlStopInteractiveScrapeBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/scrape/{jobId}/interact"""
        return cast(NativeResponse[nt.FirecrawlStopInteractiveScrapeBrowserSessionResponse], self.request('stopInteractiveScrapeBrowserSession', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def submit_endpoint_feedback(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSubmitEndpointFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSubmitEndpointFeedbackResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/feedback"""
        return cast(NativeResponse[nt.FirecrawlSubmitEndpointFeedbackResponse], self.request('submitEndpointFeedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def submit_search_feedback(self, *, path: nt.FirecrawlSubmitSearchFeedbackPath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSubmitSearchFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSubmitSearchFeedbackResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search/{jobId}/feedback"""
        return cast(NativeResponse[nt.FirecrawlSubmitSearchFeedbackResponse], self.request('submitSearchFeedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_monitor(self, *, path: nt.FirecrawlUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlUpdateMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — PATCH https://api.firecrawl.dev/v2/monitor/{monitorId}"""
        return cast(NativeResponse[nt.FirecrawlUpdateMonitorResponse], self.request('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_threat_protection(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlUpdateThreatProtectionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlUpdateThreatProtectionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — PUT https://api.firecrawl.dev/v2/team/threat-protection"""
        return cast(NativeResponse[nt.FirecrawlUpdateThreatProtectionResponse], self.request('updateThreatProtection', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncFirecrawlClient(NativeClient):
    """firecrawl provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('firecrawl', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def ask_support_agent(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlAskSupportAgentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlAskSupportAgentResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/support/ask"""
        return cast(NativeResponse[nt.FirecrawlAskSupportAgentResponse], await self.request_async('askSupportAgent', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def batch_scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlBatchScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlBatchScrapeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/batch/scrape"""
        return cast(NativeResponse[nt.FirecrawlBatchScrapeResponse], await self.request_async('batchScrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_agent(self, *, path: nt.FirecrawlCancelAgentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCancelAgentResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/agent/{jobId}"""
        return cast(NativeResponse[nt.FirecrawlCancelAgentResponse], await self.request_async('cancelAgent', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_batch_scrape(self, *, path: nt.FirecrawlCancelBatchScrapePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCancelBatchScrapeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/batch/scrape/{id}"""
        return cast(NativeResponse[nt.FirecrawlCancelBatchScrapeResponse], await self.request_async('cancelBatchScrape', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_crawl(self, *, path: nt.FirecrawlCancelCrawlPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCancelCrawlResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/crawl/{id}"""
        return cast(NativeResponse[nt.FirecrawlCancelCrawlResponse], await self.request_async('cancelCrawl', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def crawl(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCrawlBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCrawlResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/crawl"""
        return cast(NativeResponse[nt.FirecrawlCrawlResponse], await self.request_async('crawl', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def crawl_params_preview(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCrawlParamsPreviewBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCrawlParamsPreviewResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/crawl/params-preview"""
        return cast(NativeResponse[nt.FirecrawlCrawlParamsPreviewResponse], await self.request_async('crawlParamsPreview', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_browser_session(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCreateBrowserSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCreateBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/interact"""
        return cast(NativeResponse[nt.FirecrawlCreateBrowserSessionResponse], await self.request_async('createBrowserSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlCreateMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/monitor"""
        return cast(NativeResponse[nt.FirecrawlCreateMonitorResponse], await self.request_async('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_browser_session(self, *, path: nt.FirecrawlDeleteBrowserSessionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeleteBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/interact/{sessionId}"""
        return cast(NativeResponse[nt.FirecrawlDeleteBrowserSessionResponse], await self.request_async('deleteBrowserSession', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_monitor(self, *, path: nt.FirecrawlDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeleteMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/monitor/{monitorId}"""
        return cast(NativeResponse[nt.FirecrawlDeleteMonitorResponse], await self.request_async('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def developer_search(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlDeveloperSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeveloperSearchResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/developer"""
        return cast(NativeResponse[nt.FirecrawlDeveloperSearchResponse], await self.request_async('developerSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def developer_search_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlDeveloperSearchPostBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlDeveloperSearchPostResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search/developer"""
        return cast(NativeResponse[nt.FirecrawlDeveloperSearchPostResponse], await self.request_async('developerSearchPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def execute_browser_code(self, *, path: nt.FirecrawlExecuteBrowserCodePath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlExecuteBrowserCodeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlExecuteBrowserCodeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/interact/{sessionId}/execute"""
        return cast(NativeResponse[nt.FirecrawlExecuteBrowserCodeResponse], await self.request_async('executeBrowserCode', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlExtractResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/extract"""
        return cast(NativeResponse[nt.FirecrawlExtractResponse], await self.request_async('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_active_crawls(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetActiveCrawlsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/crawl/active"""
        return cast(NativeResponse[nt.FirecrawlGetActiveCrawlsResponse], await self.request_async('getActiveCrawls', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_activity(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGetActivityQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetActivityResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/activity"""
        return cast(NativeResponse[nt.FirecrawlGetActivityResponse], await self.request_async('getActivity', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_agent_snapshot(self, *, path: nt.FirecrawlGetAgentSnapshotPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetAgentSnapshotResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent/{jobId}/snapshots/{snapshotId}"""
        return cast(NativeResponse[nt.FirecrawlGetAgentSnapshotResponse], await self.request_async('getAgentSnapshot', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_agent_status(self, *, path: nt.FirecrawlGetAgentStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetAgentStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent/{jobId}"""
        return cast(NativeResponse[nt.FirecrawlGetAgentStatusResponse], await self.request_async('getAgentStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_agent_trace(self, *, path: nt.FirecrawlGetAgentTracePath, query: nt.FirecrawlGetAgentTraceQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetAgentTraceResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent/{jobId}/trace"""
        return cast(NativeResponse[nt.FirecrawlGetAgentTraceResponse], await self.request_async('getAgentTrace', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_batch_scrape_errors(self, *, path: nt.FirecrawlGetBatchScrapeErrorsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetBatchScrapeErrorsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/batch/scrape/{id}/errors"""
        return cast(NativeResponse[nt.FirecrawlGetBatchScrapeErrorsResponse], await self.request_async('getBatchScrapeErrors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_batch_scrape_status(self, *, path: nt.FirecrawlGetBatchScrapeStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetBatchScrapeStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/batch/scrape/{id}"""
        return cast(NativeResponse[nt.FirecrawlGetBatchScrapeStatusResponse], await self.request_async('getBatchScrapeStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_crawl_errors(self, *, path: nt.FirecrawlGetCrawlErrorsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetCrawlErrorsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/crawl/{id}/errors"""
        return cast(NativeResponse[nt.FirecrawlGetCrawlErrorsResponse], await self.request_async('getCrawlErrors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_crawl_status(self, *, path: nt.FirecrawlGetCrawlStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetCrawlStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/crawl/{id}"""
        return cast(NativeResponse[nt.FirecrawlGetCrawlStatusResponse], await self.request_async('getCrawlStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_credit_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetCreditUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/credit-usage"""
        return cast(NativeResponse[nt.FirecrawlGetCreditUsageResponse], await self.request_async('getCreditUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_extract_status(self, *, path: nt.FirecrawlGetExtractStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetExtractStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/extract/{id}"""
        return cast(NativeResponse[nt.FirecrawlGetExtractStatusResponse], await self.request_async('getExtractStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_historical_credit_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGetHistoricalCreditUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetHistoricalCreditUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/credit-usage/historical"""
        return cast(NativeResponse[nt.FirecrawlGetHistoricalCreditUsageResponse], await self.request_async('getHistoricalCreditUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_historical_token_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGetHistoricalTokenUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetHistoricalTokenUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/token-usage/historical"""
        return cast(NativeResponse[nt.FirecrawlGetHistoricalTokenUsageResponse], await self.request_async('getHistoricalTokenUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor(self, *, path: nt.FirecrawlGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor/{monitorId}"""
        return cast(NativeResponse[nt.FirecrawlGetMonitorResponse], await self.request_async('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor_check(self, *, path: nt.FirecrawlGetMonitorCheckPath, query: nt.FirecrawlGetMonitorCheckQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetMonitorCheckResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor/{monitorId}/checks/{checkId}"""
        return cast(NativeResponse[nt.FirecrawlGetMonitorCheckResponse], await self.request_async('getMonitorCheck', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_parse_formats(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetParseFormatsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/parse/formats"""
        return cast(NativeResponse[nt.FirecrawlGetParseFormatsResponse], await self.request_async('getParseFormats', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_queue_status(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetQueueStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/queue-status"""
        return cast(NativeResponse[nt.FirecrawlGetQueueStatusResponse], await self.request_async('getQueueStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_scrape_status(self, *, path: nt.FirecrawlGetScrapeStatusPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetScrapeStatusResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/scrape/{jobId}"""
        return cast(NativeResponse[nt.FirecrawlGetScrapeStatusResponse], await self.request_async('getScrapeStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_threat_protection(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetThreatProtectionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/threat-protection"""
        return cast(NativeResponse[nt.FirecrawlGetThreatProtectionResponse], await self.request_async('getThreatProtection', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_token_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGetTokenUsageResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/team/token-usage"""
        return cast(NativeResponse[nt.FirecrawlGetTokenUsageResponse], await self.request_async('getTokenUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def gov_search(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlGovSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGovSearchResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/gov"""
        return cast(NativeResponse[nt.FirecrawlGovSearchResponse], await self.request_async('govSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def gov_search_post(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlGovSearchPostBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlGovSearchPostResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search/gov"""
        return cast(NativeResponse[nt.FirecrawlGovSearchPostResponse], await self.request_async('govSearchPost', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def interact_with_scrape_browser_session(self, *, path: nt.FirecrawlInteractWithScrapeBrowserSessionPath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlInteractWithScrapeBrowserSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlInteractWithScrapeBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/scrape/{jobId}/interact"""
        return cast(NativeResponse[nt.FirecrawlInteractWithScrapeBrowserSessionResponse], await self.request_async('interactWithScrapeBrowserSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_agents(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlListAgentsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListAgentsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/agent"""
        return cast(NativeResponse[nt.FirecrawlListAgentsResponse], await self.request_async('listAgents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_browser_sessions(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlListBrowserSessionsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListBrowserSessionsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/interact"""
        return cast(NativeResponse[nt.FirecrawlListBrowserSessionsResponse], await self.request_async('listBrowserSessions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitor_checks(self, *, path: nt.FirecrawlListMonitorChecksPath, query: nt.FirecrawlListMonitorChecksQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListMonitorChecksResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor/{monitorId}/checks"""
        return cast(NativeResponse[nt.FirecrawlListMonitorChecksResponse], await self.request_async('listMonitorChecks', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlListMonitorsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/monitor"""
        return cast(NativeResponse[nt.FirecrawlListMonitorsResponse], await self.request_async('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def map(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlMapBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlMapResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/map"""
        return cast(NativeResponse[nt.FirecrawlMapResponse], await self.request_async('map', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def parse_file(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlParseFileResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/parse"""
        return cast(NativeResponse[nt.FirecrawlParseFileResponse], await self.request_async('parseFile', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def research_get_paper(self, *, path: nt.FirecrawlResearchGetPaperPath, query: nt.FirecrawlResearchGetPaperQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlResearchGetPaperResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/research/papers/{id}"""
        return cast(NativeResponse[nt.FirecrawlResearchGetPaperResponse], await self.request_async('researchGetPaper', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def research_related_papers(self, *, path: nt.FirecrawlResearchRelatedPapersPath, query: nt.FirecrawlResearchRelatedPapersQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlResearchRelatedPapersResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/research/papers/{id}/similar"""
        return cast(NativeResponse[nt.FirecrawlResearchRelatedPapersResponse], await self.request_async('researchRelatedPapers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def research_search_papers(self, *, path: Mapping[str, Any] | None = None, query: nt.FirecrawlResearchSearchPapersQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlResearchSearchPapersResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — GET https://api.firecrawl.dev/v2/search/research/papers"""
        return cast(NativeResponse[nt.FirecrawlResearchSearchPapersResponse], await self.request_async('researchSearchPapers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_monitor(self, *, path: nt.FirecrawlRunMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlRunMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/monitor/{monitorId}/run"""
        return cast(NativeResponse[nt.FirecrawlRunMonitorResponse], await self.request_async('runMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlScrapeResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/scrape"""
        return cast(NativeResponse[nt.FirecrawlScrapeResponse], await self.request_async('scrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSearchResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search"""
        return cast(NativeResponse[nt.FirecrawlSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_support_docs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSearchSupportDocsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSearchSupportDocsResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/support/docs-search"""
        return cast(NativeResponse[nt.FirecrawlSearchSupportDocsResponse], await self.request_async('searchSupportDocs', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def start_agent(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlStartAgentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlStartAgentResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/agent"""
        return cast(NativeResponse[nt.FirecrawlStartAgentResponse], await self.request_async('startAgent', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stop_interactive_scrape_browser_session(self, *, path: nt.FirecrawlStopInteractiveScrapeBrowserSessionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlStopInteractiveScrapeBrowserSessionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — DELETE https://api.firecrawl.dev/v2/scrape/{jobId}/interact"""
        return cast(NativeResponse[nt.FirecrawlStopInteractiveScrapeBrowserSessionResponse], await self.request_async('stopInteractiveScrapeBrowserSession', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def submit_endpoint_feedback(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSubmitEndpointFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSubmitEndpointFeedbackResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/feedback"""
        return cast(NativeResponse[nt.FirecrawlSubmitEndpointFeedbackResponse], await self.request_async('submitEndpointFeedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def submit_search_feedback(self, *, path: nt.FirecrawlSubmitSearchFeedbackPath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlSubmitSearchFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlSubmitSearchFeedbackResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — POST https://api.firecrawl.dev/v2/search/{jobId}/feedback"""
        return cast(NativeResponse[nt.FirecrawlSubmitSearchFeedbackResponse], await self.request_async('submitSearchFeedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_monitor(self, *, path: nt.FirecrawlUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.FirecrawlUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlUpdateMonitorResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — PATCH https://api.firecrawl.dev/v2/monitor/{monitorId}"""
        return cast(NativeResponse[nt.FirecrawlUpdateMonitorResponse], await self.request_async('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_threat_protection(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.FirecrawlUpdateThreatProtectionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.FirecrawlUpdateThreatProtectionResponse]:
        """https://docs.firecrawl.dev/api-reference/v2-openapi.json — PUT https://api.firecrawl.dev/v2/team/threat-protection"""
        return cast(NativeResponse[nt.FirecrawlUpdateThreatProtectionResponse], await self.request_async('updateThreatProtection', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class LinkupClient(NativeClient):
    """linkup provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('linkup', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def balance(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupBalanceResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/credits/balance"""
        return cast(NativeResponse[nt.LinkupBalanceResponse], self.request('balance', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupCreateExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupCreateExtractResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/extract"""
        return cast(NativeResponse[nt.LinkupCreateExtractResponse], self.request('createExtract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupCreateResearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupCreateResearchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/research"""
        return cast(NativeResponse[nt.LinkupCreateResearchResponse], self.request('createResearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_tasks(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupCreateTasksBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupCreateTasksResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/tasks"""
        return cast(NativeResponse[nt.LinkupCreateTasksResponse], self.request('createTasks', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def fetch_page(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupFetchPageBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupFetchPageResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/fetch"""
        return cast(NativeResponse[nt.LinkupFetchPageResponse], self.request('fetchPage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_extract(self, *, path: nt.LinkupGetExtractPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupGetExtractResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/extract/{id}"""
        return cast(NativeResponse[nt.LinkupGetExtractResponse], self.request('getExtract', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_research(self, *, path: nt.LinkupGetResearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupGetResearchResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/research/{id}"""
        return cast(NativeResponse[nt.LinkupGetResearchResponse], self.request('getResearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_task(self, *, path: nt.LinkupGetTaskPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupGetTaskResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/tasks/{id}"""
        return cast(NativeResponse[nt.LinkupGetTaskResponse], self.request('getTask', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_extract(self, *, path: Mapping[str, Any] | None = None, query: nt.LinkupListExtractQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupListExtractResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/extract"""
        return cast(NativeResponse[nt.LinkupListExtractResponse], self.request('listExtract', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_research(self, *, path: Mapping[str, Any] | None = None, query: nt.LinkupListResearchQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupListResearchResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/research"""
        return cast(NativeResponse[nt.LinkupListResearchResponse], self.request('listResearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_tasks(self, *, path: Mapping[str, Any] | None = None, query: nt.LinkupListTasksQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupListTasksResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/tasks"""
        return cast(NativeResponse[nt.LinkupListTasksResponse], self.request('listTasks', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def responses(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupResponsesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupResponsesResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/responses"""
        return cast(NativeResponse[nt.LinkupResponsesResponse], self.request('responses', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def rewind_fetch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupRewindFetchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupRewindFetchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/rewind/fetch"""
        return cast(NativeResponse[nt.LinkupRewindFetchResponse], self.request('rewindFetch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def rewind_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupRewindSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupRewindSearchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/rewind/search"""
        return cast(NativeResponse[nt.LinkupRewindSearchResponse], self.request('rewindSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupSearchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/search"""
        return cast(NativeResponse[nt.LinkupSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncLinkupClient(NativeClient):
    """linkup provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('linkup', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def balance(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupBalanceResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/credits/balance"""
        return cast(NativeResponse[nt.LinkupBalanceResponse], await self.request_async('balance', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupCreateExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupCreateExtractResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/extract"""
        return cast(NativeResponse[nt.LinkupCreateExtractResponse], await self.request_async('createExtract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupCreateResearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupCreateResearchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/research"""
        return cast(NativeResponse[nt.LinkupCreateResearchResponse], await self.request_async('createResearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_tasks(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupCreateTasksBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupCreateTasksResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/tasks"""
        return cast(NativeResponse[nt.LinkupCreateTasksResponse], await self.request_async('createTasks', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def fetch_page(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupFetchPageBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupFetchPageResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/fetch"""
        return cast(NativeResponse[nt.LinkupFetchPageResponse], await self.request_async('fetchPage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_extract(self, *, path: nt.LinkupGetExtractPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupGetExtractResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/extract/{id}"""
        return cast(NativeResponse[nt.LinkupGetExtractResponse], await self.request_async('getExtract', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_research(self, *, path: nt.LinkupGetResearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupGetResearchResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/research/{id}"""
        return cast(NativeResponse[nt.LinkupGetResearchResponse], await self.request_async('getResearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_task(self, *, path: nt.LinkupGetTaskPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupGetTaskResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/tasks/{id}"""
        return cast(NativeResponse[nt.LinkupGetTaskResponse], await self.request_async('getTask', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_extract(self, *, path: Mapping[str, Any] | None = None, query: nt.LinkupListExtractQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupListExtractResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/extract"""
        return cast(NativeResponse[nt.LinkupListExtractResponse], await self.request_async('listExtract', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_research(self, *, path: Mapping[str, Any] | None = None, query: nt.LinkupListResearchQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupListResearchResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/research"""
        return cast(NativeResponse[nt.LinkupListResearchResponse], await self.request_async('listResearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_tasks(self, *, path: Mapping[str, Any] | None = None, query: nt.LinkupListTasksQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupListTasksResponse]:
        """https://api.linkup.so/v1/openapi.json — GET https://api.linkup.so/v1/tasks"""
        return cast(NativeResponse[nt.LinkupListTasksResponse], await self.request_async('listTasks', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def responses(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupResponsesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupResponsesResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/responses"""
        return cast(NativeResponse[nt.LinkupResponsesResponse], await self.request_async('responses', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def rewind_fetch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupRewindFetchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupRewindFetchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/rewind/fetch"""
        return cast(NativeResponse[nt.LinkupRewindFetchResponse], await self.request_async('rewindFetch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def rewind_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupRewindSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupRewindSearchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/rewind/search"""
        return cast(NativeResponse[nt.LinkupRewindSearchResponse], await self.request_async('rewindSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.LinkupSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.LinkupSearchResponse]:
        """https://api.linkup.so/v1/openapi.json — POST https://api.linkup.so/v1/search"""
        return cast(NativeResponse[nt.LinkupSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class ParallelClient(NativeClient):
    """parallel provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('parallel', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def add_enrichment_to_find_all_run(self, *, path: nt.ParallelAddEnrichmentToFindAllRunPath, query: Mapping[str, Any] | None = None, body: nt.ParallelAddEnrichmentToFindAllRunBody, headers: nt.ParallelAddEnrichmentToFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelAddEnrichmentToFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs/{findall_id}/enrich"""
        return cast(NativeResponse[nt.ParallelAddEnrichmentToFindAllRunResponse], self.request('addEnrichmentToFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def add_runs_to_task_group(self, *, path: nt.ParallelAddRunsToTaskGroupPath, query: nt.ParallelAddRunsToTaskGroupQuery | None = None, body: nt.ParallelAddRunsToTaskGroupBody, headers: nt.ParallelAddRunsToTaskGroupHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelAddRunsToTaskGroupResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/runs"""
        return cast(NativeResponse[nt.ParallelAddRunsToTaskGroupResponse], self.request('addRunsToTaskGroup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_find_all_run(self, *, path: nt.ParallelCancelFindAllRunPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelCancelFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCancelFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs/{findall_id}/cancel"""
        return cast(NativeResponse[nt.ParallelCancelFindAllRunResponse], self.request('cancelFindAllRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_monitor(self, *, path: nt.ParallelCancelMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCancelMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors/{monitor_id}/cancel"""
        return cast(NativeResponse[nt.ParallelCancelMonitorResponse], self.request('cancelMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelChatCompletionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelChatCompletionsResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/chat/completions"""
        return cast(NativeResponse[nt.ParallelChatCompletionsResponse], self.request('chatCompletions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def chat_completions_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelChatCompletionsStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/chat/completions"""
        return cast(NativeResponse[SSEStream], self.request('chatCompletionsStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def clear_memory(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelClearMemoryBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelClearMemoryResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/memory/clear"""
        return cast(NativeResponse[nt.ParallelClearMemoryResponse], self.request('clearMemory', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_find_all_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateFindAllRunBody, headers: nt.ParallelCreateFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs"""
        return cast(NativeResponse[nt.ParallelCreateFindAllRunResponse], self.request('createFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors"""
        return cast(NativeResponse[nt.ParallelCreateMonitorResponse], self.request('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_response(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateResponseBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateResponseResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/responses"""
        return cast(NativeResponse[nt.ParallelCreateResponseResponse], self.request('createResponse', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_response_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateResponseStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/responses"""
        return cast(NativeResponse[SSEStream], self.request('createResponseStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_task_group(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateTaskGroupBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateTaskGroupResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/tasks/groups"""
        return cast(NativeResponse[nt.ParallelCreateTaskGroupResponse], self.request('createTaskGroup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_task_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateTaskRunBody, headers: nt.ParallelCreateTaskRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateTaskRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/tasks/runs"""
        return cast(NativeResponse[nt.ParallelCreateTaskRunResponse], self.request('createTaskRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def evict_from_memory(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelEvictFromMemoryBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelEvictFromMemoryResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/memory/evict"""
        return cast(NativeResponse[nt.ParallelEvictFromMemoryResponse], self.request('evictFromMemory', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extend_find_all_run(self, *, path: nt.ParallelExtendFindAllRunPath, query: Mapping[str, Any] | None = None, body: nt.ParallelExtendFindAllRunBody, headers: nt.ParallelExtendFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelExtendFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs/{findall_id}/extend"""
        return cast(NativeResponse[nt.ParallelExtendFindAllRunResponse], self.request('extendFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelExtractResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/extract"""
        return cast(NativeResponse[nt.ParallelExtractResponse], self.request('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def fast_entity_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelFastEntitySearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelFastEntitySearchResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/entity-search"""
        return cast(NativeResponse[nt.ParallelFastEntitySearchResponse], self.request('fastEntitySearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def fetch_task_group_runs(self, *, path: nt.ParallelFetchTaskGroupRunsPath, query: nt.ParallelFetchTaskGroupRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/runs"""
        return cast(NativeResponse[SSEStream], self.request('fetchTaskGroupRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def find_all_run_result(self, *, path: nt.ParallelFindAllRunResultPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelFindAllRunResultHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelFindAllRunResultResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}/result"""
        return cast(NativeResponse[nt.ParallelFindAllRunResultResponse], self.request('findAllRunResult', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_find_all_run_schema(self, *, path: nt.ParallelGetFindAllRunSchemaPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelGetFindAllRunSchemaHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelGetFindAllRunSchemaResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}/schema"""
        return cast(NativeResponse[nt.ParallelGetFindAllRunSchemaResponse], self.request('getFindAllRunSchema', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def image_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelImageSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelImageSearchResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/images/search"""
        return cast(NativeResponse[nt.ParallelImageSearchResponse], self.request('imageSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def ingest_find_all_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelIngestFindAllRunBody, headers: nt.ParallelIngestFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelIngestFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/ingest"""
        return cast(NativeResponse[nt.ParallelIngestFindAllRunResponse], self.request('ingestFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitor_events(self, *, path: nt.ParallelListMonitorEventsPath, query: nt.ParallelListMonitorEventsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelListMonitorEventsResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors/{monitor_id}/events"""
        return cast(NativeResponse[nt.ParallelListMonitorEventsResponse], self.request('listMonitorEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ParallelListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelListMonitorsResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors"""
        return cast(NativeResponse[nt.ParallelListMonitorsResponse], self.request('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def monitor_stats(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelMonitorStatsResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors/stats"""
        return cast(NativeResponse[nt.ParallelMonitorStatsResponse], self.request('monitorStats', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_find_all_run_status(self, *, path: nt.ParallelRetrieveFindAllRunStatusPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelRetrieveFindAllRunStatusHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveFindAllRunStatusResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveFindAllRunStatusResponse], self.request('retrieveFindAllRunStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_memory(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelRetrieveMemoryBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveMemoryResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/memory/retrieve"""
        return cast(NativeResponse[nt.ParallelRetrieveMemoryResponse], self.request('retrieveMemory', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_monitor(self, *, path: nt.ParallelRetrieveMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveMonitorResponse], self.request('retrieveMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_task_group(self, *, path: nt.ParallelRetrieveTaskGroupPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskGroupResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskGroupResponse], self.request('retrieveTaskGroup', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_task_group_run(self, *, path: nt.ParallelRetrieveTaskGroupRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskGroupRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/runs/{run_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskGroupRunResponse], self.request('retrieveTaskGroupRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_task_run(self, *, path: nt.ParallelRetrieveTaskRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskRunResponse], self.request('retrieveTaskRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_task_run_input(self, *, path: nt.ParallelRetrieveTaskRunInputPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskRunInputResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}/input"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskRunInputResponse], self.request('retrieveTaskRunInput', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_task_run_result(self, *, path: nt.ParallelRetrieveTaskRunResultPath, query: nt.ParallelRetrieveTaskRunResultQuery | None = None, headers: nt.ParallelRetrieveTaskRunResultHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskRunResultResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}/result"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskRunResultResponse], self.request('retrieveTaskRunResult', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelSearchResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/search"""
        return cast(NativeResponse[nt.ParallelSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stream_find_all_events(self, *, path: nt.ParallelStreamFindAllEventsPath, query: nt.ParallelStreamFindAllEventsQuery | None = None, headers: nt.ParallelStreamFindAllEventsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}/events"""
        return cast(NativeResponse[SSEStream], self.request('streamFindAllEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stream_task_group_events(self, *, path: nt.ParallelStreamTaskGroupEventsPath, query: nt.ParallelStreamTaskGroupEventsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/events"""
        return cast(NativeResponse[SSEStream], self.request('streamTaskGroupEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stream_task_run_events(self, *, path: nt.ParallelStreamTaskRunEventsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}/events"""
        return cast(NativeResponse[SSEStream], self.request('streamTaskRunEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def trigger_monitor_run(self, *, path: nt.ParallelTriggerMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelTriggerMonitorRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors/{monitor_id}/trigger"""
        return cast(NativeResponse[nt.ParallelTriggerMonitorRunResponse], self.request('triggerMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_monitor(self, *, path: nt.ParallelUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ParallelUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelUpdateMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors/{monitor_id}/update"""
        return cast(NativeResponse[nt.ParallelUpdateMonitorResponse], self.request('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncParallelClient(NativeClient):
    """parallel provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('parallel', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def add_enrichment_to_find_all_run(self, *, path: nt.ParallelAddEnrichmentToFindAllRunPath, query: Mapping[str, Any] | None = None, body: nt.ParallelAddEnrichmentToFindAllRunBody, headers: nt.ParallelAddEnrichmentToFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelAddEnrichmentToFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs/{findall_id}/enrich"""
        return cast(NativeResponse[nt.ParallelAddEnrichmentToFindAllRunResponse], await self.request_async('addEnrichmentToFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def add_runs_to_task_group(self, *, path: nt.ParallelAddRunsToTaskGroupPath, query: nt.ParallelAddRunsToTaskGroupQuery | None = None, body: nt.ParallelAddRunsToTaskGroupBody, headers: nt.ParallelAddRunsToTaskGroupHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelAddRunsToTaskGroupResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/runs"""
        return cast(NativeResponse[nt.ParallelAddRunsToTaskGroupResponse], await self.request_async('addRunsToTaskGroup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_find_all_run(self, *, path: nt.ParallelCancelFindAllRunPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelCancelFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCancelFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs/{findall_id}/cancel"""
        return cast(NativeResponse[nt.ParallelCancelFindAllRunResponse], await self.request_async('cancelFindAllRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_monitor(self, *, path: nt.ParallelCancelMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCancelMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors/{monitor_id}/cancel"""
        return cast(NativeResponse[nt.ParallelCancelMonitorResponse], await self.request_async('cancelMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelChatCompletionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelChatCompletionsResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/chat/completions"""
        return cast(NativeResponse[nt.ParallelChatCompletionsResponse], await self.request_async('chatCompletions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def chat_completions_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelChatCompletionsStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/chat/completions"""
        return cast(NativeResponse[SSEStream], await self.request_async('chatCompletionsStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def clear_memory(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelClearMemoryBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelClearMemoryResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/memory/clear"""
        return cast(NativeResponse[nt.ParallelClearMemoryResponse], await self.request_async('clearMemory', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_find_all_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateFindAllRunBody, headers: nt.ParallelCreateFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs"""
        return cast(NativeResponse[nt.ParallelCreateFindAllRunResponse], await self.request_async('createFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors"""
        return cast(NativeResponse[nt.ParallelCreateMonitorResponse], await self.request_async('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_response(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateResponseBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateResponseResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/responses"""
        return cast(NativeResponse[nt.ParallelCreateResponseResponse], await self.request_async('createResponse', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_response_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateResponseStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/responses"""
        return cast(NativeResponse[SSEStream], await self.request_async('createResponseStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_task_group(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateTaskGroupBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateTaskGroupResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/tasks/groups"""
        return cast(NativeResponse[nt.ParallelCreateTaskGroupResponse], await self.request_async('createTaskGroup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_task_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelCreateTaskRunBody, headers: nt.ParallelCreateTaskRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelCreateTaskRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/tasks/runs"""
        return cast(NativeResponse[nt.ParallelCreateTaskRunResponse], await self.request_async('createTaskRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def evict_from_memory(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelEvictFromMemoryBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelEvictFromMemoryResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/memory/evict"""
        return cast(NativeResponse[nt.ParallelEvictFromMemoryResponse], await self.request_async('evictFromMemory', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extend_find_all_run(self, *, path: nt.ParallelExtendFindAllRunPath, query: Mapping[str, Any] | None = None, body: nt.ParallelExtendFindAllRunBody, headers: nt.ParallelExtendFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelExtendFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/runs/{findall_id}/extend"""
        return cast(NativeResponse[nt.ParallelExtendFindAllRunResponse], await self.request_async('extendFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelExtractResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/extract"""
        return cast(NativeResponse[nt.ParallelExtractResponse], await self.request_async('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def fast_entity_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelFastEntitySearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelFastEntitySearchResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/entity-search"""
        return cast(NativeResponse[nt.ParallelFastEntitySearchResponse], await self.request_async('fastEntitySearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def fetch_task_group_runs(self, *, path: nt.ParallelFetchTaskGroupRunsPath, query: nt.ParallelFetchTaskGroupRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/runs"""
        return cast(NativeResponse[SSEStream], await self.request_async('fetchTaskGroupRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def find_all_run_result(self, *, path: nt.ParallelFindAllRunResultPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelFindAllRunResultHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelFindAllRunResultResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}/result"""
        return cast(NativeResponse[nt.ParallelFindAllRunResultResponse], await self.request_async('findAllRunResult', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_find_all_run_schema(self, *, path: nt.ParallelGetFindAllRunSchemaPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelGetFindAllRunSchemaHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelGetFindAllRunSchemaResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}/schema"""
        return cast(NativeResponse[nt.ParallelGetFindAllRunSchemaResponse], await self.request_async('getFindAllRunSchema', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def image_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelImageSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelImageSearchResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/images/search"""
        return cast(NativeResponse[nt.ParallelImageSearchResponse], await self.request_async('imageSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def ingest_find_all_run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelIngestFindAllRunBody, headers: nt.ParallelIngestFindAllRunHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelIngestFindAllRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/findall/ingest"""
        return cast(NativeResponse[nt.ParallelIngestFindAllRunResponse], await self.request_async('ingestFindAllRun', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitor_events(self, *, path: nt.ParallelListMonitorEventsPath, query: nt.ParallelListMonitorEventsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelListMonitorEventsResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors/{monitor_id}/events"""
        return cast(NativeResponse[nt.ParallelListMonitorEventsResponse], await self.request_async('listMonitorEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: nt.ParallelListMonitorsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelListMonitorsResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors"""
        return cast(NativeResponse[nt.ParallelListMonitorsResponse], await self.request_async('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def monitor_stats(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelMonitorStatsResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors/stats"""
        return cast(NativeResponse[nt.ParallelMonitorStatsResponse], await self.request_async('monitorStats', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_find_all_run_status(self, *, path: nt.ParallelRetrieveFindAllRunStatusPath, query: Mapping[str, Any] | None = None, headers: nt.ParallelRetrieveFindAllRunStatusHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveFindAllRunStatusResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveFindAllRunStatusResponse], await self.request_async('retrieveFindAllRunStatus', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_memory(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelRetrieveMemoryBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveMemoryResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1beta/memory/retrieve"""
        return cast(NativeResponse[nt.ParallelRetrieveMemoryResponse], await self.request_async('retrieveMemory', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_monitor(self, *, path: nt.ParallelRetrieveMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/monitors/{monitor_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveMonitorResponse], await self.request_async('retrieveMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_task_group(self, *, path: nt.ParallelRetrieveTaskGroupPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskGroupResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskGroupResponse], await self.request_async('retrieveTaskGroup', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_task_group_run(self, *, path: nt.ParallelRetrieveTaskGroupRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskGroupRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/runs/{run_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskGroupRunResponse], await self.request_async('retrieveTaskGroupRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_task_run(self, *, path: nt.ParallelRetrieveTaskRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskRunResponse], await self.request_async('retrieveTaskRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_task_run_input(self, *, path: nt.ParallelRetrieveTaskRunInputPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskRunInputResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}/input"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskRunInputResponse], await self.request_async('retrieveTaskRunInput', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_task_run_result(self, *, path: nt.ParallelRetrieveTaskRunResultPath, query: nt.ParallelRetrieveTaskRunResultQuery | None = None, headers: nt.ParallelRetrieveTaskRunResultHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelRetrieveTaskRunResultResponse]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}/result"""
        return cast(NativeResponse[nt.ParallelRetrieveTaskRunResultResponse], await self.request_async('retrieveTaskRunResult', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.ParallelSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelSearchResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/search"""
        return cast(NativeResponse[nt.ParallelSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stream_find_all_events(self, *, path: nt.ParallelStreamFindAllEventsPath, query: nt.ParallelStreamFindAllEventsQuery | None = None, headers: nt.ParallelStreamFindAllEventsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1beta/findall/runs/{findall_id}/events"""
        return cast(NativeResponse[SSEStream], await self.request_async('streamFindAllEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stream_task_group_events(self, *, path: nt.ParallelStreamTaskGroupEventsPath, query: nt.ParallelStreamTaskGroupEventsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/groups/{taskgroup_id}/events"""
        return cast(NativeResponse[SSEStream], await self.request_async('streamTaskGroupEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stream_task_run_events(self, *, path: nt.ParallelStreamTaskRunEventsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.parallel.ai/public-openapi.json — GET https://api.parallel.ai/v1/tasks/runs/{run_id}/events"""
        return cast(NativeResponse[SSEStream], await self.request_async('streamTaskRunEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def trigger_monitor_run(self, *, path: nt.ParallelTriggerMonitorRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelTriggerMonitorRunResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors/{monitor_id}/trigger"""
        return cast(NativeResponse[nt.ParallelTriggerMonitorRunResponse], await self.request_async('triggerMonitorRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_monitor(self, *, path: nt.ParallelUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.ParallelUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.ParallelUpdateMonitorResponse]:
        """https://docs.parallel.ai/public-openapi.json — POST https://api.parallel.ai/v1/monitors/{monitor_id}/update"""
        return cast(NativeResponse[nt.ParallelUpdateMonitorResponse], await self.request_async('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class PerplexityClient(NativeClient):
    """perplexity provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('perplexity', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def answer_questions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityAnswerQuestionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityAnswerQuestionsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/decisions"""
        return cast(NativeResponse[nt.PerplexityAnswerQuestionsResponse], self.request('answerQuestions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_agent_response(self, *, path: nt.PerplexityCancelAgentResponsePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCancelAgentResponseResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/agent/{id}/cancel"""
        return cast(NativeResponse[nt.PerplexityCancelAgentResponseResponse], self.request('cancelAgentResponse', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityChatCompletionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityChatCompletionsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/sonar"""
        return cast(NativeResponse[nt.PerplexityChatCompletionsResponse], self.request('chatCompletions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def chat_completions_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityChatCompletionsStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/sonar"""
        return cast(NativeResponse[SSEStream], self.request('chatCompletionsStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_agent(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateAgentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateAgentResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/agent"""
        return cast(NativeResponse[nt.PerplexityCreateAgentResponse], self.request('createAgent', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_agent_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateAgentStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/agent"""
        return cast(NativeResponse[SSEStream], self.request('createAgentStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_async_chat_completion(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateAsyncChatCompletionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateAsyncChatCompletionResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/async/sonar"""
        return cast(NativeResponse[nt.PerplexityCreateAsyncChatCompletionResponse], self.request('createAsyncChatCompletion', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_contextualized_embeddings(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateContextualizedEmbeddingsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateContextualizedEmbeddingsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/contextualizedembeddings"""
        return cast(NativeResponse[nt.PerplexityCreateContextualizedEmbeddingsResponse], self.request('createContextualizedEmbeddings', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_embeddings(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateEmbeddingsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateEmbeddingsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/embeddings"""
        return cast(NativeResponse[nt.PerplexityCreateEmbeddingsResponse], self.request('createEmbeddings', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_skill(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/skills"""
        return cast(NativeResponse[nt.PerplexityCreateSkillResponse], self.request('createSkill', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_skill(self, *, path: nt.PerplexityDeleteSkillPath, query: nt.PerplexityDeleteSkillQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityDeleteSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — DELETE https://api.perplexity.ai/v1/skills/{skill_id}"""
        return cast(NativeResponse[nt.PerplexityDeleteSkillResponse], self.request('deleteSkill', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def download_agent_file(self, *, path: nt.PerplexityDownloadAgentFilePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[bytes]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/agent/{id}/files/{file_id}/content"""
        return cast(NativeResponse[bytes], self.request('downloadAgentFile', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def download_skill(self, *, path: nt.PerplexityDownloadSkillPath, query: nt.PerplexityDownloadSkillQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityDownloadSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills/{skill_id}/download"""
        return cast(NativeResponse[nt.PerplexityDownloadSkillResponse], self.request('downloadSkill', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def generate_auth_token(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityGenerateAuthTokenBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGenerateAuthTokenResponse]:
        """https://docs.perplexity.ai/api-reference/generate-auth-token-post.md — POST https://api.perplexity.ai/generate_auth_token"""
        return cast(NativeResponse[nt.PerplexityGenerateAuthTokenResponse], self.request('generateAuthToken', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_async_chat_completion(self, *, path: nt.PerplexityGetAsyncChatCompletionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetAsyncChatCompletionResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/async/sonar/{api_request}"""
        return cast(NativeResponse[nt.PerplexityGetAsyncChatCompletionResponse], self.request('getAsyncChatCompletion', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_computer_usage_analytics(self, *, path: Mapping[str, Any] | None = None, query: nt.PerplexityGetComputerUsageAnalyticsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetComputerUsageAnalyticsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/analytics/computer/usage"""
        return cast(NativeResponse[nt.PerplexityGetComputerUsageAnalyticsResponse], self.request('getComputerUsageAnalytics', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_computer_usage_analytics_v2(self, *, path: Mapping[str, Any] | None = None, query: nt.PerplexityGetComputerUsageAnalyticsV2Query, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetComputerUsageAnalyticsV2Response]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v2/analytics/computer/usage"""
        return cast(NativeResponse[nt.PerplexityGetComputerUsageAnalyticsV2Response], self.request('getComputerUsageAnalyticsV2', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_router_model(self, *, path: nt.PerplexityGetRouterModelPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetRouterModelResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-model-get.md — GET https://api.perplexity.ai/router/v1/models/{model}"""
        return cast(NativeResponse[nt.PerplexityGetRouterModelResponse], self.request('getRouterModel', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_skill(self, *, path: nt.PerplexityGetSkillPath, query: nt.PerplexityGetSkillQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills/{skill_id}"""
        return cast(NativeResponse[nt.PerplexityGetSkillResponse], self.request('getSkill', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_agent_files(self, *, path: nt.PerplexityListAgentFilesPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListAgentFilesResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/agent/{id}/files"""
        return cast(NativeResponse[nt.PerplexityListAgentFilesResponse], self.request('listAgentFiles', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_async_chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListAsyncChatCompletionsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/async/sonar"""
        return cast(NativeResponse[nt.PerplexityListAsyncChatCompletionsResponse], self.request('listAsyncChatCompletions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_models(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListModelsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/models"""
        return cast(NativeResponse[nt.PerplexityListModelsResponse], self.request('listModels', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_router_models(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListRouterModelsResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-models-get.md — GET https://api.perplexity.ai/router/v1/models"""
        return cast(NativeResponse[nt.PerplexityListRouterModelsResponse], self.request('listRouterModels', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_skill_revisions(self, *, path: nt.PerplexityListSkillRevisionsPath, query: nt.PerplexityListSkillRevisionsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListSkillRevisionsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills/{skill_id}/revisions"""
        return cast(NativeResponse[nt.PerplexityListSkillRevisionsResponse], self.request('listSkillRevisions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_skills(self, *, path: Mapping[str, Any] | None = None, query: nt.PerplexityListSkillsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListSkillsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills"""
        return cast(NativeResponse[nt.PerplexityListSkillsResponse], self.request('listSkills', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retrieve_agent(self, *, path: nt.PerplexityRetrieveAgentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRetrieveAgentResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/agent/{id}"""
        return cast(NativeResponse[nt.PerplexityRetrieveAgentResponse], self.request('retrieveAgent', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def revoke_auth_token(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRevokeAuthTokenBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[None]:
        """https://docs.perplexity.ai/api-reference/revoke-auth-token-post.md — POST https://api.perplexity.ai/revoke_auth_token"""
        return cast(NativeResponse[None], self.request('revokeAuthToken', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def router_chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterChatCompletionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRouterChatCompletionsResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-chat-completions-post.md — POST https://api.perplexity.ai/router/v1/chat/completions"""
        return cast(NativeResponse[nt.PerplexityRouterChatCompletionsResponse], self.request('routerChatCompletions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def router_chat_completions_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterChatCompletionsStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/api-reference/gateway-chat-completions-post.md — POST https://api.perplexity.ai/router/v1/chat/completions"""
        return cast(NativeResponse[SSEStream], self.request('routerChatCompletionsStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def router_messages(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterMessagesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRouterMessagesResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-messages-post.md — POST https://api.perplexity.ai/router/v1/messages"""
        return cast(NativeResponse[nt.PerplexityRouterMessagesResponse], self.request('routerMessages', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def router_messages_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterMessagesStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/api-reference/gateway-messages-post.md — POST https://api.perplexity.ai/router/v1/messages"""
        return cast(NativeResponse[SSEStream], self.request('routerMessagesStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def router_responses(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterResponsesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRouterResponsesResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-responses-post.md — POST https://api.perplexity.ai/router/v1/responses"""
        return cast(NativeResponse[nt.PerplexityRouterResponsesResponse], self.request('routerResponses', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def router_responses_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterResponsesStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/api-reference/gateway-responses-post.md — POST https://api.perplexity.ai/router/v1/responses"""
        return cast(NativeResponse[SSEStream], self.request('routerResponsesStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexitySearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexitySearchResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/search"""
        return cast(NativeResponse[nt.PerplexitySearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_skill(self, *, path: nt.PerplexityUpdateSkillPath, query: nt.PerplexityUpdateSkillQuery, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityUpdateSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — PUT https://api.perplexity.ai/v1/skills/{skill_id}"""
        return cast(NativeResponse[nt.PerplexityUpdateSkillResponse], self.request('updateSkill', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncPerplexityClient(NativeClient):
    """perplexity provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('perplexity', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def answer_questions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityAnswerQuestionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityAnswerQuestionsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/decisions"""
        return cast(NativeResponse[nt.PerplexityAnswerQuestionsResponse], await self.request_async('answerQuestions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_agent_response(self, *, path: nt.PerplexityCancelAgentResponsePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCancelAgentResponseResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/agent/{id}/cancel"""
        return cast(NativeResponse[nt.PerplexityCancelAgentResponseResponse], await self.request_async('cancelAgentResponse', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityChatCompletionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityChatCompletionsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/sonar"""
        return cast(NativeResponse[nt.PerplexityChatCompletionsResponse], await self.request_async('chatCompletions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def chat_completions_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityChatCompletionsStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/sonar"""
        return cast(NativeResponse[SSEStream], await self.request_async('chatCompletionsStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_agent(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateAgentBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateAgentResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/agent"""
        return cast(NativeResponse[nt.PerplexityCreateAgentResponse], await self.request_async('createAgent', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_agent_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateAgentStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/agent"""
        return cast(NativeResponse[SSEStream], await self.request_async('createAgentStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_async_chat_completion(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateAsyncChatCompletionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateAsyncChatCompletionResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/async/sonar"""
        return cast(NativeResponse[nt.PerplexityCreateAsyncChatCompletionResponse], await self.request_async('createAsyncChatCompletion', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_contextualized_embeddings(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateContextualizedEmbeddingsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateContextualizedEmbeddingsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/contextualizedembeddings"""
        return cast(NativeResponse[nt.PerplexityCreateContextualizedEmbeddingsResponse], await self.request_async('createContextualizedEmbeddings', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_embeddings(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityCreateEmbeddingsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateEmbeddingsResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/embeddings"""
        return cast(NativeResponse[nt.PerplexityCreateEmbeddingsResponse], await self.request_async('createEmbeddings', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_skill(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityCreateSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/v1/skills"""
        return cast(NativeResponse[nt.PerplexityCreateSkillResponse], await self.request_async('createSkill', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_skill(self, *, path: nt.PerplexityDeleteSkillPath, query: nt.PerplexityDeleteSkillQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityDeleteSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — DELETE https://api.perplexity.ai/v1/skills/{skill_id}"""
        return cast(NativeResponse[nt.PerplexityDeleteSkillResponse], await self.request_async('deleteSkill', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def download_agent_file(self, *, path: nt.PerplexityDownloadAgentFilePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[bytes]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/agent/{id}/files/{file_id}/content"""
        return cast(NativeResponse[bytes], await self.request_async('downloadAgentFile', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def download_skill(self, *, path: nt.PerplexityDownloadSkillPath, query: nt.PerplexityDownloadSkillQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityDownloadSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills/{skill_id}/download"""
        return cast(NativeResponse[nt.PerplexityDownloadSkillResponse], await self.request_async('downloadSkill', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def generate_auth_token(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityGenerateAuthTokenBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGenerateAuthTokenResponse]:
        """https://docs.perplexity.ai/api-reference/generate-auth-token-post.md — POST https://api.perplexity.ai/generate_auth_token"""
        return cast(NativeResponse[nt.PerplexityGenerateAuthTokenResponse], await self.request_async('generateAuthToken', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_async_chat_completion(self, *, path: nt.PerplexityGetAsyncChatCompletionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetAsyncChatCompletionResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/async/sonar/{api_request}"""
        return cast(NativeResponse[nt.PerplexityGetAsyncChatCompletionResponse], await self.request_async('getAsyncChatCompletion', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_computer_usage_analytics(self, *, path: Mapping[str, Any] | None = None, query: nt.PerplexityGetComputerUsageAnalyticsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetComputerUsageAnalyticsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/analytics/computer/usage"""
        return cast(NativeResponse[nt.PerplexityGetComputerUsageAnalyticsResponse], await self.request_async('getComputerUsageAnalytics', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_computer_usage_analytics_v2(self, *, path: Mapping[str, Any] | None = None, query: nt.PerplexityGetComputerUsageAnalyticsV2Query, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetComputerUsageAnalyticsV2Response]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v2/analytics/computer/usage"""
        return cast(NativeResponse[nt.PerplexityGetComputerUsageAnalyticsV2Response], await self.request_async('getComputerUsageAnalyticsV2', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_router_model(self, *, path: nt.PerplexityGetRouterModelPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetRouterModelResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-model-get.md — GET https://api.perplexity.ai/router/v1/models/{model}"""
        return cast(NativeResponse[nt.PerplexityGetRouterModelResponse], await self.request_async('getRouterModel', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_skill(self, *, path: nt.PerplexityGetSkillPath, query: nt.PerplexityGetSkillQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityGetSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills/{skill_id}"""
        return cast(NativeResponse[nt.PerplexityGetSkillResponse], await self.request_async('getSkill', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_agent_files(self, *, path: nt.PerplexityListAgentFilesPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListAgentFilesResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/agent/{id}/files"""
        return cast(NativeResponse[nt.PerplexityListAgentFilesResponse], await self.request_async('listAgentFiles', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_async_chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListAsyncChatCompletionsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/async/sonar"""
        return cast(NativeResponse[nt.PerplexityListAsyncChatCompletionsResponse], await self.request_async('listAsyncChatCompletions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_models(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListModelsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/models"""
        return cast(NativeResponse[nt.PerplexityListModelsResponse], await self.request_async('listModels', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_router_models(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListRouterModelsResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-models-get.md — GET https://api.perplexity.ai/router/v1/models"""
        return cast(NativeResponse[nt.PerplexityListRouterModelsResponse], await self.request_async('listRouterModels', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_skill_revisions(self, *, path: nt.PerplexityListSkillRevisionsPath, query: nt.PerplexityListSkillRevisionsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListSkillRevisionsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills/{skill_id}/revisions"""
        return cast(NativeResponse[nt.PerplexityListSkillRevisionsResponse], await self.request_async('listSkillRevisions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_skills(self, *, path: Mapping[str, Any] | None = None, query: nt.PerplexityListSkillsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityListSkillsResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/skills"""
        return cast(NativeResponse[nt.PerplexityListSkillsResponse], await self.request_async('listSkills', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retrieve_agent(self, *, path: nt.PerplexityRetrieveAgentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRetrieveAgentResponse]:
        """https://docs.perplexity.ai/openapi.json — GET https://api.perplexity.ai/v1/agent/{id}"""
        return cast(NativeResponse[nt.PerplexityRetrieveAgentResponse], await self.request_async('retrieveAgent', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def revoke_auth_token(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRevokeAuthTokenBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[None]:
        """https://docs.perplexity.ai/api-reference/revoke-auth-token-post.md — POST https://api.perplexity.ai/revoke_auth_token"""
        return cast(NativeResponse[None], await self.request_async('revokeAuthToken', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def router_chat_completions(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterChatCompletionsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRouterChatCompletionsResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-chat-completions-post.md — POST https://api.perplexity.ai/router/v1/chat/completions"""
        return cast(NativeResponse[nt.PerplexityRouterChatCompletionsResponse], await self.request_async('routerChatCompletions', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def router_chat_completions_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterChatCompletionsStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/api-reference/gateway-chat-completions-post.md — POST https://api.perplexity.ai/router/v1/chat/completions"""
        return cast(NativeResponse[SSEStream], await self.request_async('routerChatCompletionsStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def router_messages(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterMessagesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRouterMessagesResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-messages-post.md — POST https://api.perplexity.ai/router/v1/messages"""
        return cast(NativeResponse[nt.PerplexityRouterMessagesResponse], await self.request_async('routerMessages', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def router_messages_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterMessagesStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/api-reference/gateway-messages-post.md — POST https://api.perplexity.ai/router/v1/messages"""
        return cast(NativeResponse[SSEStream], await self.request_async('routerMessagesStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def router_responses(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterResponsesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityRouterResponsesResponse]:
        """https://docs.perplexity.ai/api-reference/gateway-responses-post.md — POST https://api.perplexity.ai/router/v1/responses"""
        return cast(NativeResponse[nt.PerplexityRouterResponsesResponse], await self.request_async('routerResponses', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def router_responses_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexityRouterResponsesStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.perplexity.ai/api-reference/gateway-responses-post.md — POST https://api.perplexity.ai/router/v1/responses"""
        return cast(NativeResponse[SSEStream], await self.request_async('routerResponsesStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.PerplexitySearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexitySearchResponse]:
        """https://docs.perplexity.ai/openapi.json — POST https://api.perplexity.ai/search"""
        return cast(NativeResponse[nt.PerplexitySearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_skill(self, *, path: nt.PerplexityUpdateSkillPath, query: nt.PerplexityUpdateSkillQuery, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.PerplexityUpdateSkillResponse]:
        """https://docs.perplexity.ai/openapi.json — PUT https://api.perplexity.ai/v1/skills/{skill_id}"""
        return cast(NativeResponse[nt.PerplexityUpdateSkillResponse], await self.request_async('updateSkill', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class SerpapiClient(NativeClient):
    """serpapi provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('serpapi', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def account(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiAccountResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/account.json"""
        return cast(NativeResponse[nt.SerpapiAccountResponse], self.request('account', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extract(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiExtractQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiExtractResponse]:
        """https://serpapi.com/extract-api — GET https://serpapi.com/search.json"""
        return cast(NativeResponse[nt.SerpapiExtractResponse], self.request('extract', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extract_markdown(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiExtractMarkdownQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/extract-api — GET https://serpapi.com/search.md"""
        return cast(NativeResponse[str], self.request('extractMarkdown', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_search(self, *, path: nt.SerpapiGetSearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiGetSearchResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/searches/{search_id}.json"""
        return cast(NativeResponse[nt.SerpapiGetSearchResponse], self.request('getSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_search_html(self, *, path: nt.SerpapiGetSearchHtmlPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/search-api — GET https://serpapi.com/searches/{search_id}.html"""
        return cast(NativeResponse[str], self.request('getSearchHtml', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_search_pixel_positions(self, *, path: nt.SerpapiGetSearchPixelPositionsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiGetSearchPixelPositionsResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/searches/{search_id}.json_with_pixel_position"""
        return cast(NativeResponse[nt.SerpapiGetSearchPixelPositionsResponse], self.request('getSearchPixelPositions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def google(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiGoogleQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiGoogleResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.json"""
        return cast(NativeResponse[nt.SerpapiGoogleResponse], self.request('google', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def locations(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiLocationsResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/locations.json"""
        return cast(NativeResponse[nt.SerpapiLocationsResponse], self.request('locations', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiSearchResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.json"""
        return cast(NativeResponse[nt.SerpapiSearchResponse], self.request('search', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_html(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchHtmlQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.html"""
        return cast(NativeResponse[str], self.request('searchHtml', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_markdown(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchMarkdownQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.md"""
        return cast(NativeResponse[str], self.request('searchMarkdown', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_pixel_positions(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchPixelPositionsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiSearchPixelPositionsResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.json_with_pixel_position"""
        return cast(NativeResponse[nt.SerpapiSearchPixelPositionsResponse], self.request('searchPixelPositions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def upload_image(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiUploadImageResponse]:
        """https://serpapi.com/search-api — POST https://serpapi.com/image"""
        return cast(NativeResponse[nt.SerpapiUploadImageResponse], self.request('uploadImage', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncSerpapiClient(NativeClient):
    """serpapi provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('serpapi', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def account(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiAccountResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/account.json"""
        return cast(NativeResponse[nt.SerpapiAccountResponse], await self.request_async('account', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extract(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiExtractQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiExtractResponse]:
        """https://serpapi.com/extract-api — GET https://serpapi.com/search.json"""
        return cast(NativeResponse[nt.SerpapiExtractResponse], await self.request_async('extract', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extract_markdown(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiExtractMarkdownQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/extract-api — GET https://serpapi.com/search.md"""
        return cast(NativeResponse[str], await self.request_async('extractMarkdown', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_search(self, *, path: nt.SerpapiGetSearchPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiGetSearchResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/searches/{search_id}.json"""
        return cast(NativeResponse[nt.SerpapiGetSearchResponse], await self.request_async('getSearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_search_html(self, *, path: nt.SerpapiGetSearchHtmlPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/search-api — GET https://serpapi.com/searches/{search_id}.html"""
        return cast(NativeResponse[str], await self.request_async('getSearchHtml', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_search_pixel_positions(self, *, path: nt.SerpapiGetSearchPixelPositionsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiGetSearchPixelPositionsResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/searches/{search_id}.json_with_pixel_position"""
        return cast(NativeResponse[nt.SerpapiGetSearchPixelPositionsResponse], await self.request_async('getSearchPixelPositions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def google(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiGoogleQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiGoogleResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.json"""
        return cast(NativeResponse[nt.SerpapiGoogleResponse], await self.request_async('google', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def locations(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiLocationsResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/locations.json"""
        return cast(NativeResponse[nt.SerpapiLocationsResponse], await self.request_async('locations', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiSearchResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.json"""
        return cast(NativeResponse[nt.SerpapiSearchResponse], await self.request_async('search', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_html(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchHtmlQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.html"""
        return cast(NativeResponse[str], await self.request_async('searchHtml', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_markdown(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchMarkdownQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.md"""
        return cast(NativeResponse[str], await self.request_async('searchMarkdown', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_pixel_positions(self, *, path: Mapping[str, Any] | None = None, query: nt.SerpapiSearchPixelPositionsQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiSearchPixelPositionsResponse]:
        """https://serpapi.com/search-api — GET https://serpapi.com/search.json_with_pixel_position"""
        return cast(NativeResponse[nt.SerpapiSearchPixelPositionsResponse], await self.request_async('searchPixelPositions', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def upload_image(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, raw_body: MultipartBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerpapiUploadImageResponse]:
        """https://serpapi.com/search-api — POST https://serpapi.com/image"""
        return cast(NativeResponse[nt.SerpapiUploadImageResponse], await self.request_async('uploadImage', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class SerperClient(NativeClient):
    """serper provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('serper', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def autocomplete(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperAutocompleteBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperAutocompleteResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/autocomplete"""
        return cast(NativeResponse[nt.SerperAutocompleteResponse], self.request('autocomplete', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def autocomplete_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperAutocompleteGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperAutocompleteGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/autocomplete"""
        return cast(NativeResponse[nt.SerperAutocompleteGetResponse], self.request('autocompleteGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def images(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperImagesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperImagesResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/images"""
        return cast(NativeResponse[nt.SerperImagesResponse], self.request('images', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def images_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperImagesGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperImagesGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/images"""
        return cast(NativeResponse[nt.SerperImagesGetResponse], self.request('imagesGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def lens(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperLensBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperLensResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/lens"""
        return cast(NativeResponse[nt.SerperLensResponse], self.request('lens', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def lens_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperLensGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperLensGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/lens"""
        return cast(NativeResponse[nt.SerperLensGetResponse], self.request('lensGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def maps(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperMapsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperMapsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/maps"""
        return cast(NativeResponse[nt.SerperMapsResponse], self.request('maps', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def maps_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperMapsGetQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperMapsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/maps"""
        return cast(NativeResponse[nt.SerperMapsGetResponse], self.request('mapsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def news(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperNewsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperNewsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/news"""
        return cast(NativeResponse[nt.SerperNewsResponse], self.request('news', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def news_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperNewsGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperNewsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/news"""
        return cast(NativeResponse[nt.SerperNewsGetResponse], self.request('newsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def patents(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperPatentsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPatentsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/patents"""
        return cast(NativeResponse[nt.SerperPatentsResponse], self.request('patents', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def patents_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperPatentsGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPatentsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/patents"""
        return cast(NativeResponse[nt.SerperPatentsGetResponse], self.request('patentsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def places(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperPlacesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPlacesResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/places"""
        return cast(NativeResponse[nt.SerperPlacesResponse], self.request('places', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def places_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperPlacesGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPlacesGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/places"""
        return cast(NativeResponse[nt.SerperPlacesGetResponse], self.request('placesGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def reviews(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperReviewsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperReviewsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/reviews"""
        return cast(NativeResponse[nt.SerperReviewsResponse], self.request('reviews', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def reviews_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperReviewsGetQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperReviewsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/reviews"""
        return cast(NativeResponse[nt.SerperReviewsGetResponse], self.request('reviewsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def scholar(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperScholarBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScholarResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/scholar"""
        return cast(NativeResponse[nt.SerperScholarResponse], self.request('scholar', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def scholar_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperScholarGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScholarGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/scholar"""
        return cast(NativeResponse[nt.SerperScholarGetResponse], self.request('scholarGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScrapeResponse]:
        """https://serper.dev/playground — POST https://scrape.serper.dev/"""
        return cast(NativeResponse[nt.SerperScrapeResponse], self.request('scrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def scrape_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperScrapeGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScrapeGetResponse]:
        """https://serper.dev/playground — GET https://scrape.serper.dev/"""
        return cast(NativeResponse[nt.SerperScrapeGetResponse], self.request('scrapeGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperSearchResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/search"""
        return cast(NativeResponse[nt.SerperSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperSearchGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperSearchGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/search"""
        return cast(NativeResponse[nt.SerperSearchGetResponse], self.request('searchGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def shopping(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperShoppingBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperShoppingResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/shopping"""
        return cast(NativeResponse[nt.SerperShoppingResponse], self.request('shopping', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def shopping_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperShoppingGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperShoppingGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/shopping"""
        return cast(NativeResponse[nt.SerperShoppingGetResponse], self.request('shoppingGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def videos(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperVideosBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperVideosResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/videos"""
        return cast(NativeResponse[nt.SerperVideosResponse], self.request('videos', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def videos_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperVideosGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperVideosGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/videos"""
        return cast(NativeResponse[nt.SerperVideosGetResponse], self.request('videosGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncSerperClient(NativeClient):
    """serper provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('serper', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def autocomplete(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperAutocompleteBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperAutocompleteResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/autocomplete"""
        return cast(NativeResponse[nt.SerperAutocompleteResponse], await self.request_async('autocomplete', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def autocomplete_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperAutocompleteGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperAutocompleteGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/autocomplete"""
        return cast(NativeResponse[nt.SerperAutocompleteGetResponse], await self.request_async('autocompleteGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def images(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperImagesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperImagesResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/images"""
        return cast(NativeResponse[nt.SerperImagesResponse], await self.request_async('images', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def images_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperImagesGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperImagesGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/images"""
        return cast(NativeResponse[nt.SerperImagesGetResponse], await self.request_async('imagesGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def lens(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperLensBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperLensResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/lens"""
        return cast(NativeResponse[nt.SerperLensResponse], await self.request_async('lens', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def lens_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperLensGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperLensGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/lens"""
        return cast(NativeResponse[nt.SerperLensGetResponse], await self.request_async('lensGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def maps(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperMapsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperMapsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/maps"""
        return cast(NativeResponse[nt.SerperMapsResponse], await self.request_async('maps', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def maps_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperMapsGetQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperMapsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/maps"""
        return cast(NativeResponse[nt.SerperMapsGetResponse], await self.request_async('mapsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def news(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperNewsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperNewsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/news"""
        return cast(NativeResponse[nt.SerperNewsResponse], await self.request_async('news', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def news_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperNewsGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperNewsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/news"""
        return cast(NativeResponse[nt.SerperNewsGetResponse], await self.request_async('newsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def patents(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperPatentsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPatentsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/patents"""
        return cast(NativeResponse[nt.SerperPatentsResponse], await self.request_async('patents', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def patents_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperPatentsGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPatentsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/patents"""
        return cast(NativeResponse[nt.SerperPatentsGetResponse], await self.request_async('patentsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def places(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperPlacesBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPlacesResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/places"""
        return cast(NativeResponse[nt.SerperPlacesResponse], await self.request_async('places', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def places_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperPlacesGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperPlacesGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/places"""
        return cast(NativeResponse[nt.SerperPlacesGetResponse], await self.request_async('placesGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def reviews(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperReviewsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperReviewsResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/reviews"""
        return cast(NativeResponse[nt.SerperReviewsResponse], await self.request_async('reviews', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def reviews_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperReviewsGetQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperReviewsGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/reviews"""
        return cast(NativeResponse[nt.SerperReviewsGetResponse], await self.request_async('reviewsGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def scholar(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperScholarBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScholarResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/scholar"""
        return cast(NativeResponse[nt.SerperScholarResponse], await self.request_async('scholar', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def scholar_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperScholarGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScholarGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/scholar"""
        return cast(NativeResponse[nt.SerperScholarGetResponse], await self.request_async('scholarGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def scrape(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperScrapeBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScrapeResponse]:
        """https://serper.dev/playground — POST https://scrape.serper.dev/"""
        return cast(NativeResponse[nt.SerperScrapeResponse], await self.request_async('scrape', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def scrape_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperScrapeGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperScrapeGetResponse]:
        """https://serper.dev/playground — GET https://scrape.serper.dev/"""
        return cast(NativeResponse[nt.SerperScrapeGetResponse], await self.request_async('scrapeGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperSearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperSearchResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/search"""
        return cast(NativeResponse[nt.SerperSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperSearchGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperSearchGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/search"""
        return cast(NativeResponse[nt.SerperSearchGetResponse], await self.request_async('searchGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def shopping(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperShoppingBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperShoppingResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/shopping"""
        return cast(NativeResponse[nt.SerperShoppingResponse], await self.request_async('shopping', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def shopping_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperShoppingGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperShoppingGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/shopping"""
        return cast(NativeResponse[nt.SerperShoppingGetResponse], await self.request_async('shoppingGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def videos(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.SerperVideosBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperVideosResponse]:
        """https://serper.dev/playground — POST https://google.serper.dev/videos"""
        return cast(NativeResponse[nt.SerperVideosResponse], await self.request_async('videos', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def videos_get(self, *, path: Mapping[str, Any] | None = None, query: nt.SerperVideosGetQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.SerperVideosGetResponse]:
        """https://serper.dev/playground — GET https://google.serper.dev/videos"""
        return cast(NativeResponse[nt.SerperVideosGetResponse], await self.request_async('videosGet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class TavilyClient(NativeClient):
    """tavily provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str | None = None, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None, access_mode: str = "keyed") -> None:
        super().__init__('tavily', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry, access_mode=access_mode)

    def crawl(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyCrawlBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyCrawlResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/crawl.md — POST https://api.tavily.com/crawl"""
        return cast(NativeResponse[nt.TavilyCrawlResponse], self.request('crawl', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def deactivate_keys(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyDeactivateKeysBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyDeactivateKeysResponse]:
        """https://docs.tavily.com/documentation/enterprise/deactivate-keys.md — POST https://api-key-generator.tavily.com/deactivate-keys"""
        return cast(NativeResponse[nt.TavilyDeactivateKeysResponse], self.request('deactivateKeys', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyExtractResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/extract.md — POST https://api.tavily.com/extract"""
        return cast(NativeResponse[nt.TavilyExtractResponse], self.request('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def feedback(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyFeedbackResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/feedback.md — POST https://api.tavily.com/feedback"""
        return cast(NativeResponse[nt.TavilyFeedbackResponse], self.request('feedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def generate_keys(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyGenerateKeysBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyGenerateKeysResponse]:
        """https://docs.tavily.com/documentation/enterprise/generate-keys.md — POST https://api-key-generator.tavily.com/generate-keys"""
        return cast(NativeResponse[nt.TavilyGenerateKeysResponse], self.request('generateKeys', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_payment_pricing(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.tavily.com/documentation/machine-payments/x402.md — GET https://x402.tavily.com/.well-known/pricing"""
        return cast(NativeResponse[RawResponse], self.request('getPaymentPricing', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_research(self, *, path: nt.TavilyGetResearchPath, query: nt.TavilyGetResearchQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyGetResearchResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/research-get.md — GET https://api.tavily.com/research/{request_id}"""
        return cast(NativeResponse[nt.TavilyGetResearchResponse], self.request('getResearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: nt.TavilyGetUsageHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyGetUsageResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/usage.md — GET https://api.tavily.com/usage"""
        return cast(NativeResponse[nt.TavilyGetUsageResponse], self.request('getUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def key_info(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyKeyInfoResponse]:
        """https://docs.tavily.com/documentation/enterprise/key-info.md — GET https://api-key-generator.tavily.com/key-info"""
        return cast(NativeResponse[nt.TavilyKeyInfoResponse], self.request('keyInfo', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def logs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyLogsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyLogsResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/logs.md — POST https://api.tavily.com/logs"""
        return cast(NativeResponse[nt.TavilyLogsResponse], self.request('logs', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def map(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyMapBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyMapResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/map.md — POST https://api.tavily.com/map"""
        return cast(NativeResponse[nt.TavilyMapResponse], self.request('map', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def org_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyOrgUsageBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyOrgUsageResponse]:
        """https://docs.tavily.com/documentation/enterprise/org-usage.md — POST https://api.tavily.com/org-usage"""
        return cast(NativeResponse[nt.TavilyOrgUsageResponse], self.request('orgUsage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def paid_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyPaidSearchBody, headers: nt.TavilyPaidSearchHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyPaidSearchResponse]:
        """https://docs.tavily.com/documentation/machine-payments/x402.md — POST https://x402.tavily.com/search"""
        return cast(NativeResponse[nt.TavilyPaidSearchResponse], self.request('paidSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyResearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyResearchResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/research.md — POST https://api.tavily.com/research"""
        return cast(NativeResponse[nt.TavilyResearchResponse], self.request('research', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def research_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyResearchStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/research.md — POST https://api.tavily.com/research"""
        return cast(NativeResponse[SSEStream], self.request('researchStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilySearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilySearchResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/search.md — POST https://api.tavily.com/search"""
        return cast(NativeResponse[nt.TavilySearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncTavilyClient(NativeClient):
    """tavily provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str | None = None, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None, access_mode: str = "keyed") -> None:
        super().__init__('tavily', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry, access_mode=access_mode)

    async def crawl(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyCrawlBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyCrawlResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/crawl.md — POST https://api.tavily.com/crawl"""
        return cast(NativeResponse[nt.TavilyCrawlResponse], await self.request_async('crawl', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def deactivate_keys(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyDeactivateKeysBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyDeactivateKeysResponse]:
        """https://docs.tavily.com/documentation/enterprise/deactivate-keys.md — POST https://api-key-generator.tavily.com/deactivate-keys"""
        return cast(NativeResponse[nt.TavilyDeactivateKeysResponse], await self.request_async('deactivateKeys', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def extract(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyExtractBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyExtractResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/extract.md — POST https://api.tavily.com/extract"""
        return cast(NativeResponse[nt.TavilyExtractResponse], await self.request_async('extract', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def feedback(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyFeedbackBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyFeedbackResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/feedback.md — POST https://api.tavily.com/feedback"""
        return cast(NativeResponse[nt.TavilyFeedbackResponse], await self.request_async('feedback', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def generate_keys(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyGenerateKeysBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyGenerateKeysResponse]:
        """https://docs.tavily.com/documentation/enterprise/generate-keys.md — POST https://api-key-generator.tavily.com/generate-keys"""
        return cast(NativeResponse[nt.TavilyGenerateKeysResponse], await self.request_async('generateKeys', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_payment_pricing(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.tavily.com/documentation/machine-payments/x402.md — GET https://x402.tavily.com/.well-known/pricing"""
        return cast(NativeResponse[RawResponse], await self.request_async('getPaymentPricing', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_research(self, *, path: nt.TavilyGetResearchPath, query: nt.TavilyGetResearchQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyGetResearchResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/research-get.md — GET https://api.tavily.com/research/{request_id}"""
        return cast(NativeResponse[nt.TavilyGetResearchResponse], await self.request_async('getResearch', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: nt.TavilyGetUsageHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyGetUsageResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/usage.md — GET https://api.tavily.com/usage"""
        return cast(NativeResponse[nt.TavilyGetUsageResponse], await self.request_async('getUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def key_info(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyKeyInfoResponse]:
        """https://docs.tavily.com/documentation/enterprise/key-info.md — GET https://api-key-generator.tavily.com/key-info"""
        return cast(NativeResponse[nt.TavilyKeyInfoResponse], await self.request_async('keyInfo', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def logs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyLogsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyLogsResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/logs.md — POST https://api.tavily.com/logs"""
        return cast(NativeResponse[nt.TavilyLogsResponse], await self.request_async('logs', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def map(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyMapBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyMapResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/map.md — POST https://api.tavily.com/map"""
        return cast(NativeResponse[nt.TavilyMapResponse], await self.request_async('map', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def org_usage(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyOrgUsageBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyOrgUsageResponse]:
        """https://docs.tavily.com/documentation/enterprise/org-usage.md — POST https://api.tavily.com/org-usage"""
        return cast(NativeResponse[nt.TavilyOrgUsageResponse], await self.request_async('orgUsage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def paid_search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyPaidSearchBody, headers: nt.TavilyPaidSearchHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyPaidSearchResponse]:
        """https://docs.tavily.com/documentation/machine-payments/x402.md — POST https://x402.tavily.com/search"""
        return cast(NativeResponse[nt.TavilyPaidSearchResponse], await self.request_async('paidSearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyResearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilyResearchResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/research.md — POST https://api.tavily.com/research"""
        return cast(NativeResponse[nt.TavilyResearchResponse], await self.request_async('research', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def research_stream(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilyResearchStreamBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/research.md — POST https://api.tavily.com/research"""
        return cast(NativeResponse[SSEStream], await self.request_async('researchStream', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TavilySearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TavilySearchResponse]:
        """https://docs.tavily.com/documentation/api-reference/endpoint/search.md — POST https://api.tavily.com/search"""
        return cast(NativeResponse[nt.TavilySearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class TinyfishClient(NativeClient):
    """tinyfish provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('tinyfish', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def batch_cancel_runs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishBatchCancelRunsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishBatchCancelRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/runs/batch/cancel"""
        return cast(NativeResponse[nt.TinyfishBatchCancelRunsResponse], self.request('batchCancelRuns', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def batch_get_runs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishBatchGetRunsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishBatchGetRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/runs/batch"""
        return cast(NativeResponse[nt.TinyfishBatchGetRunsResponse], self.request('batchGetRuns', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_browser_context_profile_setup_session(self, *, path: nt.TinyfishCancelBrowserContextProfileSetupSessionPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishCancelBrowserContextProfileSetupSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCancelBrowserContextProfileSetupSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session/cancel"""
        return cast(NativeResponse[nt.TinyfishCancelBrowserContextProfileSetupSessionResponse], self.request('cancelBrowserContextProfileSetupSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_research_run(self, *, path: nt.TinyfishCancelResearchRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCancelResearchRunResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — POST https://agent.tinyfish.ai/v1/research-run/{research_run_id}/cancel"""
        return cast(NativeResponse[nt.TinyfishCancelResearchRunResponse], self.request('cancelResearchRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_run_by_id(self, *, path: nt.TinyfishCancelRunByIdPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCancelRunByIdResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/runs/{id}/cancel"""
        return cast(NativeResponse[nt.TinyfishCancelRunByIdResponse], self.request('cancelRunById', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def connect_vault(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishConnectVaultBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishConnectVaultResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/vault/connections"""
        return cast(NativeResponse[nt.TinyfishConnectVaultResponse], self.request('connectVault', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_browser_context_profile(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateBrowserContextProfileBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles"""
        return cast(NativeResponse[nt.TinyfishCreateBrowserContextProfileResponse], self.request('createBrowserContextProfile', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_browser_context_profile_setup_session(self, *, path: nt.TinyfishCreateBrowserContextProfileSetupSessionPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateBrowserContextProfileSetupSessionBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateBrowserContextProfileSetupSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session"""
        return cast(NativeResponse[nt.TinyfishCreateBrowserContextProfileSetupSessionResponse], self.request('createBrowserContextProfileSetupSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_browser_session(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateBrowserSessionBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateBrowserSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/browser — POST https://api.browser.tinyfish.ai/"""
        return cast(NativeResponse[nt.TinyfishCreateBrowserSessionResponse], self.request('createBrowserSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — POST https://agent.tinyfish.ai/v1/monitors"""
        return cast(NativeResponse[nt.TinyfishCreateMonitorResponse], self.request('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_browser_context_profile(self, *, path: nt.TinyfishDeleteBrowserContextProfilePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDeleteBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — DELETE https://agent.tinyfish.ai/v1/profiles/{profileId}"""
        return cast(NativeResponse[nt.TinyfishDeleteBrowserContextProfileResponse], self.request('deleteBrowserContextProfile', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_browser_context_profile_domain(self, *, path: nt.TinyfishDeleteBrowserContextProfileDomainPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDeleteBrowserContextProfileDomainResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — DELETE https://agent.tinyfish.ai/v1/profiles/{profileId}/domains/{domain}"""
        return cast(NativeResponse[nt.TinyfishDeleteBrowserContextProfileDomainResponse], self.request('deleteBrowserContextProfileDomain', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_browser_session(self, *, path: nt.TinyfishDeleteBrowserSessionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[None]:
        """https://agent.tinyfish.ai/v1/openapi/browser — DELETE https://api.browser.tinyfish.ai/{sessionId}"""
        return cast(NativeResponse[None], self.request('deleteBrowserSession', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_monitor(self, *, path: nt.TinyfishDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDeleteMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — DELETE https://agent.tinyfish.ai/v1/monitors/{id}"""
        return cast(NativeResponse[nt.TinyfishDeleteMonitorResponse], self.request('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def disconnect_vault(self, *, path: nt.TinyfishDisconnectVaultPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDisconnectVaultResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — DELETE https://agent.tinyfish.ai/v1/vault/connections/{connectionId}"""
        return cast(NativeResponse[nt.TinyfishDisconnectVaultResponse], self.request('disconnectVault', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def fetch_urls(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishFetchUrlsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishFetchUrlsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/fetch — POST https://api.fetch.tinyfish.ai/"""
        return cast(NativeResponse[nt.TinyfishFetchUrlsResponse], self.request('fetchUrls', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_browser_context_profile(self, *, path: nt.TinyfishGetBrowserContextProfilePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/profiles/{profileId}"""
        return cast(NativeResponse[nt.TinyfishGetBrowserContextProfileResponse], self.request('getBrowserContextProfile', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_monitor(self, *, path: nt.TinyfishGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — GET https://agent.tinyfish.ai/v1/monitors/{id}"""
        return cast(NativeResponse[nt.TinyfishGetMonitorResponse], self.request('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_research_run(self, *, path: nt.TinyfishGetResearchRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetResearchRunResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — GET https://agent.tinyfish.ai/v1/research-run/{research_run_id}"""
        return cast(NativeResponse[nt.TinyfishGetResearchRunResponse], self.request('getResearchRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_run_by_id(self, *, path: nt.TinyfishGetRunByIdPath, query: nt.TinyfishGetRunByIdQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetRunByIdResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs/{id}"""
        return cast(NativeResponse[nt.TinyfishGetRunByIdResponse], self.request('getRunById', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_step_html(self, *, path: nt.TinyfishGetStepHtmlPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/html"""
        return cast(NativeResponse[str], self.request('getStepHtml', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_step_screenshot(self, *, path: nt.TinyfishGetStepScreenshotPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[bytes]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/screenshot"""
        return cast(NativeResponse[bytes], self.request('getStepScreenshot', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_wallet(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetWalletResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/wallet"""
        return cast(NativeResponse[nt.TinyfishGetWalletResponse], self.request('getWallet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_browser_context_profiles(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListBrowserContextProfilesResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/profiles"""
        return cast(NativeResponse[nt.TinyfishListBrowserContextProfilesResponse], self.request('listBrowserContextProfiles', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_browser_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListBrowserUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListBrowserUsageResponse]:
        """https://agent.tinyfish.ai/v1/openapi/browser — GET https://api.browser.tinyfish.ai/usage"""
        return cast(NativeResponse[nt.TinyfishListBrowserUsageResponse], self.request('listBrowserUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_fetch_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListFetchUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListFetchUsageResponse]:
        """https://agent.tinyfish.ai/v1/openapi/fetch — GET https://api.fetch.tinyfish.ai/usage"""
        return cast(NativeResponse[nt.TinyfishListFetchUsageResponse], self.request('listFetchUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListMonitorsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — GET https://agent.tinyfish.ai/v1/monitors"""
        return cast(NativeResponse[nt.TinyfishListMonitorsResponse], self.request('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_research_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListResearchRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListResearchRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — GET https://agent.tinyfish.ai/v1/research-run"""
        return cast(NativeResponse[nt.TinyfishListResearchRunsResponse], self.request('listResearchRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs"""
        return cast(NativeResponse[nt.TinyfishListRunsResponse], self.request('listRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_search_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListSearchUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListSearchUsageResponse]:
        """https://agent.tinyfish.ai/v1/openapi/search — GET https://api.search.tinyfish.ai/usage"""
        return cast(NativeResponse[nt.TinyfishListSearchUsageResponse], self.request('listSearchUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_vault_connections(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListVaultConnectionsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/vault/connections"""
        return cast(NativeResponse[nt.TinyfishListVaultConnectionsResponse], self.request('listVaultConnections', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_vault_items(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListVaultItemsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/vault/items"""
        return cast(NativeResponse[nt.TinyfishListVaultItemsResponse], self.request('listVaultItems', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run"""
        return cast(NativeResponse[nt.TinyfishRunResponse], self.request('run', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_async(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunAsyncBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunAsyncResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run-async"""
        return cast(NativeResponse[nt.TinyfishRunAsyncResponse], self.request('runAsync', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_batch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunBatchResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run-batch"""
        return cast(NativeResponse[nt.TinyfishRunBatchResponse], self.request('runBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_monitor(self, *, path: nt.TinyfishRunMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — POST https://agent.tinyfish.ai/v1/monitors/{id}/runs"""
        return cast(NativeResponse[nt.TinyfishRunMonitorResponse], self.request('runMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunResearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://agent.tinyfish.ai/v1/openapi/research — POST https://agent.tinyfish.ai/v1/automation/run-research"""
        return cast(NativeResponse[SSEStream], self.request('runResearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def run_sse(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunSseBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run-sse"""
        return cast(NativeResponse[SSEStream], self.request('runSse', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def save_browser_context_profile_setup_session(self, *, path: nt.TinyfishSaveBrowserContextProfileSetupSessionPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishSaveBrowserContextProfileSetupSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishSaveBrowserContextProfileSetupSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/save"""
        return cast(NativeResponse[nt.TinyfishSaveBrowserContextProfileSetupSessionResponse], self.request('saveBrowserContextProfileSetupSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishSearchResponse]:
        """https://agent.tinyfish.ai/v1/openapi/search — GET https://api.search.tinyfish.ai/"""
        return cast(NativeResponse[nt.TinyfishSearchResponse], self.request('search', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def start_research_async(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishStartResearchAsyncBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishStartResearchAsyncResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — POST https://agent.tinyfish.ai/v1/automation/run-research-async"""
        return cast(NativeResponse[nt.TinyfishStartResearchAsyncResponse], self.request('startResearchAsync', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stream_research_events(self, *, path: nt.TinyfishStreamResearchEventsPath, query: Mapping[str, Any] | None = None, headers: nt.TinyfishStreamResearchEventsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://agent.tinyfish.ai/v1/openapi/research — GET https://agent.tinyfish.ai/v1/research-run/{research_run_id}/events"""
        return cast(NativeResponse[SSEStream], self.request('streamResearchEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def sync_vault_items(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishSyncVaultItemsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/vault/items/sync"""
        return cast(NativeResponse[nt.TinyfishSyncVaultItemsResponse], self.request('syncVaultItems', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def top_up_wallet(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishTopUpWalletBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishTopUpWalletResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/wallet/top-up"""
        return cast(NativeResponse[nt.TinyfishTopUpWalletResponse], self.request('topUpWallet', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_browser_context_profile(self, *, path: nt.TinyfishUpdateBrowserContextProfilePath, query: Mapping[str, Any] | None = None, body: nt.TinyfishUpdateBrowserContextProfileBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishUpdateBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — PATCH https://agent.tinyfish.ai/v1/profiles/{profileId}"""
        return cast(NativeResponse[nt.TinyfishUpdateBrowserContextProfileResponse], self.request('updateBrowserContextProfile', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_monitor(self, *, path: nt.TinyfishUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishUpdateMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — PATCH https://agent.tinyfish.ai/v1/monitors/{id}"""
        return cast(NativeResponse[nt.TinyfishUpdateMonitorResponse], self.request('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def upload_browser_context_profile_state(self, *, path: nt.TinyfishUploadBrowserContextProfileStatePath, query: Mapping[str, Any] | None = None, body: nt.TinyfishUploadBrowserContextProfileStateBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishUploadBrowserContextProfileStateResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/upload"""
        return cast(NativeResponse[nt.TinyfishUploadBrowserContextProfileStateResponse], self.request('uploadBrowserContextProfileState', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncTinyfishClient(NativeClient):
    """tinyfish provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('tinyfish', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def batch_cancel_runs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishBatchCancelRunsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishBatchCancelRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/runs/batch/cancel"""
        return cast(NativeResponse[nt.TinyfishBatchCancelRunsResponse], await self.request_async('batchCancelRuns', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def batch_get_runs(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishBatchGetRunsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishBatchGetRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/runs/batch"""
        return cast(NativeResponse[nt.TinyfishBatchGetRunsResponse], await self.request_async('batchGetRuns', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_browser_context_profile_setup_session(self, *, path: nt.TinyfishCancelBrowserContextProfileSetupSessionPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishCancelBrowserContextProfileSetupSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCancelBrowserContextProfileSetupSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session/cancel"""
        return cast(NativeResponse[nt.TinyfishCancelBrowserContextProfileSetupSessionResponse], await self.request_async('cancelBrowserContextProfileSetupSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_research_run(self, *, path: nt.TinyfishCancelResearchRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCancelResearchRunResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — POST https://agent.tinyfish.ai/v1/research-run/{research_run_id}/cancel"""
        return cast(NativeResponse[nt.TinyfishCancelResearchRunResponse], await self.request_async('cancelResearchRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_run_by_id(self, *, path: nt.TinyfishCancelRunByIdPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCancelRunByIdResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/runs/{id}/cancel"""
        return cast(NativeResponse[nt.TinyfishCancelRunByIdResponse], await self.request_async('cancelRunById', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def connect_vault(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishConnectVaultBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishConnectVaultResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/vault/connections"""
        return cast(NativeResponse[nt.TinyfishConnectVaultResponse], await self.request_async('connectVault', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_browser_context_profile(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateBrowserContextProfileBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles"""
        return cast(NativeResponse[nt.TinyfishCreateBrowserContextProfileResponse], await self.request_async('createBrowserContextProfile', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_browser_context_profile_setup_session(self, *, path: nt.TinyfishCreateBrowserContextProfileSetupSessionPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateBrowserContextProfileSetupSessionBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateBrowserContextProfileSetupSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session"""
        return cast(NativeResponse[nt.TinyfishCreateBrowserContextProfileSetupSessionResponse], await self.request_async('createBrowserContextProfileSetupSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_browser_session(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateBrowserSessionBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateBrowserSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/browser — POST https://api.browser.tinyfish.ai/"""
        return cast(NativeResponse[nt.TinyfishCreateBrowserSessionResponse], await self.request_async('createBrowserSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_monitor(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishCreateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishCreateMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — POST https://agent.tinyfish.ai/v1/monitors"""
        return cast(NativeResponse[nt.TinyfishCreateMonitorResponse], await self.request_async('createMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_browser_context_profile(self, *, path: nt.TinyfishDeleteBrowserContextProfilePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDeleteBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — DELETE https://agent.tinyfish.ai/v1/profiles/{profileId}"""
        return cast(NativeResponse[nt.TinyfishDeleteBrowserContextProfileResponse], await self.request_async('deleteBrowserContextProfile', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_browser_context_profile_domain(self, *, path: nt.TinyfishDeleteBrowserContextProfileDomainPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDeleteBrowserContextProfileDomainResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — DELETE https://agent.tinyfish.ai/v1/profiles/{profileId}/domains/{domain}"""
        return cast(NativeResponse[nt.TinyfishDeleteBrowserContextProfileDomainResponse], await self.request_async('deleteBrowserContextProfileDomain', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_browser_session(self, *, path: nt.TinyfishDeleteBrowserSessionPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[None]:
        """https://agent.tinyfish.ai/v1/openapi/browser — DELETE https://api.browser.tinyfish.ai/{sessionId}"""
        return cast(NativeResponse[None], await self.request_async('deleteBrowserSession', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_monitor(self, *, path: nt.TinyfishDeleteMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDeleteMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — DELETE https://agent.tinyfish.ai/v1/monitors/{id}"""
        return cast(NativeResponse[nt.TinyfishDeleteMonitorResponse], await self.request_async('deleteMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def disconnect_vault(self, *, path: nt.TinyfishDisconnectVaultPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishDisconnectVaultResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — DELETE https://agent.tinyfish.ai/v1/vault/connections/{connectionId}"""
        return cast(NativeResponse[nt.TinyfishDisconnectVaultResponse], await self.request_async('disconnectVault', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def fetch_urls(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishFetchUrlsBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishFetchUrlsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/fetch — POST https://api.fetch.tinyfish.ai/"""
        return cast(NativeResponse[nt.TinyfishFetchUrlsResponse], await self.request_async('fetchUrls', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_browser_context_profile(self, *, path: nt.TinyfishGetBrowserContextProfilePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/profiles/{profileId}"""
        return cast(NativeResponse[nt.TinyfishGetBrowserContextProfileResponse], await self.request_async('getBrowserContextProfile', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_monitor(self, *, path: nt.TinyfishGetMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — GET https://agent.tinyfish.ai/v1/monitors/{id}"""
        return cast(NativeResponse[nt.TinyfishGetMonitorResponse], await self.request_async('getMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_research_run(self, *, path: nt.TinyfishGetResearchRunPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetResearchRunResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — GET https://agent.tinyfish.ai/v1/research-run/{research_run_id}"""
        return cast(NativeResponse[nt.TinyfishGetResearchRunResponse], await self.request_async('getResearchRun', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_run_by_id(self, *, path: nt.TinyfishGetRunByIdPath, query: nt.TinyfishGetRunByIdQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetRunByIdResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs/{id}"""
        return cast(NativeResponse[nt.TinyfishGetRunByIdResponse], await self.request_async('getRunById', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_step_html(self, *, path: nt.TinyfishGetStepHtmlPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[str]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/html"""
        return cast(NativeResponse[str], await self.request_async('getStepHtml', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_step_screenshot(self, *, path: nt.TinyfishGetStepScreenshotPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[bytes]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/screenshot"""
        return cast(NativeResponse[bytes], await self.request_async('getStepScreenshot', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_wallet(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishGetWalletResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/wallet"""
        return cast(NativeResponse[nt.TinyfishGetWalletResponse], await self.request_async('getWallet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_browser_context_profiles(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListBrowserContextProfilesResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/profiles"""
        return cast(NativeResponse[nt.TinyfishListBrowserContextProfilesResponse], await self.request_async('listBrowserContextProfiles', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_browser_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListBrowserUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListBrowserUsageResponse]:
        """https://agent.tinyfish.ai/v1/openapi/browser — GET https://api.browser.tinyfish.ai/usage"""
        return cast(NativeResponse[nt.TinyfishListBrowserUsageResponse], await self.request_async('listBrowserUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_fetch_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListFetchUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListFetchUsageResponse]:
        """https://agent.tinyfish.ai/v1/openapi/fetch — GET https://api.fetch.tinyfish.ai/usage"""
        return cast(NativeResponse[nt.TinyfishListFetchUsageResponse], await self.request_async('listFetchUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_monitors(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListMonitorsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — GET https://agent.tinyfish.ai/v1/monitors"""
        return cast(NativeResponse[nt.TinyfishListMonitorsResponse], await self.request_async('listMonitors', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_research_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListResearchRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListResearchRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — GET https://agent.tinyfish.ai/v1/research-run"""
        return cast(NativeResponse[nt.TinyfishListResearchRunsResponse], await self.request_async('listResearchRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_runs(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListRunsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListRunsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/runs"""
        return cast(NativeResponse[nt.TinyfishListRunsResponse], await self.request_async('listRuns', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_search_usage(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishListSearchUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListSearchUsageResponse]:
        """https://agent.tinyfish.ai/v1/openapi/search — GET https://api.search.tinyfish.ai/usage"""
        return cast(NativeResponse[nt.TinyfishListSearchUsageResponse], await self.request_async('listSearchUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_vault_connections(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListVaultConnectionsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/vault/connections"""
        return cast(NativeResponse[nt.TinyfishListVaultConnectionsResponse], await self.request_async('listVaultConnections', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_vault_items(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishListVaultItemsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — GET https://agent.tinyfish.ai/v1/vault/items"""
        return cast(NativeResponse[nt.TinyfishListVaultItemsResponse], await self.request_async('listVaultItems', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run"""
        return cast(NativeResponse[nt.TinyfishRunResponse], await self.request_async('run', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_async(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunAsyncBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunAsyncResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run-async"""
        return cast(NativeResponse[nt.TinyfishRunAsyncResponse], await self.request_async('runAsync', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_batch(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunBatchResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run-batch"""
        return cast(NativeResponse[nt.TinyfishRunBatchResponse], await self.request_async('runBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_monitor(self, *, path: nt.TinyfishRunMonitorPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishRunMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — POST https://agent.tinyfish.ai/v1/monitors/{id}/runs"""
        return cast(NativeResponse[nt.TinyfishRunMonitorResponse], await self.request_async('runMonitor', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunResearchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://agent.tinyfish.ai/v1/openapi/research — POST https://agent.tinyfish.ai/v1/automation/run-research"""
        return cast(NativeResponse[SSEStream], await self.request_async('runResearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def run_sse(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishRunSseBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/automation/run-sse"""
        return cast(NativeResponse[SSEStream], await self.request_async('runSse', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def save_browser_context_profile_setup_session(self, *, path: nt.TinyfishSaveBrowserContextProfileSetupSessionPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishSaveBrowserContextProfileSetupSessionBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishSaveBrowserContextProfileSetupSessionResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/save"""
        return cast(NativeResponse[nt.TinyfishSaveBrowserContextProfileSetupSessionResponse], await self.request_async('saveBrowserContextProfileSetupSession', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: nt.TinyfishSearchQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishSearchResponse]:
        """https://agent.tinyfish.ai/v1/openapi/search — GET https://api.search.tinyfish.ai/"""
        return cast(NativeResponse[nt.TinyfishSearchResponse], await self.request_async('search', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def start_research_async(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishStartResearchAsyncBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishStartResearchAsyncResponse]:
        """https://agent.tinyfish.ai/v1/openapi/research — POST https://agent.tinyfish.ai/v1/automation/run-research-async"""
        return cast(NativeResponse[nt.TinyfishStartResearchAsyncResponse], await self.request_async('startResearchAsync', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stream_research_events(self, *, path: nt.TinyfishStreamResearchEventsPath, query: Mapping[str, Any] | None = None, headers: nt.TinyfishStreamResearchEventsHeaders | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://agent.tinyfish.ai/v1/openapi/research — GET https://agent.tinyfish.ai/v1/research-run/{research_run_id}/events"""
        return cast(NativeResponse[SSEStream], await self.request_async('streamResearchEvents', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def sync_vault_items(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishSyncVaultItemsResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/vault/items/sync"""
        return cast(NativeResponse[nt.TinyfishSyncVaultItemsResponse], await self.request_async('syncVaultItems', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def top_up_wallet(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.TinyfishTopUpWalletBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishTopUpWalletResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/wallet/top-up"""
        return cast(NativeResponse[nt.TinyfishTopUpWalletResponse], await self.request_async('topUpWallet', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_browser_context_profile(self, *, path: nt.TinyfishUpdateBrowserContextProfilePath, query: Mapping[str, Any] | None = None, body: nt.TinyfishUpdateBrowserContextProfileBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishUpdateBrowserContextProfileResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — PATCH https://agent.tinyfish.ai/v1/profiles/{profileId}"""
        return cast(NativeResponse[nt.TinyfishUpdateBrowserContextProfileResponse], await self.request_async('updateBrowserContextProfile', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_monitor(self, *, path: nt.TinyfishUpdateMonitorPath, query: Mapping[str, Any] | None = None, body: nt.TinyfishUpdateMonitorBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishUpdateMonitorResponse]:
        """https://agent.tinyfish.ai/v1/openapi/monitor — PATCH https://agent.tinyfish.ai/v1/monitors/{id}"""
        return cast(NativeResponse[nt.TinyfishUpdateMonitorResponse], await self.request_async('updateMonitor', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def upload_browser_context_profile_state(self, *, path: nt.TinyfishUploadBrowserContextProfileStatePath, query: Mapping[str, Any] | None = None, body: nt.TinyfishUploadBrowserContextProfileStateBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.TinyfishUploadBrowserContextProfileStateResponse]:
        """https://agent.tinyfish.ai/v1/openapi/main — POST https://agent.tinyfish.ai/v1/profiles/{profileId}/upload"""
        return cast(NativeResponse[nt.TinyfishUploadBrowserContextProfileStateResponse], await self.request_async('uploadBrowserContextProfileState', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class WondersearchClient(NativeClient):
    """wondersearch provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('wondersearch', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def accept_invitation(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.WondersearchAcceptInvitationBody, headers: nt.WondersearchAcceptInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchAcceptInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/invitations/accept"""
        return cast(NativeResponse[nt.WondersearchAcceptInvitationResponse], self.request('acceptInvitation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def acknowledge_import_chunk(self, *, path: nt.WondersearchAcknowledgeImportChunkPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchAcknowledgeImportChunkBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchAcknowledgeImportChunkResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/chunks/{sequence}/acknowledge"""
        return cast(NativeResponse[nt.WondersearchAcknowledgeImportChunkResponse], self.request('acknowledgeImportChunk', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def amount_auto_topup(self, *, path: nt.WondersearchAmountAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchAmountAutoTopupBody, headers: nt.WondersearchAmountAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchAmountAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/amount"""
        return cast(NativeResponse[nt.WondersearchAmountAutoTopupResponse], self.request('amountAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def bootstrap_account(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: nt.WondersearchBootstrapAccountHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchBootstrapAccountResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/account/bootstrap"""
        return cast(NativeResponse[nt.WondersearchBootstrapAccountResponse], self.request('bootstrapAccount', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def cancel_auto_topup(self, *, path: nt.WondersearchCancelAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCancelAutoTopupBody, headers: nt.WondersearchCancelAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCancelAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/cancel"""
        return cast(NativeResponse[nt.WondersearchCancelAutoTopupResponse], self.request('cancelAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def checkout_auto_topup(self, *, path: nt.WondersearchCheckoutAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCheckoutAutoTopupBody, headers: nt.WondersearchCheckoutAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCheckoutAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/checkout"""
        return cast(NativeResponse[nt.WondersearchCheckoutAutoTopupResponse], self.request('checkoutAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def close_import(self, *, path: nt.WondersearchCloseImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCloseImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCloseImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/close"""
        return cast(NativeResponse[nt.WondersearchCloseImportResponse], self.request('closeImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def complete_upload(self, *, path: nt.WondersearchCompleteUploadPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCompleteUploadBody, headers: nt.WondersearchCompleteUploadHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCompleteUploadResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}/complete"""
        return cast(NativeResponse[nt.WondersearchCompleteUploadResponse], self.request('completeUpload', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def complete_upload_batch(self, *, path: nt.WondersearchCompleteUploadBatchPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCompleteUploadBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCompleteUploadBatchResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/batch/complete"""
        return cast(NativeResponse[nt.WondersearchCompleteUploadBatchResponse], self.request('completeUploadBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_billing_portal(self, *, path: nt.WondersearchCreateBillingPortalPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchCreateBillingPortalHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateBillingPortalResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/portal"""
        return cast(NativeResponse[nt.WondersearchCreateBillingPortalResponse], self.request('createBillingPortal', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_drive_document(self, *, path: nt.WondersearchCreateDriveDocumentPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateDriveDocumentBody, headers: nt.WondersearchCreateDriveDocumentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateDriveDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/documents"""
        return cast(NativeResponse[nt.WondersearchCreateDriveDocumentResponse], self.request('createDriveDocument', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_drive_folder(self, *, path: nt.WondersearchCreateDriveFolderPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateDriveFolderBody, headers: nt.WondersearchCreateDriveFolderHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/folders"""
        return cast(NativeResponse[nt.WondersearchCreateDriveFolderResponse], self.request('createDriveFolder', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_drive_upload(self, *, path: nt.WondersearchCreateDriveUploadPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateDriveUploadBody, headers: nt.WondersearchCreateDriveUploadHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateDriveUploadResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads"""
        return cast(NativeResponse[nt.WondersearchCreateDriveUploadResponse], self.request('createDriveUpload', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_import(self, *, path: nt.WondersearchCreateImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}"""
        return cast(NativeResponse[nt.WondersearchCreateImportResponse], self.request('createImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_organization_billing_purchase(self, *, path: nt.WondersearchCreateOrganizationBillingPurchasePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateOrganizationBillingPurchaseBody, headers: nt.WondersearchCreateOrganizationBillingPurchaseHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateOrganizationBillingPurchaseResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/purchases"""
        return cast(NativeResponse[nt.WondersearchCreateOrganizationBillingPurchaseResponse], self.request('createOrganizationBillingPurchase', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_organization_invitation(self, *, path: nt.WondersearchCreateOrganizationInvitationPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateOrganizationInvitationBody, headers: nt.WondersearchCreateOrganizationInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations"""
        return cast(NativeResponse[nt.WondersearchCreateOrganizationInvitationResponse], self.request('createOrganizationInvitation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_organization_workspace(self, *, path: nt.WondersearchCreateOrganizationWorkspacePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateOrganizationWorkspaceBody, headers: nt.WondersearchCreateOrganizationWorkspaceHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateOrganizationWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/workspaces"""
        return cast(NativeResponse[nt.WondersearchCreateOrganizationWorkspaceResponse], self.request('createOrganizationWorkspace', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_upload_batch(self, *, path: nt.WondersearchCreateUploadBatchPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateUploadBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateUploadBatchResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/batch"""
        return cast(NativeResponse[nt.WondersearchCreateUploadBatchResponse], self.request('createUploadBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_upload_transfer(self, *, path: nt.WondersearchCreateUploadTransferPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateUploadTransferBody, headers: nt.WondersearchCreateUploadTransferHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateUploadTransferResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}/transfer"""
        return cast(NativeResponse[nt.WondersearchCreateUploadTransferResponse], self.request('createUploadTransfer', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_workspace_api_key(self, *, path: nt.WondersearchCreateWorkspaceApiKeyPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateWorkspaceApiKeyBody, headers: nt.WondersearchCreateWorkspaceApiKeyHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateWorkspaceApiKeyResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/api-keys"""
        return cast(NativeResponse[nt.WondersearchCreateWorkspaceApiKeyResponse], self.request('createWorkspaceApiKey', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_workspace_drive(self, *, path: nt.WondersearchCreateWorkspaceDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateWorkspaceDriveBody, headers: nt.WondersearchCreateWorkspaceDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateWorkspaceDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/drives"""
        return cast(NativeResponse[nt.WondersearchCreateWorkspaceDriveResponse], self.request('createWorkspaceDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def create_workspace_member(self, *, path: nt.WondersearchCreateWorkspaceMemberPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateWorkspaceMemberBody, headers: nt.WondersearchCreateWorkspaceMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateWorkspaceMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members"""
        return cast(NativeResponse[nt.WondersearchCreateWorkspaceMemberResponse], self.request('createWorkspaceMember', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def declare_import_chunks(self, *, path: nt.WondersearchDeclareImportChunksPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchDeclareImportChunksBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeclareImportChunksResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/chunks"""
        return cast(NativeResponse[nt.WondersearchDeclareImportChunksResponse], self.request('declareImportChunks', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_drive(self, *, path: nt.WondersearchDeleteDrivePath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteDriveResponse], self.request('deleteDrive', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_drive_document(self, *, path: nt.WondersearchDeleteDriveDocumentPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteDriveDocumentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteDriveDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteDriveDocumentResponse], self.request('deleteDriveDocument', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_drive_folder(self, *, path: nt.WondersearchDeleteDriveFolderPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteDriveFolderHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteDriveFolderResponse], self.request('deleteDriveFolder', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_organization_invitation(self, *, path: nt.WondersearchDeleteOrganizationInvitationPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteOrganizationInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteOrganizationInvitationResponse], self.request('deleteOrganizationInvitation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_organization_member(self, *, path: nt.WondersearchDeleteOrganizationMemberPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteOrganizationMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteOrganizationMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/organizations/{organization_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteOrganizationMemberResponse], self.request('deleteOrganizationMember', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_workspace_api_key(self, *, path: nt.WondersearchDeleteWorkspaceApiKeyPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteWorkspaceApiKeyResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/workspaces/{workspace_id}/api-keys/{key_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteWorkspaceApiKeyResponse], self.request('deleteWorkspaceApiKey', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def delete_workspace_member(self, *, path: nt.WondersearchDeleteWorkspaceMemberPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteWorkspaceMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteWorkspaceMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteWorkspaceMemberResponse], self.request('deleteWorkspaceMember', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_auto_topup(self, *, path: nt.WondersearchGetAutoTopupPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup"""
        return cast(NativeResponse[nt.WondersearchGetAutoTopupResponse], self.request('getAutoTopup', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_capabilities(self, *, path: nt.WondersearchGetCapabilitiesPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetCapabilitiesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/capabilities"""
        return cast(NativeResponse[nt.WondersearchGetCapabilitiesResponse], self.request('getCapabilities', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive(self, *, path: nt.WondersearchGetDrivePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveResponse], self.request('getDrive', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_document(self, *, path: nt.WondersearchGetDriveDocumentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveDocumentResponse], self.request('getDriveDocument', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_document_source(self, *, path: nt.WondersearchGetDriveDocumentSourcePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[bytes]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}/source"""
        return cast(NativeResponse[bytes], self.request('getDriveDocumentSource', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_folder(self, *, path: nt.WondersearchGetDriveFolderPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveFolderResponse], self.request('getDriveFolder', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_folder_raw(self, *, path: nt.WondersearchGetDriveFolderRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[RawResponse], self.request('getDriveFolderRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_raw(self, *, path: nt.WondersearchGetDriveRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[RawResponse], self.request('getDriveRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_upload(self, *, path: nt.WondersearchGetDriveUploadPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveUploadResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveUploadResponse], self.request('getDriveUpload', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_drive_upload_capabilities(self, *, path: nt.WondersearchGetDriveUploadCapabilitiesPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveUploadCapabilitiesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/capabilities"""
        return cast(NativeResponse[nt.WondersearchGetDriveUploadCapabilitiesResponse], self.request('getDriveUploadCapabilities', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_import(self, *, path: nt.WondersearchGetImportPath, query: nt.WondersearchGetImportQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}"""
        return cast(NativeResponse[nt.WondersearchGetImportResponse], self.request('getImport', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_ingestion_metrics(self, *, path: nt.WondersearchGetIngestionMetricsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetIngestionMetricsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/ingestion-metrics"""
        return cast(NativeResponse[nt.WondersearchGetIngestionMetricsResponse], self.request('getIngestionMetrics', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_me(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetMeResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/me"""
        return cast(NativeResponse[nt.WondersearchGetMeResponse], self.request('getMe', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization(self, *, path: nt.WondersearchGetOrganizationPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationResponse], self.request('getOrganization', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_billing(self, *, path: nt.WondersearchGetOrganizationBillingPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingResponse], self.request('getOrganizationBilling', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_billing_activity(self, *, path: nt.WondersearchGetOrganizationBillingActivityPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingActivityResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/activity"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingActivityResponse], self.request('getOrganizationBillingActivity', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_billing_limits(self, *, path: nt.WondersearchGetOrganizationBillingLimitsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingLimitsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/limits"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingLimitsResponse], self.request('getOrganizationBillingLimits', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_billing_purchase(self, *, path: nt.WondersearchGetOrganizationBillingPurchasePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingPurchaseResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/purchases/{purchase_id}"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingPurchaseResponse], self.request('getOrganizationBillingPurchase', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_billing_usage(self, *, path: nt.WondersearchGetOrganizationBillingUsagePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingUsageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/usage"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingUsageResponse], self.request('getOrganizationBillingUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_billing_wallet(self, *, path: nt.WondersearchGetOrganizationBillingWalletPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingWalletResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/wallet"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingWalletResponse], self.request('getOrganizationBillingWallet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_invitation(self, *, path: nt.WondersearchGetOrganizationInvitationPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationInvitationResponse], self.request('getOrganizationInvitation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_invitation_raw(self, *, path: nt.WondersearchGetOrganizationInvitationRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}"""
        return cast(NativeResponse[RawResponse], self.request('getOrganizationInvitationRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_raw(self, *, path: nt.WondersearchGetOrganizationRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}"""
        return cast(NativeResponse[RawResponse], self.request('getOrganizationRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_organization_usage(self, *, path: nt.WondersearchGetOrganizationUsagePath, query: nt.WondersearchGetOrganizationUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationUsageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/usage"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationUsageResponse], self.request('getOrganizationUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_passage(self, *, path: nt.WondersearchGetPassagePath, query: nt.WondersearchGetPassageQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetPassageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/passages/{passage_id}"""
        return cast(NativeResponse[nt.WondersearchGetPassageResponse], self.request('getPassage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_sdk_context(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetSdkContextResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/sdk/context"""
        return cast(NativeResponse[nt.WondersearchGetSdkContextResponse], self.request('getSdkContext', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_upload_batch_status(self, *, path: nt.WondersearchGetUploadBatchStatusPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchGetUploadBatchStatusBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetUploadBatchStatusResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/batch/status"""
        return cast(NativeResponse[nt.WondersearchGetUploadBatchStatusResponse], self.request('getUploadBatchStatus', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace(self, *, path: nt.WondersearchGetWorkspacePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceResponse], self.request('getWorkspace', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace_default_drive(self, *, path: nt.WondersearchGetWorkspaceDefaultDrivePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceDefaultDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/default-drive"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceDefaultDriveResponse], self.request('getWorkspaceDefaultDrive', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace_default_drive_raw(self, *, path: nt.WondersearchGetWorkspaceDefaultDriveRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/default-drive"""
        return cast(NativeResponse[RawResponse], self.request('getWorkspaceDefaultDriveRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace_operation(self, *, path: nt.WondersearchGetWorkspaceOperationPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceOperationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/operations/{operation_id}"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceOperationResponse], self.request('getWorkspaceOperation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace_overview(self, *, path: nt.WondersearchGetWorkspaceOverviewPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceOverviewResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/overview"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceOverviewResponse], self.request('getWorkspaceOverview', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace_raw(self, *, path: nt.WondersearchGetWorkspaceRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}"""
        return cast(NativeResponse[RawResponse], self.request('getWorkspaceRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_workspace_storage(self, *, path: nt.WondersearchGetWorkspaceStoragePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceStorageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/storage"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceStorageResponse], self.request('getWorkspaceStorage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_drive_documents(self, *, path: nt.WondersearchListDriveDocumentsPath, query: nt.WondersearchListDriveDocumentsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListDriveDocumentsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/documents"""
        return cast(NativeResponse[nt.WondersearchListDriveDocumentsResponse], self.request('listDriveDocuments', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_drive_folders(self, *, path: nt.WondersearchListDriveFoldersPath, query: nt.WondersearchListDriveFoldersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListDriveFoldersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/folders"""
        return cast(NativeResponse[nt.WondersearchListDriveFoldersResponse], self.request('listDriveFolders', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_organization_billing_invoices(self, *, path: nt.WondersearchListOrganizationBillingInvoicesPath, query: nt.WondersearchListOrganizationBillingInvoicesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationBillingInvoicesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/invoices"""
        return cast(NativeResponse[nt.WondersearchListOrganizationBillingInvoicesResponse], self.request('listOrganizationBillingInvoices', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_organization_invitations(self, *, path: nt.WondersearchListOrganizationInvitationsPath, query: nt.WondersearchListOrganizationInvitationsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationInvitationsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations"""
        return cast(NativeResponse[nt.WondersearchListOrganizationInvitationsResponse], self.request('listOrganizationInvitations', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_organization_members(self, *, path: nt.WondersearchListOrganizationMembersPath, query: nt.WondersearchListOrganizationMembersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationMembersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/members"""
        return cast(NativeResponse[nt.WondersearchListOrganizationMembersResponse], self.request('listOrganizationMembers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_organization_workspaces(self, *, path: nt.WondersearchListOrganizationWorkspacesPath, query: nt.WondersearchListOrganizationWorkspacesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationWorkspacesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/workspaces"""
        return cast(NativeResponse[nt.WondersearchListOrganizationWorkspacesResponse], self.request('listOrganizationWorkspaces', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_organizations(self, *, path: Mapping[str, Any] | None = None, query: nt.WondersearchListOrganizationsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations"""
        return cast(NativeResponse[nt.WondersearchListOrganizationsResponse], self.request('listOrganizations', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_workspace_api_keys(self, *, path: nt.WondersearchListWorkspaceApiKeysPath, query: nt.WondersearchListWorkspaceApiKeysQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceApiKeysResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/api-keys"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceApiKeysResponse], self.request('listWorkspaceApiKeys', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_workspace_drives(self, *, path: nt.WondersearchListWorkspaceDrivesPath, query: nt.WondersearchListWorkspaceDrivesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceDrivesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/drives"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceDrivesResponse], self.request('listWorkspaceDrives', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_workspace_inherited_members(self, *, path: nt.WondersearchListWorkspaceInheritedMembersPath, query: nt.WondersearchListWorkspaceInheritedMembersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceInheritedMembersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/inherited-members"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceInheritedMembersResponse], self.request('listWorkspaceInheritedMembers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def list_workspace_members(self, *, path: nt.WondersearchListWorkspaceMembersPath, query: nt.WondersearchListWorkspaceMembersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceMembersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceMembersResponse], self.request('listWorkspaceMembers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def preview_invitation(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.WondersearchPreviewInvitationBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchPreviewInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/invitations/preview"""
        return cast(NativeResponse[nt.WondersearchPreviewInvitationResponse], self.request('previewInvitation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def quote_workspace_storage(self, *, path: nt.WondersearchQuoteWorkspaceStoragePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchQuoteWorkspaceStorageBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchQuoteWorkspaceStorageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/storage/quote"""
        return cast(NativeResponse[nt.WondersearchQuoteWorkspaceStorageResponse], self.request('quoteWorkspaceStorage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def recover_import(self, *, path: nt.WondersearchRecoverImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchRecoverImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchRecoverImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/recover"""
        return cast(NativeResponse[nt.WondersearchRecoverImportResponse], self.request('recoverImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def replace_document(self, *, path: nt.WondersearchReplaceDocumentPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchReplaceDocumentBody, headers: nt.WondersearchReplaceDocumentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchReplaceDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}"""
        return cast(NativeResponse[nt.WondersearchReplaceDocumentResponse], self.request('replaceDocument', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def resend_organization_invitation(self, *, path: nt.WondersearchResendOrganizationInvitationPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchResendOrganizationInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchResendOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}/resend"""
        return cast(NativeResponse[nt.WondersearchResendOrganizationInvitationResponse], self.request('resendOrganizationInvitation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def resume_auto_topup(self, *, path: nt.WondersearchResumeAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchResumeAutoTopupBody, headers: nt.WondersearchResumeAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchResumeAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/resume"""
        return cast(NativeResponse[nt.WondersearchResumeAutoTopupResponse], self.request('resumeAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def retry_import_operation(self, *, path: nt.WondersearchRetryImportOperationPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchRetryImportOperationBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchRetryImportOperationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/operations/{operation_id}/retry"""
        return cast(NativeResponse[nt.WondersearchRetryImportOperationResponse], self.request('retryImportOperation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def seal_import(self, *, path: nt.WondersearchSealImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSealImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSealImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/seal"""
        return cast(NativeResponse[nt.WondersearchSealImportResponse], self.request('sealImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_drive(self, *, path: nt.WondersearchSearchDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSearchDriveBody, headers: nt.WondersearchSearchDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSearchDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/search"""
        return cast(NativeResponse[nt.WondersearchSearchDriveResponse], self.request('searchDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search_workspace(self, *, path: nt.WondersearchSearchWorkspacePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSearchWorkspaceBody, headers: nt.WondersearchSearchWorkspaceHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSearchWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/search"""
        return cast(NativeResponse[nt.WondersearchSearchWorkspaceResponse], self.request('searchWorkspace', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def set_billing_limits(self, *, path: nt.WondersearchSetBillingLimitsPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSetBillingLimitsBody, headers: nt.WondersearchSetBillingLimitsHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSetBillingLimitsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/limits"""
        return cast(NativeResponse[nt.WondersearchSetBillingLimitsResponse], self.request('setBillingLimits', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def set_default_drive(self, *, path: nt.WondersearchSetDefaultDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSetDefaultDriveBody, headers: nt.WondersearchSetDefaultDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSetDefaultDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/workspaces/{workspace_id}/default-drive"""
        return cast(NativeResponse[nt.WondersearchSetDefaultDriveResponse], self.request('setDefaultDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def set_workspace_storage(self, *, path: nt.WondersearchSetWorkspaceStoragePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSetWorkspaceStorageBody, headers: nt.WondersearchSetWorkspaceStorageHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSetWorkspaceStorageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/storage"""
        return cast(NativeResponse[nt.WondersearchSetWorkspaceStorageResponse], self.request('setWorkspaceStorage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_drive(self, *, path: nt.WondersearchUpdateDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateDriveBody, headers: nt.WondersearchUpdateDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateDriveResponse], self.request('updateDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_drive_folder(self, *, path: nt.WondersearchUpdateDriveFolderPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateDriveFolderBody, headers: nt.WondersearchUpdateDriveFolderHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateDriveFolderResponse], self.request('updateDriveFolder', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_organization(self, *, path: nt.WondersearchUpdateOrganizationPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateOrganizationBody, headers: nt.WondersearchUpdateOrganizationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateOrganizationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/organizations/{organization_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateOrganizationResponse], self.request('updateOrganization', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_organization_member(self, *, path: nt.WondersearchUpdateOrganizationMemberPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateOrganizationMemberBody, headers: nt.WondersearchUpdateOrganizationMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateOrganizationMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/organizations/{organization_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateOrganizationMemberResponse], self.request('updateOrganizationMember', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_workspace(self, *, path: nt.WondersearchUpdateWorkspacePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateWorkspaceBody, headers: nt.WondersearchUpdateWorkspaceHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/workspaces/{workspace_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateWorkspaceResponse], self.request('updateWorkspace', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def update_workspace_member(self, *, path: nt.WondersearchUpdateWorkspaceMemberPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateWorkspaceMemberBody, headers: nt.WondersearchUpdateWorkspaceMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateWorkspaceMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateWorkspaceMemberResponse], self.request('updateWorkspaceMember', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def upload_content(self, *, path: nt.WondersearchUploadContentPath, query: Mapping[str, Any] | None = None, raw_body: bytes, headers: nt.WondersearchUploadContentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUploadContentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}/content"""
        return cast(NativeResponse[nt.WondersearchUploadContentResponse], self.request('uploadContent', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncWondersearchClient(NativeClient):
    """wondersearch provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('wondersearch', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def accept_invitation(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.WondersearchAcceptInvitationBody, headers: nt.WondersearchAcceptInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchAcceptInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/invitations/accept"""
        return cast(NativeResponse[nt.WondersearchAcceptInvitationResponse], await self.request_async('acceptInvitation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def acknowledge_import_chunk(self, *, path: nt.WondersearchAcknowledgeImportChunkPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchAcknowledgeImportChunkBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchAcknowledgeImportChunkResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/chunks/{sequence}/acknowledge"""
        return cast(NativeResponse[nt.WondersearchAcknowledgeImportChunkResponse], await self.request_async('acknowledgeImportChunk', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def amount_auto_topup(self, *, path: nt.WondersearchAmountAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchAmountAutoTopupBody, headers: nt.WondersearchAmountAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchAmountAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/amount"""
        return cast(NativeResponse[nt.WondersearchAmountAutoTopupResponse], await self.request_async('amountAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def bootstrap_account(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: nt.WondersearchBootstrapAccountHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchBootstrapAccountResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/account/bootstrap"""
        return cast(NativeResponse[nt.WondersearchBootstrapAccountResponse], await self.request_async('bootstrapAccount', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def cancel_auto_topup(self, *, path: nt.WondersearchCancelAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCancelAutoTopupBody, headers: nt.WondersearchCancelAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCancelAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/cancel"""
        return cast(NativeResponse[nt.WondersearchCancelAutoTopupResponse], await self.request_async('cancelAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def checkout_auto_topup(self, *, path: nt.WondersearchCheckoutAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCheckoutAutoTopupBody, headers: nt.WondersearchCheckoutAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCheckoutAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/checkout"""
        return cast(NativeResponse[nt.WondersearchCheckoutAutoTopupResponse], await self.request_async('checkoutAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def close_import(self, *, path: nt.WondersearchCloseImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCloseImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCloseImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/close"""
        return cast(NativeResponse[nt.WondersearchCloseImportResponse], await self.request_async('closeImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def complete_upload(self, *, path: nt.WondersearchCompleteUploadPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCompleteUploadBody, headers: nt.WondersearchCompleteUploadHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCompleteUploadResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}/complete"""
        return cast(NativeResponse[nt.WondersearchCompleteUploadResponse], await self.request_async('completeUpload', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def complete_upload_batch(self, *, path: nt.WondersearchCompleteUploadBatchPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCompleteUploadBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCompleteUploadBatchResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/batch/complete"""
        return cast(NativeResponse[nt.WondersearchCompleteUploadBatchResponse], await self.request_async('completeUploadBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_billing_portal(self, *, path: nt.WondersearchCreateBillingPortalPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchCreateBillingPortalHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateBillingPortalResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/portal"""
        return cast(NativeResponse[nt.WondersearchCreateBillingPortalResponse], await self.request_async('createBillingPortal', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_drive_document(self, *, path: nt.WondersearchCreateDriveDocumentPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateDriveDocumentBody, headers: nt.WondersearchCreateDriveDocumentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateDriveDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/documents"""
        return cast(NativeResponse[nt.WondersearchCreateDriveDocumentResponse], await self.request_async('createDriveDocument', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_drive_folder(self, *, path: nt.WondersearchCreateDriveFolderPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateDriveFolderBody, headers: nt.WondersearchCreateDriveFolderHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/folders"""
        return cast(NativeResponse[nt.WondersearchCreateDriveFolderResponse], await self.request_async('createDriveFolder', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_drive_upload(self, *, path: nt.WondersearchCreateDriveUploadPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateDriveUploadBody, headers: nt.WondersearchCreateDriveUploadHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateDriveUploadResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads"""
        return cast(NativeResponse[nt.WondersearchCreateDriveUploadResponse], await self.request_async('createDriveUpload', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_import(self, *, path: nt.WondersearchCreateImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}"""
        return cast(NativeResponse[nt.WondersearchCreateImportResponse], await self.request_async('createImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_organization_billing_purchase(self, *, path: nt.WondersearchCreateOrganizationBillingPurchasePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateOrganizationBillingPurchaseBody, headers: nt.WondersearchCreateOrganizationBillingPurchaseHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateOrganizationBillingPurchaseResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/purchases"""
        return cast(NativeResponse[nt.WondersearchCreateOrganizationBillingPurchaseResponse], await self.request_async('createOrganizationBillingPurchase', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_organization_invitation(self, *, path: nt.WondersearchCreateOrganizationInvitationPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateOrganizationInvitationBody, headers: nt.WondersearchCreateOrganizationInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations"""
        return cast(NativeResponse[nt.WondersearchCreateOrganizationInvitationResponse], await self.request_async('createOrganizationInvitation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_organization_workspace(self, *, path: nt.WondersearchCreateOrganizationWorkspacePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateOrganizationWorkspaceBody, headers: nt.WondersearchCreateOrganizationWorkspaceHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateOrganizationWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/workspaces"""
        return cast(NativeResponse[nt.WondersearchCreateOrganizationWorkspaceResponse], await self.request_async('createOrganizationWorkspace', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_upload_batch(self, *, path: nt.WondersearchCreateUploadBatchPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateUploadBatchBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateUploadBatchResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/batch"""
        return cast(NativeResponse[nt.WondersearchCreateUploadBatchResponse], await self.request_async('createUploadBatch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_upload_transfer(self, *, path: nt.WondersearchCreateUploadTransferPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateUploadTransferBody, headers: nt.WondersearchCreateUploadTransferHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateUploadTransferResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}/transfer"""
        return cast(NativeResponse[nt.WondersearchCreateUploadTransferResponse], await self.request_async('createUploadTransfer', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_workspace_api_key(self, *, path: nt.WondersearchCreateWorkspaceApiKeyPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateWorkspaceApiKeyBody, headers: nt.WondersearchCreateWorkspaceApiKeyHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateWorkspaceApiKeyResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/api-keys"""
        return cast(NativeResponse[nt.WondersearchCreateWorkspaceApiKeyResponse], await self.request_async('createWorkspaceApiKey', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_workspace_drive(self, *, path: nt.WondersearchCreateWorkspaceDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateWorkspaceDriveBody, headers: nt.WondersearchCreateWorkspaceDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateWorkspaceDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/drives"""
        return cast(NativeResponse[nt.WondersearchCreateWorkspaceDriveResponse], await self.request_async('createWorkspaceDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def create_workspace_member(self, *, path: nt.WondersearchCreateWorkspaceMemberPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchCreateWorkspaceMemberBody, headers: nt.WondersearchCreateWorkspaceMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchCreateWorkspaceMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members"""
        return cast(NativeResponse[nt.WondersearchCreateWorkspaceMemberResponse], await self.request_async('createWorkspaceMember', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def declare_import_chunks(self, *, path: nt.WondersearchDeclareImportChunksPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchDeclareImportChunksBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeclareImportChunksResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/chunks"""
        return cast(NativeResponse[nt.WondersearchDeclareImportChunksResponse], await self.request_async('declareImportChunks', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_drive(self, *, path: nt.WondersearchDeleteDrivePath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteDriveResponse], await self.request_async('deleteDrive', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_drive_document(self, *, path: nt.WondersearchDeleteDriveDocumentPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteDriveDocumentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteDriveDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteDriveDocumentResponse], await self.request_async('deleteDriveDocument', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_drive_folder(self, *, path: nt.WondersearchDeleteDriveFolderPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteDriveFolderHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteDriveFolderResponse], await self.request_async('deleteDriveFolder', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_organization_invitation(self, *, path: nt.WondersearchDeleteOrganizationInvitationPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteOrganizationInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteOrganizationInvitationResponse], await self.request_async('deleteOrganizationInvitation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_organization_member(self, *, path: nt.WondersearchDeleteOrganizationMemberPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteOrganizationMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteOrganizationMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/organizations/{organization_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteOrganizationMemberResponse], await self.request_async('deleteOrganizationMember', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_workspace_api_key(self, *, path: nt.WondersearchDeleteWorkspaceApiKeyPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteWorkspaceApiKeyResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/workspaces/{workspace_id}/api-keys/{key_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteWorkspaceApiKeyResponse], await self.request_async('deleteWorkspaceApiKey', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def delete_workspace_member(self, *, path: nt.WondersearchDeleteWorkspaceMemberPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchDeleteWorkspaceMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchDeleteWorkspaceMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — DELETE https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchDeleteWorkspaceMemberResponse], await self.request_async('deleteWorkspaceMember', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_auto_topup(self, *, path: nt.WondersearchGetAutoTopupPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup"""
        return cast(NativeResponse[nt.WondersearchGetAutoTopupResponse], await self.request_async('getAutoTopup', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_capabilities(self, *, path: nt.WondersearchGetCapabilitiesPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetCapabilitiesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/capabilities"""
        return cast(NativeResponse[nt.WondersearchGetCapabilitiesResponse], await self.request_async('getCapabilities', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive(self, *, path: nt.WondersearchGetDrivePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveResponse], await self.request_async('getDrive', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_document(self, *, path: nt.WondersearchGetDriveDocumentPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveDocumentResponse], await self.request_async('getDriveDocument', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_document_source(self, *, path: nt.WondersearchGetDriveDocumentSourcePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[bytes]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}/source"""
        return cast(NativeResponse[bytes], await self.request_async('getDriveDocumentSource', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_folder(self, *, path: nt.WondersearchGetDriveFolderPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveFolderResponse], await self.request_async('getDriveFolder', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_folder_raw(self, *, path: nt.WondersearchGetDriveFolderRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[RawResponse], await self.request_async('getDriveFolderRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_raw(self, *, path: nt.WondersearchGetDriveRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[RawResponse], await self.request_async('getDriveRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_upload(self, *, path: nt.WondersearchGetDriveUploadPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveUploadResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}"""
        return cast(NativeResponse[nt.WondersearchGetDriveUploadResponse], await self.request_async('getDriveUpload', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_drive_upload_capabilities(self, *, path: nt.WondersearchGetDriveUploadCapabilitiesPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetDriveUploadCapabilitiesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/capabilities"""
        return cast(NativeResponse[nt.WondersearchGetDriveUploadCapabilitiesResponse], await self.request_async('getDriveUploadCapabilities', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_import(self, *, path: nt.WondersearchGetImportPath, query: nt.WondersearchGetImportQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}"""
        return cast(NativeResponse[nt.WondersearchGetImportResponse], await self.request_async('getImport', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_ingestion_metrics(self, *, path: nt.WondersearchGetIngestionMetricsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetIngestionMetricsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/ingestion-metrics"""
        return cast(NativeResponse[nt.WondersearchGetIngestionMetricsResponse], await self.request_async('getIngestionMetrics', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_me(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetMeResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/me"""
        return cast(NativeResponse[nt.WondersearchGetMeResponse], await self.request_async('getMe', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization(self, *, path: nt.WondersearchGetOrganizationPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationResponse], await self.request_async('getOrganization', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_billing(self, *, path: nt.WondersearchGetOrganizationBillingPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingResponse], await self.request_async('getOrganizationBilling', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_billing_activity(self, *, path: nt.WondersearchGetOrganizationBillingActivityPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingActivityResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/activity"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingActivityResponse], await self.request_async('getOrganizationBillingActivity', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_billing_limits(self, *, path: nt.WondersearchGetOrganizationBillingLimitsPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingLimitsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/limits"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingLimitsResponse], await self.request_async('getOrganizationBillingLimits', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_billing_purchase(self, *, path: nt.WondersearchGetOrganizationBillingPurchasePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingPurchaseResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/purchases/{purchase_id}"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingPurchaseResponse], await self.request_async('getOrganizationBillingPurchase', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_billing_usage(self, *, path: nt.WondersearchGetOrganizationBillingUsagePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingUsageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/usage"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingUsageResponse], await self.request_async('getOrganizationBillingUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_billing_wallet(self, *, path: nt.WondersearchGetOrganizationBillingWalletPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationBillingWalletResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/wallet"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationBillingWalletResponse], await self.request_async('getOrganizationBillingWallet', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_invitation(self, *, path: nt.WondersearchGetOrganizationInvitationPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationInvitationResponse], await self.request_async('getOrganizationInvitation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_invitation_raw(self, *, path: nt.WondersearchGetOrganizationInvitationRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}"""
        return cast(NativeResponse[RawResponse], await self.request_async('getOrganizationInvitationRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_raw(self, *, path: nt.WondersearchGetOrganizationRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}"""
        return cast(NativeResponse[RawResponse], await self.request_async('getOrganizationRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_organization_usage(self, *, path: nt.WondersearchGetOrganizationUsagePath, query: nt.WondersearchGetOrganizationUsageQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetOrganizationUsageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/usage"""
        return cast(NativeResponse[nt.WondersearchGetOrganizationUsageResponse], await self.request_async('getOrganizationUsage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_passage(self, *, path: nt.WondersearchGetPassagePath, query: nt.WondersearchGetPassageQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetPassageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/passages/{passage_id}"""
        return cast(NativeResponse[nt.WondersearchGetPassageResponse], await self.request_async('getPassage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_sdk_context(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetSdkContextResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/sdk/context"""
        return cast(NativeResponse[nt.WondersearchGetSdkContextResponse], await self.request_async('getSdkContext', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_upload_batch_status(self, *, path: nt.WondersearchGetUploadBatchStatusPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchGetUploadBatchStatusBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetUploadBatchStatusResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/batch/status"""
        return cast(NativeResponse[nt.WondersearchGetUploadBatchStatusResponse], await self.request_async('getUploadBatchStatus', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace(self, *, path: nt.WondersearchGetWorkspacePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceResponse], await self.request_async('getWorkspace', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace_default_drive(self, *, path: nt.WondersearchGetWorkspaceDefaultDrivePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceDefaultDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/default-drive"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceDefaultDriveResponse], await self.request_async('getWorkspaceDefaultDrive', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace_default_drive_raw(self, *, path: nt.WondersearchGetWorkspaceDefaultDriveRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/default-drive"""
        return cast(NativeResponse[RawResponse], await self.request_async('getWorkspaceDefaultDriveRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace_operation(self, *, path: nt.WondersearchGetWorkspaceOperationPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceOperationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/operations/{operation_id}"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceOperationResponse], await self.request_async('getWorkspaceOperation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace_overview(self, *, path: nt.WondersearchGetWorkspaceOverviewPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceOverviewResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/overview"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceOverviewResponse], await self.request_async('getWorkspaceOverview', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace_raw(self, *, path: nt.WondersearchGetWorkspaceRawPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[RawResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}"""
        return cast(NativeResponse[RawResponse], await self.request_async('getWorkspaceRaw', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_workspace_storage(self, *, path: nt.WondersearchGetWorkspaceStoragePath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchGetWorkspaceStorageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/storage"""
        return cast(NativeResponse[nt.WondersearchGetWorkspaceStorageResponse], await self.request_async('getWorkspaceStorage', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_drive_documents(self, *, path: nt.WondersearchListDriveDocumentsPath, query: nt.WondersearchListDriveDocumentsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListDriveDocumentsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/documents"""
        return cast(NativeResponse[nt.WondersearchListDriveDocumentsResponse], await self.request_async('listDriveDocuments', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_drive_folders(self, *, path: nt.WondersearchListDriveFoldersPath, query: nt.WondersearchListDriveFoldersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListDriveFoldersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/drives/{drive_id}/folders"""
        return cast(NativeResponse[nt.WondersearchListDriveFoldersResponse], await self.request_async('listDriveFolders', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_organization_billing_invoices(self, *, path: nt.WondersearchListOrganizationBillingInvoicesPath, query: nt.WondersearchListOrganizationBillingInvoicesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationBillingInvoicesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/invoices"""
        return cast(NativeResponse[nt.WondersearchListOrganizationBillingInvoicesResponse], await self.request_async('listOrganizationBillingInvoices', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_organization_invitations(self, *, path: nt.WondersearchListOrganizationInvitationsPath, query: nt.WondersearchListOrganizationInvitationsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationInvitationsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations"""
        return cast(NativeResponse[nt.WondersearchListOrganizationInvitationsResponse], await self.request_async('listOrganizationInvitations', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_organization_members(self, *, path: nt.WondersearchListOrganizationMembersPath, query: nt.WondersearchListOrganizationMembersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationMembersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/members"""
        return cast(NativeResponse[nt.WondersearchListOrganizationMembersResponse], await self.request_async('listOrganizationMembers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_organization_workspaces(self, *, path: nt.WondersearchListOrganizationWorkspacesPath, query: nt.WondersearchListOrganizationWorkspacesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationWorkspacesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations/{organization_id}/workspaces"""
        return cast(NativeResponse[nt.WondersearchListOrganizationWorkspacesResponse], await self.request_async('listOrganizationWorkspaces', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_organizations(self, *, path: Mapping[str, Any] | None = None, query: nt.WondersearchListOrganizationsQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListOrganizationsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/organizations"""
        return cast(NativeResponse[nt.WondersearchListOrganizationsResponse], await self.request_async('listOrganizations', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_workspace_api_keys(self, *, path: nt.WondersearchListWorkspaceApiKeysPath, query: nt.WondersearchListWorkspaceApiKeysQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceApiKeysResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/api-keys"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceApiKeysResponse], await self.request_async('listWorkspaceApiKeys', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_workspace_drives(self, *, path: nt.WondersearchListWorkspaceDrivesPath, query: nt.WondersearchListWorkspaceDrivesQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceDrivesResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/drives"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceDrivesResponse], await self.request_async('listWorkspaceDrives', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_workspace_inherited_members(self, *, path: nt.WondersearchListWorkspaceInheritedMembersPath, query: nt.WondersearchListWorkspaceInheritedMembersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceInheritedMembersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/inherited-members"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceInheritedMembersResponse], await self.request_async('listWorkspaceInheritedMembers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def list_workspace_members(self, *, path: nt.WondersearchListWorkspaceMembersPath, query: nt.WondersearchListWorkspaceMembersQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchListWorkspaceMembersResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — GET https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members"""
        return cast(NativeResponse[nt.WondersearchListWorkspaceMembersResponse], await self.request_async('listWorkspaceMembers', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def preview_invitation(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.WondersearchPreviewInvitationBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchPreviewInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/invitations/preview"""
        return cast(NativeResponse[nt.WondersearchPreviewInvitationResponse], await self.request_async('previewInvitation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def quote_workspace_storage(self, *, path: nt.WondersearchQuoteWorkspaceStoragePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchQuoteWorkspaceStorageBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchQuoteWorkspaceStorageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/storage/quote"""
        return cast(NativeResponse[nt.WondersearchQuoteWorkspaceStorageResponse], await self.request_async('quoteWorkspaceStorage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def recover_import(self, *, path: nt.WondersearchRecoverImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchRecoverImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchRecoverImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/recover"""
        return cast(NativeResponse[nt.WondersearchRecoverImportResponse], await self.request_async('recoverImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def replace_document(self, *, path: nt.WondersearchReplaceDocumentPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchReplaceDocumentBody, headers: nt.WondersearchReplaceDocumentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchReplaceDocumentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/drives/{drive_id}/documents/{document_id}"""
        return cast(NativeResponse[nt.WondersearchReplaceDocumentResponse], await self.request_async('replaceDocument', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def resend_organization_invitation(self, *, path: nt.WondersearchResendOrganizationInvitationPath, query: Mapping[str, Any] | None = None, headers: nt.WondersearchResendOrganizationInvitationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchResendOrganizationInvitationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/invitations/{invitation_id}/resend"""
        return cast(NativeResponse[nt.WondersearchResendOrganizationInvitationResponse], await self.request_async('resendOrganizationInvitation', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def resume_auto_topup(self, *, path: nt.WondersearchResumeAutoTopupPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchResumeAutoTopupBody, headers: nt.WondersearchResumeAutoTopupHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchResumeAutoTopupResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/auto-topup/resume"""
        return cast(NativeResponse[nt.WondersearchResumeAutoTopupResponse], await self.request_async('resumeAutoTopup', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def retry_import_operation(self, *, path: nt.WondersearchRetryImportOperationPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchRetryImportOperationBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchRetryImportOperationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/operations/{operation_id}/retry"""
        return cast(NativeResponse[nt.WondersearchRetryImportOperationResponse], await self.request_async('retryImportOperation', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def seal_import(self, *, path: nt.WondersearchSealImportPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSealImportBody, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSealImportResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/imports/{import_id}/seal"""
        return cast(NativeResponse[nt.WondersearchSealImportResponse], await self.request_async('sealImport', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_drive(self, *, path: nt.WondersearchSearchDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSearchDriveBody, headers: nt.WondersearchSearchDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSearchDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/drives/{drive_id}/search"""
        return cast(NativeResponse[nt.WondersearchSearchDriveResponse], await self.request_async('searchDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search_workspace(self, *, path: nt.WondersearchSearchWorkspacePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSearchWorkspaceBody, headers: nt.WondersearchSearchWorkspaceHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSearchWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/search"""
        return cast(NativeResponse[nt.WondersearchSearchWorkspaceResponse], await self.request_async('searchWorkspace', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def set_billing_limits(self, *, path: nt.WondersearchSetBillingLimitsPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSetBillingLimitsBody, headers: nt.WondersearchSetBillingLimitsHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSetBillingLimitsResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/organizations/{organization_id}/billing/limits"""
        return cast(NativeResponse[nt.WondersearchSetBillingLimitsResponse], await self.request_async('setBillingLimits', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def set_default_drive(self, *, path: nt.WondersearchSetDefaultDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSetDefaultDriveBody, headers: nt.WondersearchSetDefaultDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSetDefaultDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/workspaces/{workspace_id}/default-drive"""
        return cast(NativeResponse[nt.WondersearchSetDefaultDriveResponse], await self.request_async('setDefaultDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def set_workspace_storage(self, *, path: nt.WondersearchSetWorkspaceStoragePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchSetWorkspaceStorageBody, headers: nt.WondersearchSetWorkspaceStorageHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchSetWorkspaceStorageResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — POST https://api.wondersearch.ai/v1/workspaces/{workspace_id}/storage"""
        return cast(NativeResponse[nt.WondersearchSetWorkspaceStorageResponse], await self.request_async('setWorkspaceStorage', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_drive(self, *, path: nt.WondersearchUpdateDrivePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateDriveBody, headers: nt.WondersearchUpdateDriveHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateDriveResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/drives/{drive_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateDriveResponse], await self.request_async('updateDrive', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_drive_folder(self, *, path: nt.WondersearchUpdateDriveFolderPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateDriveFolderBody, headers: nt.WondersearchUpdateDriveFolderHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateDriveFolderResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/drives/{drive_id}/folders/{folder_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateDriveFolderResponse], await self.request_async('updateDriveFolder', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_organization(self, *, path: nt.WondersearchUpdateOrganizationPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateOrganizationBody, headers: nt.WondersearchUpdateOrganizationHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateOrganizationResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/organizations/{organization_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateOrganizationResponse], await self.request_async('updateOrganization', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_organization_member(self, *, path: nt.WondersearchUpdateOrganizationMemberPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateOrganizationMemberBody, headers: nt.WondersearchUpdateOrganizationMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateOrganizationMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/organizations/{organization_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateOrganizationMemberResponse], await self.request_async('updateOrganizationMember', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_workspace(self, *, path: nt.WondersearchUpdateWorkspacePath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateWorkspaceBody, headers: nt.WondersearchUpdateWorkspaceHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateWorkspaceResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/workspaces/{workspace_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateWorkspaceResponse], await self.request_async('updateWorkspace', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def update_workspace_member(self, *, path: nt.WondersearchUpdateWorkspaceMemberPath, query: Mapping[str, Any] | None = None, body: nt.WondersearchUpdateWorkspaceMemberBody, headers: nt.WondersearchUpdateWorkspaceMemberHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUpdateWorkspaceMemberResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PATCH https://api.wondersearch.ai/v1/workspaces/{workspace_id}/members/{user_id}"""
        return cast(NativeResponse[nt.WondersearchUpdateWorkspaceMemberResponse], await self.request_async('updateWorkspaceMember', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def upload_content(self, *, path: nt.WondersearchUploadContentPath, query: Mapping[str, Any] | None = None, raw_body: bytes, headers: nt.WondersearchUploadContentHeaders, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.WondersearchUploadContentResponse]:
        """https://docs.evokoa.com/wondersearch/reference/ — PUT https://api.wondersearch.ai/v1/drives/{drive_id}/uploads/{upload_id}/content"""
        return cast(NativeResponse[nt.WondersearchUploadContentResponse], await self.request_async('uploadContent', path=path, query=query, raw_body=raw_body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class YouClient(NativeClient):
    """you provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('you', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    def answer(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouAnswerBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouAnswerResponse]:
        """https://you.com/docs/openapi/answer.json — POST https://api.you.com/v1/answer"""
        return cast(NativeResponse[nt.YouAnswerResponse], self.request('answer', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def contents(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouContentsBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouContentsResponse]:
        """https://you.com/docs/openapi/contents.json — POST https://ydc-index.io/v1/contents"""
        return cast(NativeResponse[nt.YouContentsResponse], self.request('contents', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def finance_research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouFinanceResearchBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouFinanceResearchResponse]:
        """https://you.com/docs/openapi/finance-research.json — POST https://api.you.com/v1/finance_research"""
        return cast(NativeResponse[nt.YouFinanceResearchResponse], self.request('financeResearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_account_balance(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouGetAccountBalanceResponse]:
        """https://you.com/docs/openapi/billing.json — GET https://api.you.com/v1/billing/account_balance"""
        return cast(NativeResponse[nt.YouGetAccountBalanceResponse], self.request('getAccountBalance', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def get_research_task(self, *, path: nt.YouGetResearchTaskPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouGetResearchTaskResponse]:
        """https://you.com/docs/openapi/research.json — GET https://api.you.com/v1/research/{task_id}"""
        return cast(NativeResponse[nt.YouGetResearchTaskResponse], self.request('getResearchTask', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def images(self, *, path: Mapping[str, Any] | None = None, query: nt.YouImagesQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouImagesResponse]:
        """https://you.com/docs/openapi/images.json — GET https://api.you.com/v1/images"""
        return cast(NativeResponse[nt.YouImagesResponse], self.request('images', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouResearchBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouResearchResponse]:
        """https://you.com/docs/openapi/research.json — POST https://api.you.com/v1/research"""
        return cast(NativeResponse[nt.YouResearchResponse], self.request('research', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouSearchBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouSearchResponse]:
        """https://you.com/docs/openapi/web-search.json — POST https://ydc-index.io/v1/search"""
        return cast(NativeResponse[nt.YouSearchResponse], self.request('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    def stream_research_task(self, *, path: nt.YouStreamResearchTaskPath, query: nt.YouStreamResearchTaskQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://you.com/docs/openapi/research.json — GET https://api.you.com/v1/research/{task_id}/stream"""
        return cast(NativeResponse[SSEStream], self.request('streamResearchTask', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


class AsyncYouClient(NativeClient):
    """you provider-native operations; no automatic polling or pagination."""
    def __init__(self, api_key: str, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None) -> None:
        super().__init__('you', api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry)

    async def answer(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouAnswerBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouAnswerResponse]:
        """https://you.com/docs/openapi/answer.json — POST https://api.you.com/v1/answer"""
        return cast(NativeResponse[nt.YouAnswerResponse], await self.request_async('answer', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def contents(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouContentsBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouContentsResponse]:
        """https://you.com/docs/openapi/contents.json — POST https://ydc-index.io/v1/contents"""
        return cast(NativeResponse[nt.YouContentsResponse], await self.request_async('contents', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def finance_research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouFinanceResearchBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouFinanceResearchResponse]:
        """https://you.com/docs/openapi/finance-research.json — POST https://api.you.com/v1/finance_research"""
        return cast(NativeResponse[nt.YouFinanceResearchResponse], await self.request_async('financeResearch', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_account_balance(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouGetAccountBalanceResponse]:
        """https://you.com/docs/openapi/billing.json — GET https://api.you.com/v1/billing/account_balance"""
        return cast(NativeResponse[nt.YouGetAccountBalanceResponse], await self.request_async('getAccountBalance', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def get_research_task(self, *, path: nt.YouGetResearchTaskPath, query: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouGetResearchTaskResponse]:
        """https://you.com/docs/openapi/research.json — GET https://api.you.com/v1/research/{task_id}"""
        return cast(NativeResponse[nt.YouGetResearchTaskResponse], await self.request_async('getResearchTask', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def images(self, *, path: Mapping[str, Any] | None = None, query: nt.YouImagesQuery, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouImagesResponse]:
        """https://you.com/docs/openapi/images.json — GET https://api.you.com/v1/images"""
        return cast(NativeResponse[nt.YouImagesResponse], await self.request_async('images', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def research(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouResearchBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouResearchResponse]:
        """https://you.com/docs/openapi/research.json — POST https://api.you.com/v1/research"""
        return cast(NativeResponse[nt.YouResearchResponse], await self.request_async('research', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def search(self, *, path: Mapping[str, Any] | None = None, query: Mapping[str, Any] | None = None, body: nt.YouSearchBody | UnsetType = UNSET, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[nt.YouSearchResponse]:
        """https://you.com/docs/openapi/web-search.json — POST https://ydc-index.io/v1/search"""
        return cast(NativeResponse[nt.YouSearchResponse], await self.request_async('search', path=path, query=query, body=body, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))

    async def stream_research_task(self, *, path: nt.YouStreamResearchTaskPath, query: nt.YouStreamResearchTaskQuery | None = None, headers: Mapping[str, str] | None = None, timeout_ms: int | None = None, cancellation: CancellationToken | None = None) -> NativeResponse[SSEStream]:
        """https://you.com/docs/openapi/research.json — GET https://api.you.com/v1/research/{task_id}/stream"""
        return cast(NativeResponse[SSEStream], await self.request_async('streamResearchTask', path=path, query=query, headers=cast(Mapping[str, str] | None, headers), timeout_ms=timeout_ms, cancellation=cancellation))


__all__ = ['BraveClient', 'AsyncBraveClient', 'ContextClient', 'AsyncContextClient', 'ExaClient', 'AsyncExaClient', 'FirecrawlClient', 'AsyncFirecrawlClient', 'LinkupClient', 'AsyncLinkupClient', 'ParallelClient', 'AsyncParallelClient', 'PerplexityClient', 'AsyncPerplexityClient', 'SerpapiClient', 'AsyncSerpapiClient', 'SerperClient', 'AsyncSerperClient', 'TavilyClient', 'AsyncTavilyClient', 'TinyfishClient', 'AsyncTinyfishClient', 'WondersearchClient', 'AsyncWondersearchClient', 'YouClient', 'AsyncYouClient']
