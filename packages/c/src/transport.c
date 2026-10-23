#define _GNU_SOURCE
#define _DARWIN_C_SOURCE
#include "internal.h"
#include <ctype.h>
#include <limits.h>
#include <math.h>
#include <stdio.h>
#include <strings.h>
#include <time.h>

static const char *const names[] = {
    "ok",         "invalid_request",  "unsupported_option", "configuration",   "auth",
    "rate_limit", "network",          "unavailable",        "attempt_timeout", "timeout",
    "aborted",    "invalid_response", "provider_error"};
static const char *const messages[] = {"Success.",
                                       "Invalid search request.",
                                       "Unsupported provider option.",
                                       "Invalid SDK configuration.",
                                       "Authentication failed.",
                                       "Rate limit reached.",
                                       "Search transport failed.",
                                       "Provider unavailable.",
                                       "Attempt deadline exceeded.",
                                       "Search deadline exceeded.",
                                       "Search cancelled.",
                                       "Invalid provider response.",
                                       "Provider rejected request."};
const char *ssk_code_name(ssk_code c) {
    return c >= 0 && c <= SSK_PROVIDER_ERROR ? names[c] : "configuration";
}
const char *ssk_code_message(ssk_code c) {
    return c >= 0 && c <= SSK_PROVIDER_ERROR ? messages[c] : messages[SSK_CONFIGURATION];
}
ssk_cancel *ssk_cancel_new(void) {
    ssk_cancel *c = malloc(sizeof(*c));
    if (c)
        atomic_init(&c->triggered, false);
    return c;
}
void ssk_cancel_trigger(ssk_cancel *c) {
    if (c)
        atomic_store_explicit(&c->triggered, true, memory_order_release);
}
int ssk_cancel_is_triggered(const ssk_cancel *c) {
    return c && atomic_load_explicit(&c->triggered, memory_order_acquire);
}
void ssk_cancel_free(ssk_cancel *c) {
    free(c);
}
uint64_t ssk_monotonic_ms(void) {
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return (uint64_t)t.tv_sec * 1000u + (uint64_t)t.tv_nsec / 1000000u;
}
ssk_code ssk_http_check(const ssk_http_request *r) {
    if (!r)
        return SSK_CONFIGURATION;
    if (ssk_cancel_is_triggered(r->cancel))
        return SSK_ABORTED;
    if (ssk_monotonic_ms() >= r->deadline_ms)
        return SSK_TIMEOUT;
    return SSK_OK;
}
void ssk__free_headers(ssk_header *h, size_t n) {
    for (size_t i = 0; i < n; i++) {
        free((char *)h[i].name);
        free((char *)h[i].value);
    }
    free(h);
}
int ssk__header_valid(const char *k, const char *v) {
    if (!k || !v || !k[0] || strlen(k) > 256 || strlen(v) > 8192)
        return 0;
    for (const unsigned char *p = (const unsigned char *)k; *p; p++)
        if (*p >= 128 || (!isalnum(*p) && !strchr("!#$%&'*+-.^_`|~", *p)))
            return 0;
    for (const unsigned char *p = (const unsigned char *)v; *p; p++)
        if (*p < 32 || *p == 127)
            return 0;
    return 1;
}
int ssk__header_add(ssk_header **h, size_t *n, const char *k, const char *v) {
    if (!ssk__header_valid(k, v))
        return 0;
    for (size_t i = 0; i < *n; i++)
        if (!strcasecmp((*h)[i].name, k)) {
            char *s = ssk_strdup(v);
            if (!s)
                return 0;
            free((char *)(*h)[i].value);
            (*h)[i].value = s;
            return 1;
        }
    if (*n >= SSK_MAX_HEADERS)
        return 0;
    ssk_header *p = realloc(*h, (*n + 1) * sizeof(*p));
    if (!p)
        return 0;
    *h = p;
    char *a = ssk_strdup(k), *b = ssk_strdup(v);
    if (!a || !b) {
        free(a);
        free(b);
        return 0;
    }
    p[*n] = (ssk_header){a, b};
    (*n)++;
    return 1;
}
ssk_code ssk_sink_status(ssk_sink *s, int status) {
    if (!s || s->failure)
        return s ? s->failure : SSK_CONFIGURATION;
    if (status < 100 || status > 599 || s->response->status >= 200)
        return s->failure = SSK_INVALID_RESPONSE;
    /* Interim status blocks contain no usable response headers. */
    if (s->response->status) {
        ssk__free_headers(s->response->headers, s->response->header_count);
        s->response->headers = NULL;
        s->response->header_count = 0;
        s->header_bytes = 0;
        free(s->response->data);
        s->response->data = NULL;
        s->response->size = 0;
    }
    s->response->status = status;
    return SSK_OK;
}
ssk_code ssk_sink_header(ssk_sink *s, const char *k, const char *v) {
    if (!s)
        return SSK_CONFIGURATION;
    if (s->failure)
        return s->failure;
    if (!ssk__header_valid(k, v) || s->header_bytes + strlen(k) + strlen(v) > 65536 ||
        !ssk__header_add(&s->response->headers, &s->response->header_count, k, v))
        return s->failure = SSK_INVALID_RESPONSE;
    s->header_bytes += strlen(k) + strlen(v);
    return SSK_OK;
}
ssk_code ssk_sink_write(ssk_sink *s, const void *data, size_t n) {
    if (!s)
        return SSK_CONFIGURATION;
    if (s->failure)
        return s->failure;
    ssk_code c = ssk_http_check(s->request);
    if (c)
        return s->failure = c;
    if ((!data && n) || !s->response->status ||
        n > s->request->max_response_bytes - s->response->size)
        return s->failure = SSK_INVALID_RESPONSE;
    if (!n)
        return SSK_OK;
    unsigned char *p = realloc(s->response->data, s->response->size + n + 1);
    if (!p)
        return s->failure = SSK_CONFIGURATION;
    memcpy(p + s->response->size, data, n);
    s->response->size += n;
    p[s->response->size] = 0;
    s->response->data = p;
    if (s->on_bytes && s->response->status >= 200 && s->response->status < 300) {
        ssk_code code = s->on_bytes(s->on_bytes_context, data, n);
        if (code)
            return s->failure = code;
    }
    return SSK_OK;
}
const ssk_json *ssk_response_json(const ssk_response *r) {
    return r ? r->json : NULL;
}
const unsigned char *ssk_response_data(const ssk_response *r, size_t *n) {
    if (n)
        *n = r ? r->size : 0;
    return r ? r->data : NULL;
}
int ssk_response_status(const ssk_response *r) {
    return r ? r->status : 0;
}
const char *ssk_response_header(const ssk_response *r, const char *k) {
    if (r && k)
        for (size_t i = 0; i < r->header_count; i++)
            if (!strcasecmp(r->headers[i].name, k))
                return r->headers[i].value;
    return NULL;
}
void ssk_response_free(ssk_response *r) {
    if (r) {
        ssk_json_free(r->json);
        free(r->data);
        ssk__free_headers(r->headers, r->header_count);
        free(r);
    }
}
ssk_code ssk_error_code(const ssk_error *e) {
    return e ? e->code : SSK_OK;
}
int ssk_error_status(const ssk_error *e) {
    return e ? e->status : 0;
}
int64_t ssk_error_retry_after_ms(const ssk_error *e) {
    return e ? e->retry_after : -1;
}
const ssk_json *ssk_error_attempts(const ssk_error *e) {
    return e ? e->attempts : NULL;
}
void ssk_error_free(ssk_error *e) {
    if (e) {
        ssk_json_free(e->attempts);
        free(e);
    }
}
ssk_code ssk__fail(ssk_error **out, ssk_code code, int status, int64_t delay,
                   const ssk_json *attempts) {
    if (out) {
        *out = calloc(1, sizeof(**out));
        if (*out) {
            (*out)->code = code;
            (*out)->status = status;
            (*out)->retry_after = delay;
            (*out)->attempts = attempts ? ssk__jclone(attempts) : ssk__jnew(SSK_JSON_ARRAY);
        }
    }
    return code;
}
static ssk_code status_code(int s) {
    return s == 401 || s == 402 || s == 403 || s == 432 || s == 433 ? SSK_AUTH
           : s == 429                                               ? SSK_RATE_LIMIT
           : s == 408 || (s >= 500 && s <= 599)                     ? SSK_UNAVAILABLE
                                                                    : SSK_PROVIDER_ERROR;
}
static int64_t retry_after(const char *s) {
    if (!s || !*s)
        return -1;
    const char *start = s;
    while (*start == ' ' || *start == '\t')
        start++;
    const char *finish = s + strlen(s);
    while (finish > start && (finish[-1] == ' ' || finish[-1] == '\t'))
        finish--;
    const char *p = start;
    uint64_t seconds = 0;
    int valid = p < finish;
    size_t digits = 0;
    while (p < finish && *p >= '0' && *p <= '9') {
        unsigned digit = (unsigned)(*p++ - '0');
        digits++;
        if (seconds > (UINT64_C(9223372036854775) - digit) / 10) {
            valid = 0;
            break;
        }
        seconds = seconds * 10 + digit;
    }
    uint64_t milliseconds = 0;
    unsigned fraction_digits = 0;
    int round_up = 0;
    if (valid && p < finish && *p == '.') {
        p++;
        const char *fraction = p;
        while (p < finish && *p >= '0' && *p <= '9') {
            unsigned digit = (unsigned)(*p++ - '0');
            if (fraction_digits < 3) {
                milliseconds = milliseconds * 10 + digit;
                fraction_digits++;
            } else if (digit)
                round_up = 1;
        }
        if (p == fraction)
            valid = 0;
        while (fraction_digits < 3) {
            milliseconds *= 10;
            fraction_digits++;
        }
    }
    if (valid && digits && p == finish) {
        milliseconds += (uint64_t)round_up;
        uint64_t delay = seconds * 1000 + milliseconds;
        return delay <= (uint64_t)INT64_MAX ? (int64_t)delay : -1;
    }
    char *end = NULL;
    struct tm tm = {0};
    end = strptime(s, "%a, %d %b %Y %H:%M:%S GMT", &tm);
    if (!end || *end)
        return -1;
    time_t t = timegm(&tm), now = time(NULL);
    return t > now ? (int64_t)(t - now) * 1000 : 0;
}
/* Validate then copy only the public attempt fields. Error bodies never escape. */
static ssk_json *error_attempts(const ssk_json *a) {
    if (!a || a->type != SSK_JSON_ARRAY)
        return NULL;
    ssk_json *tmp = ssk__jnew(SSK_JSON_OBJECT);
    if (!tmp)
        return NULL;
    int ok = ssk__jset(tmp, "provider", ssk__jstr("gateway")) &&
             ssk__jset(tmp, "results", ssk__jnew(SSK_JSON_ARRAY)) &&
             ssk__jset(tmp, "usage", ssk__jnew(SSK_JSON_NULL)) &&
             ssk__jset(tmp, "warnings", ssk__jnew(SSK_JSON_ARRAY)) &&
             ssk__jset(tmp, "attempts", ssk__jclone(a));
    if (!ok || ssk__validate_response(tmp, 1)) {
        ssk_json_free(tmp);
        return NULL;
    }
    ssk_json_free(tmp);
    ssk_json *out = ssk__jnew(SSK_JSON_ARRAY);
    if (!out)
        return NULL;
    const char *keys[] = {"provider", "startedAt", "durationMs",  "outcome",
                          "code",     "status",    "retryAfterMs"};
    for (size_t i = 0; i < a->count; i++) {
        ssk_json *row = ssk__jnew(SSK_JSON_OBJECT);
        if (!row)
            goto bad;
        for (size_t k = 0; k < 7; k++) {
            const ssk_json *v = ssk_json_get(a->items[i], keys[k]);
            if (v && !ssk__jset(row, keys[k], ssk__jclone(v))) {
                ssk_json_free(row);
                goto bad;
            }
        }
        if (!ssk__jpush(out, row))
            goto bad;
    }
    return out;
bad:
    ssk_json_free(out);
    return NULL;
}
ssk_code ssk__http_call(const ssk_client *c, const ssk_http_request *q, ssk_response **out,
                        ssk_error **error, int gateway) {
    *out = NULL;
    if (error)
        *error = NULL;
    ssk_code code = ssk_http_check(q);
    if (code)
        return ssk__fail(error, code, 0, -1, NULL);
    ssk_response *r = calloc(1, sizeof(*r));
    if (!r)
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    ssk_sink sink = {.request = q, .response = r};
    code = c->transport(c->context, q, &sink);
    ssk_code stop = ssk_http_check(q);
    if (stop)
        code = stop;
    else if (sink.failure)
        code = sink.failure;
    if (code < SSK_OK || code > SSK_PROVIDER_ERROR)
        code = SSK_NETWORK;
    if (code) {
        ssk_response_free(r);
        return ssk__fail(error, code, 0, -1, NULL);
    }
    if (r->status < 200 || r->status > 599) {
        ssk_response_free(r);
        return ssk__fail(error, SSK_INVALID_RESPONSE, 0, -1, NULL);
    }
    if (r->status >= 300) {
        int status = r->status;
        int64_t delay = retry_after(ssk_response_header(r, "retry-after"));
        code = status_code(status);
        ssk_json *attempts = NULL;
        if (gateway) {
            ssk_json *body = NULL;
            if (!ssk_json_parse(r->data, r->size, &body)) {
                const ssk_json *envelope = ssk_json_get(body, "error"),
                               *name = ssk_json_get(envelope, "code"),
                               *st = ssk_json_get(envelope, "status"),
                               *ra = ssk_json_get(envelope, "retryAfterMs");
                attempts = error_attempts(ssk_json_get(envelope, "attempts"));
                ssk_code mapped = 0;
                for (ssk_code k = 1; k <= SSK_PROVIDER_ERROR; k++)
                    if (ssk__jeq(name, ssk_code_name(k)))
                        mapped = k;
                int valid_status = !st || (st->type == SSK_JSON_NUMBER && st->number >= 100 &&
                                           st->number <= 599 && floor(st->number) == st->number);
                int valid_delay = !ra || (ra->type == SSK_JSON_NUMBER && ra->number >= 0 &&
                                          ra->number <= (double)INT64_MAX - 2048);
                if (mapped && attempts && valid_status && valid_delay) {
                    code = mapped;
                    if (st)
                        status = (int)st->number;
                    if (ra)
                        delay = (int64_t)ceil(ra->number);
                } else {
                    ssk_json_free(attempts);
                    attempts = NULL;
                }
            }
            ssk_json_free(body);
        }
        ssk_response_free(r);
        code = ssk__fail(error, code, status, delay, attempts);
        ssk_json_free(attempts);
        return code;
    }
    *out = r;
    return SSK_OK;
}
char *ssk__encode_uri(const char *s, int form) {
    ssk_buf b = {0};
    static const char hex[] = "0123456789ABCDEF";
    for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
        unsigned c = *p;
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
            c == '-' || c == '_' || c == '.' || (form ? c == '*' : c == '~'))
            ssk__buf_char(&b, (char)c);
        else if (form && c == ' ')
            ssk__buf_char(&b, '+');
        else {
            ssk__buf_char(&b, '%');
            ssk__buf_char(&b, hex[c >> 4]);
            ssk__buf_char(&b, hex[c & 15]);
        }
    }
    return ssk__buf_take(&b);
}
void ssk__query_add(ssk_buf *b, const char *k, const char *v, int form) {
    char *a = ssk__encode_uri(k, form), *z = ssk__encode_uri(v, form);
    if (!a || !z)
        b->failed = 1;
    else {
        if (b->size)
            ssk__buf_char(b, '&');
        ssk__buf_str(b, a);
        ssk__buf_char(b, '=');
        ssk__buf_str(b, z);
    }
    free(a);
    free(z);
}
