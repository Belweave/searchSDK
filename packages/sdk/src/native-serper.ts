/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type SerperClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace SerperSchemas {
  export type SearchResult = {
    "title"?: string;
    "link"?: string;
    "snippet"?: string;
    "position"?: number;
    "date"?: string;
    "imageUrl"?: string;
    "thumbnailUrl"?: string;
    "source"?: string;
    "rating"?: number;
    "ratingCount"?: number;
    "price"?: string;
    "cid"?: string;
    "placeId"?: string;
    "address"?: string;
    "phoneNumber"?: string;
    "latitude"?: number;
    "longitude"?: number;
    "sitelinks"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type SearchResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "organic"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "knowledgeGraph"?: {
      "title"?: string;
      "type"?: string;
      "website"?: string;
      "description"?: string;
      "attributes"?: Record<string, unknown>;
      [key: string]: unknown;
    };
    "answerBox"?: {
      "title"?: string;
      "url"?: string;
      "answer"?: string;
      "snippet"?: string;
      [key: string]: unknown;
    };
    "peopleAlsoAsk"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "relatedSearches"?: ReadonlyArray<{
      "query"?: string;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type SearchRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type ImagesRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type ImagesResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "images"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type VideosRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type VideosResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "videos"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type PlacesRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type PlacesResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "places"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type MapsRequest = {
    "q"?: string;
    "hl"?: string;
    "page"?: number;
    "ll"?: string;
    "placeId"?: string;
    "cid"?: string;
    [key: string]: unknown;
  };
  export type MapsResponse = {
    "searchParameters"?: {
      "q"?: string;
      "hl"?: string;
      "page"?: number;
      "ll"?: string;
      "placeId"?: string;
      "cid"?: string;
      [key: string]: unknown;
    };
    "places"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type ReviewsRequest = {
    "cid"?: string;
    "fid"?: string;
    "placeId"?: string;
    "gl"?: string;
    "hl"?: string;
    "sortBy"?: string;
    "topicId"?: string;
    "nextPageToken"?: string;
    [key: string]: unknown;
  };
  export type ReviewsResponse = {
    "searchParameters"?: {
      "cid"?: string;
      "fid"?: string;
      "placeId"?: string;
      "gl"?: string;
      "hl"?: string;
      "sortBy"?: string;
      "topicId"?: string;
      "nextPageToken"?: string;
      [key: string]: unknown;
    };
    "reviews"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type NewsRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type NewsResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "news"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type ShoppingRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type ShoppingResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "shopping"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type ScholarRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type ScholarResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "organic"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type PatentsRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "num"?: number;
    "autocorrect"?: boolean;
    "tbs"?: string;
    "page"?: number;
    [key: string]: unknown;
  };
  export type PatentsResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "num"?: number;
      "autocorrect"?: boolean;
      "tbs"?: string;
      "page"?: number;
      [key: string]: unknown;
    };
    "organic"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type AutocompleteRequest = {
    "q": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    [key: string]: unknown;
  };
  export type AutocompleteResponse = {
    "searchParameters"?: {
      "q"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      [key: string]: unknown;
    };
    "suggestions"?: ReadonlyArray<{
      "value"?: string;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
  export type LensRequest = {
    "url": string;
    "location"?: string;
    "gl"?: string;
    "hl"?: string;
    "tbs"?: string;
    [key: string]: unknown;
  };
  export type LensResponse = {
    "searchParameters"?: {
      "url"?: string;
      "location"?: string;
      "gl"?: string;
      "hl"?: string;
      "tbs"?: string;
      [key: string]: unknown;
    };
    "organic"?: ReadonlyArray<{
      "title"?: string;
      "link"?: string;
      "snippet"?: string;
      "position"?: number;
      "date"?: string;
      "imageUrl"?: string;
      "thumbnailUrl"?: string;
      "source"?: string;
      "rating"?: number;
      "ratingCount"?: number;
      "price"?: string;
      "cid"?: string;
      "placeId"?: string;
      "address"?: string;
      "phoneNumber"?: string;
      "latitude"?: number;
      "longitude"?: number;
      "sitelinks"?: ReadonlyArray<{
        "title"?: string;
        "link"?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    "credits"?: number;
    [key: string]: unknown;
  };
}

export type SerperSearchBody = (SerperSchemas.SearchRequest | ReadonlyArray<SerperSchemas.SearchRequest>);
export type SerperSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperSearchBody; };
export type SerperSearchResponse = (SerperSchemas.SearchResponse | ReadonlyArray<SerperSchemas.SearchResponse>);
export type SerperSearchGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperSearchGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperSearchGetQuery; };
export type SerperSearchGetResponse = SerperSchemas.SearchResponse;
export type SerperImagesBody = (SerperSchemas.ImagesRequest | ReadonlyArray<SerperSchemas.ImagesRequest>);
export type SerperImagesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperImagesBody; };
export type SerperImagesResponse = (SerperSchemas.ImagesResponse | ReadonlyArray<SerperSchemas.ImagesResponse>);
export type SerperImagesGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperImagesGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperImagesGetQuery; };
export type SerperImagesGetResponse = SerperSchemas.ImagesResponse;
export type SerperVideosBody = (SerperSchemas.VideosRequest | ReadonlyArray<SerperSchemas.VideosRequest>);
export type SerperVideosInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperVideosBody; };
export type SerperVideosResponse = (SerperSchemas.VideosResponse | ReadonlyArray<SerperSchemas.VideosResponse>);
export type SerperVideosGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperVideosGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperVideosGetQuery; };
export type SerperVideosGetResponse = SerperSchemas.VideosResponse;
export type SerperPlacesBody = (SerperSchemas.PlacesRequest | ReadonlyArray<SerperSchemas.PlacesRequest>);
export type SerperPlacesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperPlacesBody; };
export type SerperPlacesResponse = (SerperSchemas.PlacesResponse | ReadonlyArray<SerperSchemas.PlacesResponse>);
export type SerperPlacesGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperPlacesGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperPlacesGetQuery; };
export type SerperPlacesGetResponse = SerperSchemas.PlacesResponse;
export type SerperMapsBody = (SerperSchemas.MapsRequest | ReadonlyArray<SerperSchemas.MapsRequest>);
export type SerperMapsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperMapsBody; };
export type SerperMapsResponse = (SerperSchemas.MapsResponse | ReadonlyArray<SerperSchemas.MapsResponse>);
export type SerperMapsGetQuery = { "q"?: string; "hl"?: string; "page"?: number; "ll"?: string; "placeId"?: string; "cid"?: string; };
export type SerperMapsGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: SerperMapsGetQuery; };
export type SerperMapsGetResponse = SerperSchemas.MapsResponse;
export type SerperReviewsBody = (SerperSchemas.ReviewsRequest | ReadonlyArray<SerperSchemas.ReviewsRequest>);
export type SerperReviewsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperReviewsBody; };
export type SerperReviewsResponse = (SerperSchemas.ReviewsResponse | ReadonlyArray<SerperSchemas.ReviewsResponse>);
export type SerperReviewsGetQuery = { "cid"?: string; "fid"?: string; "placeId"?: string; "gl"?: string; "hl"?: string; "sortBy"?: string; "topicId"?: string; "nextPageToken"?: string; };
export type SerperReviewsGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: SerperReviewsGetQuery; };
export type SerperReviewsGetResponse = SerperSchemas.ReviewsResponse;
export type SerperNewsBody = (SerperSchemas.NewsRequest | ReadonlyArray<SerperSchemas.NewsRequest>);
export type SerperNewsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperNewsBody; };
export type SerperNewsResponse = (SerperSchemas.NewsResponse | ReadonlyArray<SerperSchemas.NewsResponse>);
export type SerperNewsGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperNewsGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperNewsGetQuery; };
export type SerperNewsGetResponse = SerperSchemas.NewsResponse;
export type SerperShoppingBody = (SerperSchemas.ShoppingRequest | ReadonlyArray<SerperSchemas.ShoppingRequest>);
export type SerperShoppingInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperShoppingBody; };
export type SerperShoppingResponse = (SerperSchemas.ShoppingResponse | ReadonlyArray<SerperSchemas.ShoppingResponse>);
export type SerperShoppingGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperShoppingGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperShoppingGetQuery; };
export type SerperShoppingGetResponse = SerperSchemas.ShoppingResponse;
export type SerperScholarBody = (SerperSchemas.ScholarRequest | ReadonlyArray<SerperSchemas.ScholarRequest>);
export type SerperScholarInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperScholarBody; };
export type SerperScholarResponse = (SerperSchemas.ScholarResponse | ReadonlyArray<SerperSchemas.ScholarResponse>);
export type SerperScholarGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperScholarGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperScholarGetQuery; };
export type SerperScholarGetResponse = SerperSchemas.ScholarResponse;
export type SerperPatentsBody = (SerperSchemas.PatentsRequest | ReadonlyArray<SerperSchemas.PatentsRequest>);
export type SerperPatentsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperPatentsBody; };
export type SerperPatentsResponse = (SerperSchemas.PatentsResponse | ReadonlyArray<SerperSchemas.PatentsResponse>);
export type SerperPatentsGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; "num"?: number; "autocorrect"?: boolean; "tbs"?: string; "page"?: number; };
export type SerperPatentsGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperPatentsGetQuery; };
export type SerperPatentsGetResponse = SerperSchemas.PatentsResponse;
export type SerperAutocompleteBody = (SerperSchemas.AutocompleteRequest | ReadonlyArray<SerperSchemas.AutocompleteRequest>);
export type SerperAutocompleteInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperAutocompleteBody; };
export type SerperAutocompleteResponse = (SerperSchemas.AutocompleteResponse | ReadonlyArray<SerperSchemas.AutocompleteResponse>);
export type SerperAutocompleteGetQuery = { "q": string; "location"?: string; "gl"?: string; "hl"?: string; };
export type SerperAutocompleteGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperAutocompleteGetQuery; };
export type SerperAutocompleteGetResponse = SerperSchemas.AutocompleteResponse;
export type SerperLensBody = (SerperSchemas.LensRequest | ReadonlyArray<SerperSchemas.LensRequest>);
export type SerperLensInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperLensBody; };
export type SerperLensResponse = (SerperSchemas.LensResponse | ReadonlyArray<SerperSchemas.LensResponse>);
export type SerperLensGetQuery = { "url": string; "location"?: string; "gl"?: string; "hl"?: string; "tbs"?: string; };
export type SerperLensGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperLensGetQuery; };
export type SerperLensGetResponse = SerperSchemas.LensResponse;
export type SerperScrapeBody = {
  "url": string;
  "includeMarkdown"?: boolean;
  "includeImages"?: boolean;
  "includeLinks"?: boolean;
  "includeVideos"?: boolean;
  [key: string]: unknown;
};
export type SerperScrapeInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: SerperScrapeBody; };
export type SerperScrapeResponse = Record<string, unknown>;
export type SerperScrapeGetQuery = { "url": string; "includeMarkdown"?: boolean; "includeImages"?: boolean; "includeLinks"?: boolean; "includeVideos"?: boolean; };
export type SerperScrapeGetInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: SerperScrapeGetQuery; };
export type SerperScrapeGetResponse = Record<string, unknown>;


