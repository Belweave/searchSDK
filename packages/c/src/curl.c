#include "internal.h"
#include <ctype.h>
#include <curl/curl.h>
#include <limits.h>
#include <searchsdk/curl.h>
#include <stdio.h>
#include <strings.h>

/* Every transfer has a fresh easy handle: no connection-level auth, cookies,
 * redirects, environment proxies, netrc or credentials inherited from another call. */
typedef struct {
    const ssk_http_request *request;
    ssk_sink *sink;
    ssk_code failure;
} transfer;
static size_t write_body(char *bytes, size_t size, size_t count, void *context) {
    transfer *t = context;
    if (size && count > SIZE_MAX / size) {
        t->failure = SSK_INVALID_RESPONSE;
        return 0;
    }
    size_t n = size * count;
    t->failure = ssk_sink_write(t->sink, bytes, n);
    return t->failure ? 0 : n;
}
static size_t write_header(char *bytes, size_t size, size_t count, void *context) {
    transfer *t = context;
    if (size && count > SIZE_MAX / size) {
        t->failure = SSK_INVALID_RESPONSE;
        return 0;
    }
    size_t n = size * count;
    if (n > 16384) {
        t->failure = SSK_INVALID_RESPONSE;
        return 0;
    }
    if (n >= 5 && !memcmp(bytes, "HTTP/", 5)) {
        char line[128];
        if (n >= sizeof(line)) {
            t->failure = SSK_INVALID_RESPONSE;
            return 0;
        }
        memcpy(line, bytes, n);
        line[n] = 0;
        char *space = strchr(line, ' ');
        if (!space || strlen(space) < 4 || !isdigit((unsigned char)space[1]) ||
            !isdigit((unsigned char)space[2]) || !isdigit((unsigned char)space[3])) {
            t->failure = SSK_INVALID_RESPONSE;
            return 0;
        }
        int status = (space[1] - '0') * 100 + (space[2] - '0') * 10 + space[3] - '0';
        t->failure = ssk_sink_status(t->sink, status);
        return t->failure ? 0 : n;
    }
    if (n == 2 && bytes[0] == '\r' && bytes[1] == '\n')
        return n;
    char *colon = memchr(bytes, ':', n);
    if (!colon) {
        t->failure = SSK_INVALID_RESPONSE;
        return 0;
    }
    size_t key_size = (size_t)(colon - bytes), start = key_size + 1, end = n;
    while (start < end && (bytes[start] == ' ' || bytes[start] == '\t'))
        start++;
    while (end > start && (bytes[end - 1] == '\r' || bytes[end - 1] == '\n' ||
                           bytes[end - 1] == ' ' || bytes[end - 1] == '\t'))
        end--;
    char *key = malloc(key_size + 1), *value = malloc(end - start + 1);
    if (!key || !value) {
        free(key);
        free(value);
        t->failure = SSK_CONFIGURATION;
        return 0;
    }
    memcpy(key, bytes, key_size);
    key[key_size] = 0;
    memcpy(value, bytes + start, end - start);
    value[end - start] = 0;
    t->failure = ssk_sink_header(t->sink, key, value);
    free(key);
    free(value);
    return t->failure ? 0 : n;
}
static int progress(void *context, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal,
                    curl_off_t ulnow) {
    (void)dltotal;
    (void)dlnow;
    (void)ultotal;
    (void)ulnow;
    transfer *t = context;
    ssk_code c = ssk_http_check(t->request);
    if (c)
        t->failure = c;
    return c != SSK_OK;
}
void ssk_curl_options_init(ssk_curl_options *o) {
    if (o) {
        memset(o, 0, sizeof(*o));
        o->struct_size = sizeof(*o);
    }
}
ssk_code ssk_curl_transport(void *context, const ssk_http_request *r, ssk_sink *sink) {
    const ssk_curl_options *config = context;
    if ((config && config->struct_size != sizeof(*config)) || !r || !sink ||
        strncasecmp(r->url, "https://", 8) || !ssk__url_valid(r->url, 0))
        return SSK_CONFIGURATION;
    ssk_code check = ssk_http_check(r);
    if (check)
        return check;
    uint64_t now = ssk_monotonic_ms();
    if (now >= r->deadline_ms)
        return SSK_TIMEOUT;
    uint64_t budget = r->deadline_ms - now;
    if (budget > LONG_MAX)
        budget = LONG_MAX;
    if (!budget)
        return SSK_TIMEOUT;
    CURL *easy = curl_easy_init();
    if (!easy)
        return SSK_CONFIGURATION;
    struct curl_slist *headers = NULL;
    transfer t = {r, sink, SSK_OK};
    ssk_code result = SSK_CONFIGURATION;
    for (size_t i = 0; i < r->header_count; i++) {
        if (!ssk__header_valid(r->headers[i].name, r->headers[i].value))
            goto done;
        ssk_buf b = {0};
        ssk__buf_str(&b, r->headers[i].name);
        ssk__buf_str(&b, ": ");
        ssk__buf_str(&b, r->headers[i].value);
        char *s = ssk__buf_take(&b);
        if (!s)
            goto done;
        struct curl_slist *next = curl_slist_append(headers, s);
        free(s);
        if (!next)
            goto done;
        headers = next;
    }
    /* Disable Expect/100-continue to keep request behavior deterministic. */
    {
        struct curl_slist *next = curl_slist_append(headers, "Expect:");
        if (!next)
            goto done;
        headers = next;
    }
#define SET(option, value)                                                                         \
    do {                                                                                           \
        if (curl_easy_setopt(easy, option, value) != CURLE_OK)                                     \
            goto done;                                                                             \
    } while (0)
    if (config && config->ca_bundle)
        SET(CURLOPT_CAINFO, config->ca_bundle);
    SET(CURLOPT_URL, r->url);
    SET(CURLOPT_PROTOCOLS_STR, "https");
    SET(CURLOPT_REDIR_PROTOCOLS_STR, "https");
    SET(CURLOPT_FOLLOWLOCATION, 0L);
    SET(CURLOPT_MAXREDIRS, 0L);
    SET(CURLOPT_UNRESTRICTED_AUTH, 0L);
    SET(CURLOPT_AUTOREFERER, 0L);
    SET(CURLOPT_PROXY, "");
    SET(CURLOPT_NOPROXY, "*");
    SET(CURLOPT_NETRC, (long)CURL_NETRC_IGNORED);
    SET(CURLOPT_HTTPAUTH, (long)CURLAUTH_NONE);
    SET(CURLOPT_SSL_VERIFYPEER, 1L);
    SET(CURLOPT_SSL_VERIFYHOST, 2L);
    SET(CURLOPT_NOSIGNAL, 1L);
    SET(CURLOPT_PATH_AS_IS, 1L);
    SET(CURLOPT_TIMEOUT_MS, (long)budget);
    SET(CURLOPT_CONNECTTIMEOUT_MS, (long)budget);
    SET(CURLOPT_ACCEPT_ENCODING, "");
    SET(CURLOPT_HTTPHEADER, headers);
    SET(CURLOPT_WRITEFUNCTION, write_body);
    SET(CURLOPT_WRITEDATA, &t);
    SET(CURLOPT_HEADERFUNCTION, write_header);
    SET(CURLOPT_HEADERDATA, &t);
    SET(CURLOPT_XFERINFOFUNCTION, progress);
    SET(CURLOPT_XFERINFODATA, &t);
    SET(CURLOPT_NOPROGRESS, 0L);
    SET(CURLOPT_CUSTOMREQUEST, r->method);
    if (!strcmp(r->method, "HEAD"))
        SET(CURLOPT_NOBODY, 1L);
    if (r->body) {
        if (r->body_size > SSK_MAX_REQUEST_BYTES)
            goto done;
        SET(CURLOPT_POSTFIELDS, r->body);
        SET(CURLOPT_POSTFIELDSIZE_LARGE, (curl_off_t)r->body_size);
    }
    CURLcode status = curl_easy_perform(easy);
    check = ssk_http_check(r);
    result = check                                ? check
             : t.failure                          ? t.failure
             : status == CURLE_OPERATION_TIMEDOUT ? SSK_TIMEOUT
             : status == CURLE_OK                 ? SSK_OK
                                                  : SSK_NETWORK;
#undef SET
done:
    curl_slist_free_all(headers);
    curl_easy_cleanup(easy);
    return result;
}
