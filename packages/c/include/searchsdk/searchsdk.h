#ifndef SEARCHSDK_H
#define SEARCHSDK_H
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
#define SSK_ABI_VERSION 1u
#define SSK_VERSION "0.1.0-alpha.1"
#define SSK_DEFAULT_MAX_BYTES (10u * 1024u * 1024u)
typedef int32_t ssk_code;
enum {
    SSK_OK = 0,
    SSK_INVALID_REQUEST,
    SSK_UNSUPPORTED_OPTION,
    SSK_CONFIGURATION,
    SSK_AUTH,
    SSK_RATE_LIMIT,
    SSK_NETWORK,
    SSK_UNAVAILABLE,
    SSK_ATTEMPT_TIMEOUT,
    SSK_TIMEOUT,
    SSK_ABORTED,
    SSK_INVALID_RESPONSE,
    SSK_PROVIDER_ERROR
};
typedef struct ssk_json ssk_json;
typedef struct ssk_client ssk_client;
typedef struct ssk_cancel ssk_cancel;
typedef struct ssk_response ssk_response;
typedef struct ssk_error ssk_error;
typedef struct ssk_sink ssk_sink;
/* Owned immutable JSON. Objects reject duplicate keys; strings preserve embedded NUL.
 * Borrowed children/strings remain valid until the root is freed. */
enum {
    SSK_JSON_NULL,
    SSK_JSON_BOOL,
    SSK_JSON_NUMBER,
    SSK_JSON_STRING,
    SSK_JSON_ARRAY,
    SSK_JSON_OBJECT
};
ssk_code ssk_json_parse(const void *, size_t, ssk_json **);
void ssk_json_free(ssk_json *);
int ssk_json_type(const ssk_json *); /* -1 for NULL */
size_t ssk_json_size(const ssk_json *);
const ssk_json *ssk_json_at(const ssk_json *, size_t);
const ssk_json *ssk_json_get(const ssk_json *, const char *);
const char *ssk_json_key(const ssk_json *, size_t);
const char *ssk_json_string(const ssk_json *);
size_t ssk_json_string_length(const ssk_json *);
double ssk_json_number(const ssk_json *);
int ssk_json_bool(const ssk_json *);
char *ssk_json_encode(const ssk_json *); /* owned; ssk_free */
void ssk_free(void *);
const char *ssk_code_name(ssk_code);
const char *ssk_code_message(ssk_code);
/* Cancellation is thread safe. Free only after every observing call has returned. */
ssk_cancel *ssk_cancel_new(void);
void ssk_cancel_trigger(ssk_cancel *);
int ssk_cancel_is_triggered(const ssk_cancel *);
void ssk_cancel_free(ssk_cancel *);
uint64_t ssk_monotonic_ms(void);

typedef struct {
    const char *name;
    const char *value;
} ssk_header;
typedef struct {
    const char *url, *method;
    const ssk_header *headers;
    size_t header_count;
    const unsigned char *body;
    size_t body_size;
    uint64_t deadline_ms; /* absolute monotonic, includes headers/body/decode */
    size_t max_response_bytes;
    const ssk_cancel *cancel;
} ssk_http_request;
/* Transport borrows all inputs for this synchronous call only. No redirects,
 * ambient credentials, logging, or retries. Must honor deadline and cancel.
 * SDK sink bounds decoded bytes and headers. Never retain the sink. */
typedef ssk_code (*ssk_transport_fn)(void *, const ssk_http_request *, ssk_sink *);
ssk_code ssk_sink_status(ssk_sink *, int);
ssk_code ssk_sink_header(ssk_sink *, const char *, const char *);
ssk_code ssk_sink_write(ssk_sink *, const void *, size_t);
ssk_code ssk_http_check(const ssk_http_request *);

typedef struct {
    size_t struct_size;
    /* Exactly one of provider or gateway_url. Provider is a normalized provider ID
     * or a native-only ID. gateway_url is exact HTTPS without query/fragment/userinfo. */
    const char *provider;
    const char *gateway_url;
    /* Provider-specific JSON settings: searxng and valyu only. See README. */
    const char *provider_options_json;
    ssk_transport_fn transport;
    void *transport_context;
    uint32_t timeout_ms;         /* 0 = 10000 */
    uint32_t attempt_timeout_ms; /* 0 = whole-call budget */
    size_t max_response_bytes;   /* 0 = 10 MiB */
    uint32_t max_retries;        /* opt-in; normalized reads only; 0 default, max 8 */
    uint32_t retry_delay_ms;     /* 0 = 100; Retry-After is never shortened */
} ssk_config;
void ssk_config_init(ssk_config *);
ssk_code ssk_client_new(const ssk_config *, ssk_client **, ssk_error **);
void ssk_client_free(ssk_client *);