export const serperOperations = Object.freeze({
  search: Object.freeze({"id":"serper.search","method":"POST","path":"/search","retryable":false}),
  searchGet: Object.freeze({"id":"serper.searchGet","method":"GET","path":"/search","retryable":true}),
  images: Object.freeze({"id":"serper.images","method":"POST","path":"/images","retryable":false}),
  imagesGet: Object.freeze({"id":"serper.imagesGet","method":"GET","path":"/images","retryable":true}),
  videos: Object.freeze({"id":"serper.videos","method":"POST","path":"/videos","retryable":false}),
  videosGet: Object.freeze({"id":"serper.videosGet","method":"GET","path":"/videos","retryable":true}),
  places: Object.freeze({"id":"serper.places","method":"POST","path":"/places","retryable":false}),
  placesGet: Object.freeze({"id":"serper.placesGet","method":"GET","path":"/places","retryable":true}),
  maps: Object.freeze({"id":"serper.maps","method":"POST","path":"/maps","retryable":false}),
  mapsGet: Object.freeze({"id":"serper.mapsGet","method":"GET","path":"/maps","retryable":true}),
  reviews: Object.freeze({"id":"serper.reviews","method":"POST","path":"/reviews","retryable":false}),
  reviewsGet: Object.freeze({"id":"serper.reviewsGet","method":"GET","path":"/reviews","retryable":true}),
  news: Object.freeze({"id":"serper.news","method":"POST","path":"/news","retryable":false}),
  newsGet: Object.freeze({"id":"serper.newsGet","method":"GET","path":"/news","retryable":true}),
  shopping: Object.freeze({"id":"serper.shopping","method":"POST","path":"/shopping","retryable":false}),
  shoppingGet: Object.freeze({"id":"serper.shoppingGet","method":"GET","path":"/shopping","retryable":true}),
  scholar: Object.freeze({"id":"serper.scholar","method":"POST","path":"/scholar","retryable":false}),
  scholarGet: Object.freeze({"id":"serper.scholarGet","method":"GET","path":"/scholar","retryable":true}),
  patents: Object.freeze({"id":"serper.patents","method":"POST","path":"/patents","retryable":false}),
  patentsGet: Object.freeze({"id":"serper.patentsGet","method":"GET","path":"/patents","retryable":true}),
  autocomplete: Object.freeze({"id":"serper.autocomplete","method":"POST","path":"/autocomplete","retryable":false}),
  autocompleteGet: Object.freeze({"id":"serper.autocompleteGet","method":"GET","path":"/autocomplete","retryable":true}),
  lens: Object.freeze({"id":"serper.lens","method":"POST","path":"/lens","retryable":false}),
  lensGet: Object.freeze({"id":"serper.lensGet","method":"GET","path":"/lens","retryable":true}),
  scrape: Object.freeze({"id":"serper.scrape","method":"POST","path":"/","retryable":false}),
  scrapeGet: Object.freeze({"id":"serper.scrapeGet","method":"GET","path":"/","retryable":true}),
} satisfies Record<string, NativeOperation>);

