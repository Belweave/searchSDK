#ifndef SSK_INTERNAL_H
#define SSK_INTERNAL_H
#include <searchsdk/searchsdk.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>
#define SSK_MAX_JSON_DEPTH 64u
#define SSK_MAX_NODES 262144u
#define SSK_MAX_HEADERS 64u
#define SSK_MAX_REQUEST_BYTES (10u * 1024u * 1024u)
struct ssk_json {
    int type;
    char *text, *key;
    size_t length, key_length, count, capacity;
    double number;
    struct ssk_json **items;
};
typedef struct {
    char *data;
    size_t size, capacity;
    int failed;
} ssk_buf;
void ssk__buf_add(ssk_buf *, const void *, size_t);
void ssk__buf_str(ssk_buf *, const char *);
void ssk__buf_char(ssk_buf *, char);
char *ssk__buf_take(ssk_buf *);
char *ssk_strdup(const char *);
ssk_json *ssk__jnew(int);
ssk_json *ssk__jstr(const char *);
ssk_json *ssk__jstrn(const char *, size_t);
ssk_json *ssk__jnum(double);
ssk_json *ssk__jbool(int);
ssk_json *ssk__jclone(const ssk_json *);
int ssk__jpush(ssk_json *, ssk_json *);              /* consumes child even on failure */
int ssk__jset(ssk_json *, const char *, ssk_json *); /* consumes child */
int ssk__jisstr(const ssk_json *);
int ssk__jeq(const ssk_json *, const char *);
int ssk__jfields(const ssk_json *, const char *const *, size_t);
int ssk__utf8_valid(const unsigned char *, size_t);
size_t ssk__utf16_length(const char *);
int ssk__url_valid(const char *, int endpoint);
int ssk__timestamp_valid(const char *);
void ssk__utc_now(char[32]);
struct ssk_cancel {
    atomic_bool triggered;
};
struct ssk_client {
    char *provider, *gateway_url;
    ssk_json *settings;
    ssk_transport_fn transport;
    void *context;
    uint32_t timeout_ms, attempt_timeout_ms, max_retries, retry_delay_ms;
    size_t max_bytes;
};
struct ssk_response {
    ssk_json *json;
    unsigned char *data;
    size_t size;
    int status;
    ssk_header *headers;
    size_t header_count;
};
struct ssk_error {
    ssk_code code;
    int status;
    int64_t retry_after;
    ssk_json *attempts;
};
struct ssk_sink {
    const ssk_http_request *request;
    ssk_response *response;
    ssk_code failure;
    size_t header_bytes;
    ssk_code (*on_bytes)(void *, const void *, size_t);
    void *on_bytes_context;
};
ssk_code ssk__fail(ssk_error **, ssk_code, int, int64_t, const ssk_json *);
ssk_code ssk__http_call(const ssk_client *, const ssk_http_request *, ssk_response **, ssk_error **,
                        int gateway);
ssk_code ssk__validate_response(const ssk_json *, int);
ssk_code ssk__validate_capabilities(const ssk_client *, const ssk_json *);
ssk_code ssk__provider_request(const ssk_client *, const ssk_json *, const char *,
                               ssk_http_request *, ssk_header **, char **, char **);
ssk_code ssk__provider_response(const ssk_client *, const ssk_json *, const char *, size_t,
                                ssk_json **);
void ssk__free_headers(ssk_header *, size_t);
int ssk__header_add(ssk_header **, size_t *, const char *, const char *);
int ssk__header_valid(const char *, const char *);
char *ssk__encode_uri(const char *, int form);
void ssk__query_add(ssk_buf *, const char *, const char *, int);
ssk_code ssk__search_until(const ssk_client *, const char *, const ssk_call_options *, uint64_t,
                           ssk_response **, ssk_error **);
#endif