typedef struct {
    size_t struct_size;
    /* Borrowed per-call credential. Never retained by clients. Gateway: app token.
     * Native Exa admin operations: supply team key as credential for that call. */
    const char *credential;
    const ssk_cancel *cancel;
    uint32_t timeout_ms; /* 0 = client default */
    /* Optional RFC3339 UTC retrieval clock override, useful for deterministic fixtures. */
    const char *retrieved_at;
} ssk_call_options;
void ssk_call_options_init(ssk_call_options *);
/* All out parameters must be non-NULL except error (optional), initialized by API.
 * Each returned response/error is independently owned; free exactly once.
 * Clients are immutable and may be shared if transport_context is thread safe.
 * No function frees user inputs. Calls are synchronous, with no hidden workers. */
ssk_code ssk_request_normalize(const char *, ssk_json **);
ssk_code ssk_search(const ssk_client *, const char *, const ssk_call_options *, ssk_response **,
                    ssk_error **);
/* Explicit fallback chain; validates capabilities of the entire chain before I/O.
 * One whole-call deadline from the first client. Only transient errors fallback.
 * credentials/options[i] correspond to clients[i]. No gateway fallback. */
ssk_code ssk_search_chain(const ssk_client *const *, const ssk_call_options *, size_t, const char *,
                          ssk_response **, ssk_error **);
/* Ordered bounded synchronous batch: concurrency 1..64; threads joined before
 * return. Queue time counts against one batch deadline. Each result owns its
 * response/error. Call ssk_batch_free after inspecting all outcomes. */
typedef struct {
    ssk_code code;
    ssk_response *response;
    ssk_error *error;
} ssk_outcome;
ssk_code ssk_search_batch(const ssk_client *, const char *const *, size_t, size_t concurrency,
                          const ssk_call_options *, ssk_outcome **);
void ssk_batch_free(ssk_outcome *, size_t);

const ssk_json *ssk_response_json(const ssk_response *);
const unsigned char *ssk_response_data(const ssk_response *, size_t *);
int ssk_response_status(const ssk_response *);
const char *ssk_response_header(const ssk_response *, const char *);
void ssk_response_free(ssk_response *);
ssk_code ssk_error_code(const ssk_error *);
int ssk_error_status(const ssk_error *);
int64_t ssk_error_retry_after_ms(const ssk_error *); /* -1 unknown */
const ssk_json *ssk_error_attempts(const ssk_error *);
void ssk_error_free(ssk_error *);

typedef struct {
    const char *provider;
    int domain_filters, mutually_exclusive_domain_filters;
    size_t max_include_domains, max_exclude_domains, max_query_utf16;
} ssk_capabilities;
size_t ssk_provider_count(void);
const ssk_capabilities *ssk_provider_at(size_t);
const ssk_capabilities *ssk_provider_capabilities(const char *);
/* Generated fixed-host native catalog. Descriptors and strings have static lifetime.
 * Native APIs do not perform provider JSON Schema validation. Raw response bytes
 * and SSE data remain native. No mutation, including POST search, is replayed. */
typedef struct {
    const char *provider, *name, *method, *base_url, *path, *response_mode, *source;
    const char *metadata_json; /* required params, body mode, source attribution */
} ssk_operation;
size_t ssk_operation_count(void);
const ssk_operation *ssk_operation_at(size_t);
const ssk_operation *ssk_operation_find(const char *, const char *);
/* input JSON: {path:{...},query:{...},headers:{...},body:<JSON>}.
 * For raw/multipart operations pass bytes separately and Content-Type header
 * (caller encodes the MIME boundary). Never combine raw bytes and JSON body.
 * logoUrl returns UTF-8 URL bytes without dispatch; headLogo only makes HEAD.
 * paidSearch accepts external PAYMENT-SIGNATURE; never signs or negotiates. */
ssk_code ssk_native_call(const ssk_client *, const ssk_operation *, const char *,
                         const void *raw_body, size_t raw_size, const ssk_call_options *,
                         ssk_response **, ssk_error **);
/* Parse bounded collected SSE without reconnect/replay. Callback strings are
 * borrowed for callback only; data includes joined lines, id and event optional.
 * Return nonzero from callback to stop with SSK_ABORTED. */
typedef int (*ssk_sse_fn)(void *, const char *event, const char *data, const char *id,
                          int64_t retry_ms);
ssk_code ssk_response_sse(const ssk_response *, ssk_sse_fn, void *);
/* Incremental bounded SSE: callbacks execute synchronously inside transport writes.
 * Only catalog SSE operations are accepted. No reconnect/retry. A nonzero callback
 * result stops the request with SSK_ABORTED. Returned response retains all bounded
 * bytes; callbacks may already have observed events when a later failure occurs. */
ssk_code ssk_native_stream(const ssk_client *, const ssk_operation *, const char *,
                           const ssk_call_options *, ssk_sse_fn, void *, ssk_response **,
                           ssk_error **);
#ifdef __cplusplus
}
#endif
#endif