export function createSerperClient(options: SerperClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "serper", baseUrl: "https://google.serper.dev", headers: { "X-API-Key": apiKey } });
  const transport1 = createNativeTransport({ ...config, provider: "serper", baseUrl: "https://scrape.serper.dev", headers: { "X-API-Key": apiKey } });
  return Object.freeze({
    operations: serperOperations,
    /** search */
    async search(input: SerperSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperSearchResponse>(serperOperations.search, input);
    },
    /** search via GET */
    async searchGet(input: SerperSearchGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperSearchGetResponse>(serperOperations.searchGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** images */
    async images(input: SerperImagesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperImagesResponse>(serperOperations.images, input);
    },
    /** images via GET */
    async imagesGet(input: SerperImagesGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperImagesGetResponse>(serperOperations.imagesGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** videos */
    async videos(input: SerperVideosInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperVideosResponse>(serperOperations.videos, input);
    },
    /** videos via GET */
    async videosGet(input: SerperVideosGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperVideosGetResponse>(serperOperations.videosGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** places */
    async places(input: SerperPlacesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperPlacesResponse>(serperOperations.places, input);
    },
    /** places via GET */
    async placesGet(input: SerperPlacesGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperPlacesGetResponse>(serperOperations.placesGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** maps */
    async maps(input: SerperMapsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperMapsResponse>(serperOperations.maps, input);
    },
    /** maps via GET */
    async mapsGet(input: SerperMapsGetInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<SerperMapsGetResponse>(serperOperations.mapsGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** reviews */
    async reviews(input: SerperReviewsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperReviewsResponse>(serperOperations.reviews, input);
    },
    /** reviews via GET */
    async reviewsGet(input: SerperReviewsGetInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<SerperReviewsGetResponse>(serperOperations.reviewsGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** news */
    async news(input: SerperNewsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperNewsResponse>(serperOperations.news, input);
    },
    /** news via GET */
    async newsGet(input: SerperNewsGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperNewsGetResponse>(serperOperations.newsGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** shopping */
    async shopping(input: SerperShoppingInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperShoppingResponse>(serperOperations.shopping, input);
    },
    /** shopping via GET */
    async shoppingGet(input: SerperShoppingGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperShoppingGetResponse>(serperOperations.shoppingGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** scholar */
    async scholar(input: SerperScholarInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperScholarResponse>(serperOperations.scholar, input);
    },
    /** scholar via GET */
    async scholarGet(input: SerperScholarGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperScholarGetResponse>(serperOperations.scholarGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** patents */
    async patents(input: SerperPatentsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperPatentsResponse>(serperOperations.patents, input);
    },
    /** patents via GET */
    async patentsGet(input: SerperPatentsGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperPatentsGetResponse>(serperOperations.patentsGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** autocomplete */
    async autocomplete(input: SerperAutocompleteInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperAutocompleteResponse>(serperOperations.autocomplete, input);
    },
    /** autocomplete via GET */
    async autocompleteGet(input: SerperAutocompleteGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperAutocompleteGetResponse>(serperOperations.autocompleteGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** lens */
    async lens(input: SerperLensInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<SerperLensResponse>(serperOperations.lens, input);
    },
    /** lens via GET */
    async lensGet(input: SerperLensGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["url"] == null) throw new SearchError("invalid_request");
      return transport0.request<SerperLensGetResponse>(serperOperations.lensGet, { ...input, query: { ...input.query, apiKey } });
    },
    /** Scrape a webpage */
    async scrape(input: SerperScrapeInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport1.request<SerperScrapeResponse>(serperOperations.scrape, input);
    },
    /** Scrape a webpage via GET */
    async scrapeGet(input: SerperScrapeGetInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["url"] == null) throw new SearchError("invalid_request");
      return transport1.request<SerperScrapeGetResponse>(serperOperations.scrapeGet, { ...input, query: { ...input.query, apiKey } });
    },
  });
}
export type SerperClient = ReturnType<typeof createSerperClient>;
