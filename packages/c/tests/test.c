#define _POSIX_C_SOURCE 200809L
#include "internal.h"
#include <math.h>
#include <pthread.h>
#include <searchsdk/native.h>
#include <stdio.h>
#include <strings.h>
#include <time.h>

static size_t assertions;
#define CHECK(x)                                                                                   \
    do {                                                                                           \
        assertions++;                                                                              \
        if (!(x)) {                                                                                \
            fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, #x);                                \
            abort();                                                                               \
        }                                                                                          \
    } while (0)
static ssk_json *parse(const char *s) {
    ssk_json *j = NULL;
    CHECK(ssk_json_parse(s, strlen(s), &j) == SSK_OK);
    return j;
}
static char *read_file(const char *name) {
    char p[2048];
    snprintf(p, sizeof(p), "%s/%s", SSK_FIXTURE_DIR, name);
    FILE *f = fopen(p, "rb");
    CHECK(f);
    CHECK(!fseek(f, 0, SEEK_END));
    long n = ftell(f);
    CHECK(n > 0);
    rewind(f);
    char *s = malloc((size_t)n + 1);
    CHECK(s);
    CHECK(fread(s, 1, (size_t)n, f) == (size_t)n);
    s[n] = 0;
    fclose(f);
    return s;
}
static ssk_json *fixture(const char *name) {
    char *s = read_file(name);
    ssk_json *j = parse(s);
    free(s);
    return j;
}
static int equal(const ssk_json *a, const ssk_json *b) {
    if (!a || !b)
        return a == b;
    if (a->type != b->type)
        return 0;
    if (a->type == SSK_JSON_STRING)
        return a->length == b->length && !memcmp(a->text, b->text, a->length);
    if (a->type == SSK_JSON_NUMBER || a->type == SSK_JSON_BOOL)
        return a->number == b->number;
    if (a->count != b->count)
        return 0;
    for (size_t i = 0; i < a->count; i++)
        if (!equal(a->items[i],
                   a->type == SSK_JSON_OBJECT ? ssk_json_get(b, a->items[i]->key) : b->items[i]))
            return 0;
    return 1;
}
static const char *header(const ssk_http_request *r, const char *k) {
    for (size_t i = 0; i < r->header_count; i++)
        if (!strcasecmp(r->headers[i].name, k))
            return r->headers[i].value;
    return NULL;
}
static int hex(unsigned c) {
    return c >= '0' && c <= '9'   ? (int)c - '0'
           : c >= 'A' && c <= 'F' ? (int)c - 'A' + 10
           : c >= 'a' && c <= 'f' ? (int)c - 'a' + 10
                                  : -1;
}
static char *decode(const char *s, size_t n) {
    ssk_buf b = {0};
    for (size_t i = 0; i < n; i++) {
        if (s[i] == '%' && i + 2 < n && hex((unsigned char)s[i + 1]) >= 0 &&
            hex((unsigned char)s[i + 2]) >= 0) {
            ssk__buf_char(&b,
                          (char)(hex((unsigned char)s[i + 1]) * 16 + hex((unsigned char)s[i + 2])));
            i += 2;
        } else
            ssk__buf_char(&b, s[i] == '+' ? ' ' : s[i]);
    }
    return ssk__buf_take(&b);
}
static ssk_json *query_object(const char *text) {
    ssk_json *j = ssk__jnew(SSK_JSON_OBJECT);
    while (*text) {
        const char *end = strchr(text, '&');
        if (!end)
            end = text + strlen(text);
        const char *eq = memchr(text, '=', (size_t)(end - text));
        CHECK(eq);
        char *k = decode(text, (size_t)(eq - text)), *v = decode(eq + 1, (size_t)(end - eq - 1));
        CHECK(ssk__jset(j, k, ssk__jstr(v)));
        free(k);
        free(v);
        text = *end ? end + 1 : end;
    }
    return j;
}
static ssk_client *client(const char *provider_id, const char *url, ssk_transport_fn t, void *ctx,
                          const char *settings) {
    ssk_config c;
    ssk_config_init(&c);
    c.provider = provider_id;
    c.gateway_url = url;
    c.transport = t;
    c.transport_context = ctx;
    c.provider_options_json = settings;
    ssk_client *out = NULL;
    ssk_error *e = NULL;
    CHECK(ssk_client_new(&c, &out, &e) == SSK_OK);
    CHECK(!e && out);
    return out;
}
static ssk_call_options options(void) {
    ssk_call_options o;
    ssk_call_options_init(&o);
    o.credential = "fixture-key";
    o.retrieved_at = "2026-10-22T00:00:00.000Z";
    return o;
}
static ssk_code emit(ssk_sink *s, int status, const char *body) {
    ssk_code c = ssk_sink_status(s, status);
    if (!c && body)
        c = ssk_sink_write(s, body, strlen(body));
    return c;
}

typedef struct {
    const ssk_json *test;
    int calls;
} golden_context;
static ssk_code golden(void *ctx, const ssk_http_request *r, ssk_sink *sink) {
    golden_context *g = ctx;
    g->calls++;
    const ssk_json *want = ssk_json_get(g->test, "upstreamRequest");
    CHECK(!strcmp(r->method, ssk_json_string(ssk_json_get(want, "method"))));
    const char *mark = strchr(r->url, '?');
    size_t path_len = mark ? (size_t)(mark - r->url) : strlen(r->url);
    const char *want_url = ssk_json_string(ssk_json_get(want, "url"));
    if (strlen(want_url) != path_len || memcmp(r->url, want_url, path_len))
        fprintf(stderr, "URL mismatch actual %s expect %s\n", r->url, want_url);
    CHECK(strlen(want_url) == path_len && !memcmp(r->url, want_url, path_len));
    ssk_json *query = query_object(mark ? mark + 1 : "");
    CHECK(equal(query, ssk_json_get(want, "query")));
    ssk_json_free(query);
    const ssk_json *hs = ssk_json_get(want, "headers");
    for (size_t i = 0; i < hs->count; i++) {
        const char *value = header(r, hs->items[i]->key);
        CHECK(value && !strcmp(value, hs->items[i]->text));
    }
    const ssk_json *b = ssk_json_get(want, "body");
    if (b && b->type != SSK_JSON_NULL) {
        ssk_json *actual = NULL;
        if (b->type == SSK_JSON_OBJECT) {
            if (header(r, "Content-Type") &&
                !strcmp(header(r, "Content-Type"), "application/x-www-form-urlencoded"))
                actual = query_object((const char *)r->body);
            else
                CHECK(ssk_json_parse(r->body, r->body_size, &actual) == SSK_OK);
        } else {
            CHECK(b->type == SSK_JSON_STRING);
            actual = ssk__jstrn((const char *)r->body, r->body_size);
        }
        if (!equal(actual, b)) {
            char *a = ssk_json_encode(actual), *z = ssk_json_encode(b);
            fprintf(stderr, "body mismatch\nactual: %s\nexpect: %s\n", a, z);
            free(a);
            free(z);
        }
        CHECK(equal(actual, b));
        ssk_json_free(actual);
    } else
        CHECK(!r->body_size);
    char *body = ssk_json_encode(ssk_json_get(g->test, "upstreamResponse"));
    ssk_code code = emit(sink, 200, body);
    free(body);
    return code;
}
static void test_golden(void) {
    ssk_json *root = fixture("providers.json");
    const ssk_json *cases = ssk_json_get(root, "cases");
    CHECK(cases->count == 24);
    for (size_t i = 0; i < cases->count; i++) {
        const ssk_json *test = cases->items[i];
        const char *id = ssk_json_string(ssk_json_get(test, "provider"));
        golden_context g = {test, 0};
        const ssk_json *config = ssk_json_get(test, "providerOptions");
        char *settings = config ? ssk_json_encode(config)
                         : !strcmp(id, "searxng")
                             ? ssk_strdup("{\"baseUrl\":\"https://searxng.example\"}")
                             : NULL;
        ssk_client *c = client(id, NULL, golden, &g, settings);
        free(settings);
        const ssk_capabilities *cap = ssk_provider_capabilities(id);
        const ssk_json *cp = ssk_json_get(test, "capabilities");
        CHECK(cap);
        CHECK(cap->domain_filters == ssk_json_bool(ssk_json_get(cp, "domainFilters")));
        CHECK(cap->max_include_domains ==
              (size_t)ssk_json_number(ssk_json_get(cp, "maxIncludeDomains")));
        CHECK(cap->max_exclude_domains ==
              (size_t)ssk_json_number(ssk_json_get(cp, "maxExcludeDomains")));
        char *request = ssk_json_encode(ssk_json_get(test, "request"));
        ssk_response *r = NULL;
        ssk_error *e = NULL;
        ssk_call_options o = options();
        ssk_code code = ssk_search(c, request, &o, &r, &e);
        if (code)
            fprintf(stderr, "golden %s: %s\n", ssk_json_string(ssk_json_get(test, "name")),
                    ssk_code_name(code));
        CHECK(code == SSK_OK);
        CHECK(g.calls == 1 && r && !e);
        const ssk_json *want = ssk_json_get(test, "response"), *actual = ssk_response_json(r);
        const char *keys[] = {"results", "usage", "warnings"};
        for (size_t k = 0; k < 3; k++) {
            if (!equal(ssk_json_get(actual, keys[k]), ssk_json_get(want, keys[k]))) {
                char *a = ssk_json_encode(actual), *w = ssk_json_encode(want);
                fprintf(stderr, "response mismatch %s\nactual %s\nexpect %s\n", id, a, w);
                free(a);
                free(w);
            }
            CHECK(equal(ssk_json_get(actual, keys[k]), ssk_json_get(want, keys[k])));
        }
        CHECK(ssk__jeq(ssk_json_get(actual, "provider"), id));
        CHECK(ssk_json_size(ssk_json_get(actual, "attempts")) == 1);
        free(request);
        ssk_response_free(r);
        ssk_client_free(c);
    }
    ssk_json_free(root);
    puts("24 normalized provider golden cases passed");
}
static void test_requests(void) {
    ssk_json *root = fixture("request-cases.json");
    const ssk_json *valid = ssk_json_get(root, "valid"), *invalid = ssk_json_get(root, "invalid");
    for (size_t i = 0; i < valid->count; i++) {
        char *text = ssk_json_encode(ssk_json_get(valid->items[i], "input"));
        ssk_json *out = NULL;
        CHECK(ssk_request_normalize(text, &out) == SSK_OK);
        CHECK(equal(out, ssk_json_get(valid->items[i], "normalized")));
        free(text);
        ssk_json_free(out);
    }
    for (size_t i = 0; i < invalid->count; i++) {
        char *text = ssk_json_encode(ssk_json_get(invalid->items[i], "input"));
        ssk_json *out = NULL;
        CHECK(ssk_request_normalize(text, &out) == SSK_INVALID_REQUEST);
        CHECK(!out);
        free(text);
    }
    ssk_json *out = NULL;
    CHECK(ssk_request_normalize("{\"query\":\"\\u2003\\ufeff\"}", &out) == SSK_INVALID_REQUEST);
    CHECK(ssk_request_normalize("{\"query\":\"\\u0000\"}", &out) == SSK_INVALID_REQUEST);
    ssk_json_free(root);
}
static void test_json(void) {
    const char *bad[] = {"",
                         " ",
                         "{",
                         "[1,]",
                         "{\"a\":1,}",
                         "01",
                         "-01",
                         "1.",
                         ".1",
                         "1e",
                         "1e9999",
                         "NaN",
                         "true false",
                         "{\"a\":1,\"a\":2}",
                         "\"\\uD800\"",
                         "\"\\uDC00\"",
                         "\"\\uD800\\u0041\"",
                         "\"\\x41\"",
                         "\"\n\"",
                         "{\"\\u0000\":0}",
                         "\"\xc0\xaf\"",
                         "\"\xed\xa0\x80\"",
                         "\"\xf4\x90\x80\x80\"",
                         "\"\xf0\x9f\x98\""};
    for (size_t i = 0; i < sizeof(bad) / sizeof(bad[0]); i++) {
        ssk_json *j = (ssk_json *)(uintptr_t)1;
        CHECK(ssk_json_parse(bad[i], strlen(bad[i]), &j) == SSK_INVALID_RESPONSE);
        CHECK(!j);
    }
    ssk_json *j = parse("{\"x\":[null,true,false,-1.5e2,\"\\uD83D\\uDE00\\u0000x\"]}");
    const ssk_json *s = ssk_json_at(ssk_json_get(j, "x"), 4);
    CHECK(ssk_json_string_length(s) == 6);
    char *encoded = ssk_json_encode(j);
    ssk_json *copy = parse(encoded);
    CHECK(equal(j, copy));
    free(encoded);
    ssk_json_free(copy);
    ssk_json_free(j);
    char depth[160];
    memset(depth, '[', 70);
    memset(depth + 70, ']', 70);
    CHECK(ssk_json_parse(depth, 140, &j) == SSK_INVALID_RESPONSE);
    unsigned char *large = malloc(SSK_DEFAULT_MAX_BYTES + 1);
    CHECK(large);
    memset(large, ' ', SSK_DEFAULT_MAX_BYTES + 1);
    CHECK(ssk_json_parse(large, SSK_DEFAULT_MAX_BYTES + 1, &j) == SSK_INVALID_RESPONSE);
    free(large);
    uint32_t state = 12345;
    for (size_t i = 0; i < 10000; i++) {
        unsigned char bytes[160];
        size_t n = i % 160;
        for (size_t k = 0; k < n; k++) {
            state = state * 1664525u + 1013904223u;
            bytes[k] = (unsigned char)(state >> 24);
        }
        ssk_code c = ssk_json_parse(bytes, n, &j);
        if (!c) {
            char *a = ssk_json_encode(j);
            ssk_json *b = parse(a);
            CHECK(equal(j, b));
            free(a);
            ssk_json_free(j);
            ssk_json_free(b);
        }
    }
    char *text = read_file("search-success.json");
    for (size_t i = 1; i < strlen(text); i++) {
        ssk_json *v = NULL;
        ssk_code code = ssk_json_parse(text, i, &v);
        if (!code)
            CHECK(i >= strlen(text) - 2);
        ssk_json_free(v);
    }
    free(text);
}

typedef struct {
    const char *body;
    int status, calls;
    const char *protocol, *retry;
    unsigned sleep_ms;
    ssk_code failure;
    ssk_cancel *trigger;
} mock;
static ssk_code mock_transport(void *ctx, const ssk_http_request *r, ssk_sink *s) {
    mock *m = ctx;
    m->calls++;
    if (m->trigger)
        ssk_cancel_trigger(m->trigger);
    if (m->sleep_ms) {
        struct timespec t = {(time_t)(m->sleep_ms / 1000), (long)(m->sleep_ms % 1000) * 1000000};
        nanosleep(&t, NULL);
    }
    if (m->failure)
        return m->failure;
    ssk_code c = ssk_sink_status(s, m->status ? m->status : 200);
    if (c)
        return c;
    if (m->protocol) {
        c = ssk_sink_header(s, "X-SearchSDK-Protocol", m->protocol);
        if (c)
            return c;
    }
    if (m->retry) {
        c = ssk_sink_header(s, "Retry-After", m->retry);
        if (c)
            return c;
    }
    (void)r;
    return m->body ? ssk_sink_write(s, m->body, strlen(m->body)) : SSK_OK;
}
static void assert_error(ssk_client *c, mock *m, ssk_code want, const ssk_call_options *o) {
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    ssk_code code = ssk_search(c, "{\"query\":\"secret-query\"}", o, &r, &e);
    if (code != want)
        fprintf(stderr, "error actual %s expected %s\n", ssk_code_name(code), ssk_code_name(want));
    CHECK(code == want && !r && e);
    CHECK(!strstr(ssk_code_message(code), "secret"));
    char *a = ssk_json_encode(ssk_error_attempts(e));
    CHECK(a && !strstr(a, "fixture-key") && !strstr(a, "secret-query") && !strstr(a, "sensitive"));
    free(a);
    ssk_error_free(e);
    (void)m;
}
static void test_gateway(void) {
    char *success = read_file("search-success.json");
    mock m = {.body = success, .status = 200, .protocol = "1"};
    ssk_client *c = client(NULL, "https://gateway.example.test/exact", mock_transport, &m, NULL);
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    ssk_call_options o = options();
    CHECK(ssk_search(c, "{\"query\":\"x\"}", &o, &r, &e) == SSK_OK);
    ssk_json *want = parse(success);
    CHECK(equal(ssk_response_json(r), want));
    ssk_response_free(r);
    ssk_json_free(want);
    m.protocol = "2";
    assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
    m.protocol = NULL;
    m.body = "{";
    assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
    ssk_json *errors = fixture("search-errors.json");
    for (size_t i = 0; i < errors->count; i++) {
        m.status = (int)ssk_json_number(ssk_json_get(errors->items[i], "httpStatus"));
        char *body = ssk_json_encode(ssk_json_get(errors->items[i], "body"));
        m.body = body;
        const ssk_json *name =
            ssk_json_get(ssk_json_get(ssk_json_get(errors->items[i], "body"), "error"), "code");
        ssk_code code = 1;
        while (code <= SSK_PROVIDER_ERROR && !ssk__jeq(name, ssk_code_name(code)))
            code++;
        assert_error(c, &m, code, &o);
        free(body);
    }
    ssk_json_free(errors);
    int statuses[] = {401, 402, 403, 432, 433, 429, 408, 500, 503, 302, 400};
    ssk_code codes[] = {SSK_AUTH,        SSK_AUTH,           SSK_AUTH,          SSK_AUTH,
                        SSK_AUTH,        SSK_RATE_LIMIT,     SSK_UNAVAILABLE,   SSK_UNAVAILABLE,
                        SSK_UNAVAILABLE, SSK_PROVIDER_ERROR, SSK_PROVIDER_ERROR};
    for (size_t i = 0; i < 11; i++) {
        m.status = statuses[i];
        m.body = "sensitive fixture-key secret-query";
        assert_error(c, &m, codes[i], &o);
    }
    m.status = 429;
    m.retry = "1.25";
    m.body = "{}";
    CHECK(ssk_search(c, "{\"query\":\"x\"}", &o, &r, &e) == SSK_RATE_LIMIT);
    CHECK(ssk_error_retry_after_ms(e) == 1250);
    ssk_error_free(e);
    m.retry = NULL;
    m.status = 200;
    m.body = success;
    ssk_json *original = parse(success);
    const char *bad_fields[] = {"provider", "results", "usage", "warnings", "attempts"};
    for (size_t i = 0; i < 5; i++) {
        ssk_json *j = ssk__jclone(original);
        CHECK(ssk__jset(j, bad_fields[i], ssk__jnum(7)));
        char *text = ssk_json_encode(j);
        m.body = text;
        assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
        free(text);
        ssk_json_free(j);
    }
    const char *urls[] = {
        "javascript:alert(1)",         "https://user:pass@example.com/x", "https:///x",
        "https://example.com:99999/x", "https://example.com\\evil/x",     "https://example.com/\n"};
    for (size_t i = 0; i < 6; i++) {
        ssk_json *j = ssk__jclone(original),
                 *row = (ssk_json *)ssk_json_at(ssk_json_get(j, "results"), 0);
        CHECK(ssk__jset(row, "url", ssk__jstr(urls[i])));
        char *text = ssk_json_encode(j);
        m.body = text;
        assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
        free(text);
        ssk_json_free(j);
    }
    ssk_json_free(original);
    m.body = success;
    ssk_cancel *cancel = ssk_cancel_new();
    o.cancel = cancel;
    ssk_cancel_trigger(cancel);
    int before = m.calls;
    assert_error(c, &m, SSK_ABORTED, &o);
    CHECK(m.calls == before);
    ssk_cancel_free(cancel);
    o.cancel = NULL;
    m.sleep_ms = 15;
    o.timeout_ms = 2;
    assert_error(c, &m, SSK_TIMEOUT, &o);
    m.sleep_ms = 0;
    o.timeout_ms = 0;
    ssk_client_free(c);
    ssk_config cfg;
    ssk_config_init(&cfg);
    cfg.gateway_url = "https://gateway.example.test";
    cfg.transport = mock_transport;
    cfg.transport_context = &m;
    cfg.max_response_bytes = 16;
    CHECK(ssk_client_new(&cfg, &c, NULL) == SSK_OK);
    assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
    ssk_client_free(c);
    const char *bad[] = {
        "http://localhost",       "https://u:p@example.test", "https://example.test?key=secret",
        "https://example.test#x", "https://example.test/\\x", "https://example.test:\n"};
    for (size_t i = 0; i < 6; i++) {
        cfg.gateway_url = bad[i];
        CHECK(ssk_client_new(&cfg, &c, NULL) == SSK_CONFIGURATION && !c);
    }
    free(success);
}

typedef struct {
    const ssk_operation *op;
    int calls;
    const char *url, *body;
    int status;
} native_mock;
static ssk_code native_transport(void *ctx, const ssk_http_request *r, ssk_sink *s) {
    native_mock *m = ctx;
    const ssk_operation *op = m->op;
    m->calls++;
    CHECK(!strcmp(r->method, op->method));
    CHECK(!strncmp(r->url, op->base_url, strlen(op->base_url)));
    CHECK(!strstr(r->url, "/../"));
    if (m->url) {
        if (strcmp(r->url, m->url))
            fprintf(stderr, "native URL %s != %s\n", r->url, m->url);
        CHECK(!strcmp(r->url, m->url));
    }
    if (m->body) {
        CHECK(r->body_size == strlen(m->body));
        CHECK(!memcmp(r->body, m->body, r->body_size));
    }
    if (strstr(op->base_url, "logos.context.dev") || strstr(op->base_url, "x402.tavily.com")) {
        CHECK(!header(r, "Authorization") && !header(r, "X-API-Key"));
    }
    ssk_json *metadata = parse(op->metadata_json);
    if (ssk_json_bool(ssk_json_get(metadata, "stream"))) {
        ssk_json *body = NULL;
        CHECK(ssk_json_parse(r->body, r->body_size, &body) == SSK_OK);
        const ssk_json *value = ssk_json_get(body, "stream");
        CHECK(ssk_json_type(value) == SSK_JSON_BOOL);
        CHECK(ssk_json_bool(value) == ssk_json_bool(ssk_json_get(metadata, "streamValue")));
        ssk_json_free(body);
    }
    ssk_json_free(metadata);
    if (m->status)
        return emit(s, m->status, "sensitive fixture-key");
    if (!strcmp(op->response_mode, "bytes") || !strcmp(op->response_mode, "raw")) {
        const unsigned char bytes[] = {0, 255, 17, 3};
        CHECK(ssk_sink_status(s, 200) == SSK_OK);
        CHECK(ssk_sink_header(s, "X-Public-Test", "yes") == SSK_OK);
        return !strcmp(op->method, "HEAD") ? SSK_OK : ssk_sink_write(s, bytes, sizeof(bytes));
    }
    if (!strcmp(op->response_mode, "sse")) {
        CHECK(header(r, "Accept") && !strcmp(header(r, "Accept"), "text/event-stream"));
        return emit(s, 200,
                    "id: first\r\nevent: result\r\ndata: first\r\ndata: second\r\nretry: "
                    "42\r\n\r\ndata: end\n\n");
    }
    return emit(s, 200,
                !strcmp(op->response_mode, "empty") || !strcmp(op->name, "revokeAuthToken") ? ""
                : !strcmp(op->response_mode, "text") ? "native text"
                                                     : "{\"native\":true}");
}
static ssk_json *param_value(const ssk_json *p) {
    const ssk_json *en = ssk_json_get(p, "enum");
    if (en && en->count)
        return ssk__jclone(en->items[0]);
    const ssk_json *t = ssk_json_get(p, "type");
    if (ssk__jeq(t, "number") || ssk__jeq(t, "integer"))
        return ssk__jnum(1);
    if (ssk__jeq(t, "boolean"))
        return ssk__jbool(1);
    if (ssk__jeq(t, "array")) {
        ssk_json *a = ssk__jnew(SSK_JSON_ARRAY);
        CHECK(ssk__jpush(a, ssk__jstr("one")));
        return a;
    }
    return ssk__jstr("one");
}
static char *operation_input(const ssk_operation *op, int *raw) {
    ssk_json *m = parse(op->metadata_json), *input = ssk__jnew(SSK_JSON_OBJECT);
    const ssk_json *params = ssk_json_get(m, "parameters");
    for (size_t i = 0; i < params->count; i++) {
        const ssk_json *p = params->items[i];
        if (!ssk_json_bool(ssk_json_get(p, "required")))
            continue;
        const char *where = ssk_json_string(ssk_json_get(p, "in"));
        if (!strcmp(where, "header"))
            where = "headers";
        if (!ssk_json_get(input, where))
            CHECK(ssk__jset(input, where, ssk__jnew(SSK_JSON_OBJECT)));
        CHECK(ssk__jset((ssk_json *)ssk_json_get(input, where),
                        ssk_json_string(ssk_json_get(p, "name")), param_value(p)));
    }
    *raw = ssk__jeq(ssk_json_get(m, "bodyMode"), "raw");
    if (ssk__jeq(ssk_json_get(m, "bodyMode"), "json")) {
        ssk_json *b = ssk__jnew(SSK_JSON_OBJECT);
        if (!strcmp(op->provider, "exa") && !strcmp(op->name, "searchStream"))
            CHECK(ssk__jset(b, "outputSchema", ssk__jnew(SSK_JSON_OBJECT)));
        CHECK(ssk__jset(input, "body", b));
    }
    if (!strcmp(op->provider, "serpapi") &&
        (!strcmp(op->name, "google") || !strncmp(op->name, "extract", 7))) {
        if (!ssk_json_get(input, "query"))
            CHECK(ssk__jset(input, "query", ssk__jnew(SSK_JSON_OBJECT)));
        CHECK(ssk__jset((ssk_json *)ssk_json_get(input, "query"),
                        !strcmp(op->name, "google") ? "q" : "url",
                        ssk__jstr("https://example.org")));
    }
    if (*raw) {
        if (!ssk_json_get(input, "headers"))
            CHECK(ssk__jset(input, "headers", ssk__jnew(SSK_JSON_OBJECT)));
        CHECK(ssk__jset((ssk_json *)ssk_json_get(input, "headers"), "Content-Type",
                        ssk__jstr("multipart/form-data; boundary=fixture")));
    }
    char *text = ssk_json_encode(input);
    ssk_json_free(input);
    ssk_json_free(m);
    return text;
}
static int events(void *ctx, const char *event, const char *data, const char *id, int64_t retry) {
    int *count = ctx;
    if (!*count) {
        CHECK(!strcmp(event, "result"));
        CHECK(!strcmp(data, "first\nsecond"));
        CHECK(id && !strcmp(id, "first"));
        CHECK(retry == 42);
    } else {
        CHECK(!strcmp(event, "message"));
        CHECK(!strcmp(data, "end"));
        CHECK(id && !strcmp(id, "first"));
    }
    (*count)++;
    return 0;
}
static void test_native(void) {
    CHECK(ssk_operation_count() == 493);
    CHECK(ssk_provider_count() == 14);
    CHECK(ssk_op_context_headLogo() == ssk_operation_find("context", "headLogo"));
    CHECK(!ssk_operation_find("unknown", "search"));
    CHECK(!ssk_operation_at(493));
    static const char multipart[] =
        "--fixture\r\nContent-Disposition: form-data; name=\"image\"; "
        "filename=\"fixture.bin\"\r\nContent-Type: application/octet-stream\r\n\r\nfixture "
        "bytes\r\n--fixture--\r\n";
    for (size_t i = 0; i < ssk_operation_count(); i++) {
        const ssk_operation *op = ssk_operation_at(i);
        native_mock m = {.op = op};
        ssk_client *c = client(op->provider, NULL, native_transport, &m, NULL);
        int raw = 0;
        char *input = operation_input(op, &raw);
        ssk_call_options o = options();
        ssk_response *r = NULL;
        ssk_error *e = NULL;
        ssk_code code = ssk_native_call(c, op, input, raw ? multipart : NULL,
                                        raw ? sizeof(multipart) - 1 : 0, &o, &r, &e);
        if (code)
            fprintf(stderr, "native %s.%s failed: %s; %s\n", op->provider, op->name,
                    ssk_code_name(code), input);
        CHECK(code == SSK_OK && r && !e);
        CHECK(m.calls == (!strcmp(op->response_mode, "embedding-url") ? 0 : 1));
        if (!strcmp(op->response_mode, "json"))
            CHECK(ssk_json_bool(ssk_json_get(ssk_response_json(r), "native")));
        if (!strcmp(op->response_mode, "sse")) {
            int count = 0;
            CHECK(ssk_response_sse(r, events, &count) == SSK_OK);
            CHECK(count == 2);
        }
        ssk_response_free(r);
        ssk_client_free(c);
        free(input);
    }
    const ssk_operation *op = ssk_operation_find("exa", "getWebset");
    CHECK(op);
    native_mock m = {.op = op, .url = "https://api.exa.ai/websets/v0/websets/a%2Fb%3Fc%23d%25"};
    ssk_client *c = client("exa", NULL, native_transport, &m, NULL);
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    ssk_call_options o = options();
    CHECK(ssk_native_call(c, op, "{\"path\":{\"id\":\"a/b?c#d%\"}}", NULL, 0, &o, &r, &e) ==
          SSK_OK);
    ssk_response_free(r);
    CHECK(ssk_native_call(c, op, "{\"path\":{\"id\":\"..\"}}", NULL, 0, &o, &r, &e) ==
          SSK_INVALID_REQUEST);
    ssk_error_free(e);
    ssk_operation forged = *op;
    forged.base_url = "https://attacker.example";
    CHECK(ssk_native_call(c, &forged, "{}", NULL, 0, &o, &r, &e) == SSK_CONFIGURATION);
    ssk_error_free(e);
    CHECK(ssk_native_call(c, op,
                          "{\"path\":{\"id\":\"a\"},\"headers\":{\"Authorization\":\"sensitive\"}}",
                          NULL, 0, &o, &r, &e) == SSK_INVALID_REQUEST);
    ssk_error_free(e);
    ssk_client_free(c);
    op = ssk_operation_find("brave", "search");
    m = (native_mock){.op = op,
                      .url = "https://api.search.brave.com/res/v1/web/"
                             "search?q=a%20%26%2B%3F&result_filter=web%2Cnews"};
    c = client("brave", NULL, native_transport, &m, NULL);
    CHECK(ssk_native_call(c, op,
                          "{\"query\":{\"q\":\"a &+?\",\"result_filter\":[\"web\",\"news\"]}}",
                          NULL, 0, &o, &r, &e) == SSK_OK);
    ssk_response_free(r);
    ssk_client_free(c);
    op = ssk_operation_find("tavily", "paidSearch");
    m = (native_mock){.op = op, .status = 503};
    ssk_config cfg;
    ssk_config_init(&cfg);
    cfg.provider = "tavily";
    cfg.transport = native_transport;
    cfg.transport_context = &m;
    cfg.max_retries = 5;
    CHECK(ssk_client_new(&cfg, &c, NULL) == SSK_OK);
    CHECK(ssk_native_call(c, op,
                          "{\"body\":{\"query\":\"x\"},\"headers\":{\"PAYMENT-SIGNATURE\":"
                          "\"external-signature\"}}",
                          NULL, 0, &o, &r, &e) == SSK_UNAVAILABLE);
    CHECK(m.calls == 1);
    ssk_error_free(e);
    ssk_client_free(c);
    puts("493 native operation dispatches and mode checks passed");
}
static ssk_code retry_transport(void *ctx, const ssk_http_request *r, ssk_sink *s) {
    mock *m = ctx;
    m->calls++;
    (void)r;
    return m->calls == 1 ? emit(s, 503, "sensitive") : emit(s, 200, "{\"results\":[]}");
}
static void test_reliability(void) {
    mock m = {0};
    ssk_config cfg;
    ssk_config_init(&cfg);
    cfg.provider = "exa";
    cfg.transport = retry_transport;
    cfg.transport_context = &m;
    cfg.max_retries = 1;
    cfg.retry_delay_ms = 1;
    ssk_client *c = NULL;
    CHECK(ssk_client_new(&cfg, &c, NULL) == SSK_OK);
    ssk_call_options o = options();
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    CHECK(ssk_search(c, "{\"query\":\"x\"}", &o, &r, &e) == SSK_OK);
    CHECK(m.calls == 2);
    CHECK(ssk_json_size(ssk_json_get(ssk_response_json(r), "attempts")) == 2);
    ssk_response_free(r);
    ssk_client_free(c);
    mock a = {.status = 503, .body = "sensitive"}, b = {.body = "{\"results\":[]}"};
    ssk_client *first = client("exa", NULL, mock_transport, &a, NULL),
               *second = client("tavily", NULL, mock_transport, &b, NULL);
    const ssk_client *chain[] = {first, second};
    ssk_call_options opts[] = {options(), options()};
    CHECK(ssk_search_chain(chain, opts, 2, "{\"query\":\"x\"}", &r, &e) == SSK_OK);
    CHECK(a.calls == 1 && b.calls == 1);
    CHECK(ssk__jeq(ssk_json_get(ssk_response_json(r), "provider"), "tavily"));
    CHECK(ssk_json_size(ssk_json_get(ssk_response_json(r), "warnings")) == 1);
    CHECK(ssk_json_size(ssk_json_get(ssk_response_json(r), "attempts")) == 2);
    ssk_response_free(r);
    a.status = 401;
    CHECK(ssk_search_chain(chain, opts, 2, "{\"query\":\"x\"}", &r, &e) == SSK_AUTH);
    CHECK(b.calls == 1);
    ssk_error_free(e);
    ssk_client *brave = client("brave", NULL, mock_transport, &b, NULL);
    const ssk_client *badchain[] = {first, brave};
    int before = a.calls;
    CHECK(ssk_search_chain(badchain, opts, 2,
                           "{\"query\":\"x\",\"includeDomains\":[\"example.com\"]}", &r,
                           &e) == SSK_UNSUPPORTED_OPTION);
    CHECK(a.calls == before);
    ssk_error_free(e);
    ssk_client_free(brave);
    ssk_client_free(first);
    ssk_client_free(second);
    mock slow = {.body = "{\"results\":[]}", .sleep_ms = 10};
    cfg.transport = mock_transport;
    cfg.transport_context = &slow;
    cfg.max_retries = 0;
    cfg.attempt_timeout_ms = 2;
    CHECK(ssk_client_new(&cfg, &c, NULL) == SSK_OK);
    assert_error(c, &slow, SSK_ATTEMPT_TIMEOUT, &o);
    ssk_client_free(c);
    mock rate = {.status = 429, .retry = "10", .body = "sensitive"};
    cfg.transport_context = &rate;
    cfg.max_retries = 2;
    cfg.attempt_timeout_ms = 0;
    cfg.timeout_ms = 20;
    CHECK(ssk_client_new(&cfg, &c, NULL) == SSK_OK);
    assert_error(c, &rate, SSK_TIMEOUT, &o);
    CHECK(rate.calls == 1);
    ssk_client_free(c);
    ssk_cancel *cancel = ssk_cancel_new();
    mock cancel_m = {.body = "{\"results\":[]}", .trigger = cancel};
    c = client("exa", NULL, mock_transport, &cancel_m, NULL);
    o.cancel = cancel;
    assert_error(c, &cancel_m, SSK_ABORTED, &o);
    ssk_client_free(c);
    ssk_cancel_free(cancel);
}
typedef struct {
    pthread_mutex_t mutex;
    size_t active, maximum;
    const char *body;
} concurrent;
static ssk_code concurrent_transport(void *ctx, const ssk_http_request *r, ssk_sink *s) {
    concurrent *m = ctx;
    pthread_mutex_lock(&m->mutex);
    m->active++;
    if (m->active > m->maximum)
        m->maximum = m->active;
    pthread_mutex_unlock(&m->mutex);
    struct timespec t = {0, 2000000};
    nanosleep(&t, NULL);
    ssk_code code = emit(s, 200, m->body);
    pthread_mutex_lock(&m->mutex);
    m->active--;
    pthread_mutex_unlock(&m->mutex);
    (void)r;
    return code;
}
static void test_batch(void) {
    char *body = read_file("search-success.json");
    concurrent m = {PTHREAD_MUTEX_INITIALIZER, 0, 0, body};
    ssk_client *c = client(NULL, "https://gateway.example.test", concurrent_transport, &m, NULL);
    const char *requests[] = {"{\"query\":\"a\"}", "{}", "{\"query\":\"b\"}", "{\"query\":\"c\"}"};
    ssk_outcome *out = NULL;
    ssk_call_options o = options();
    CHECK(ssk_search_batch(c, requests, 4, 2, &o, &out) == SSK_OK);
    CHECK(out[0].code == SSK_OK && out[1].code == SSK_INVALID_REQUEST && out[2].code == SSK_OK &&
          out[3].code == SSK_OK);
    CHECK(m.maximum == 2 && m.active == 0);
    ssk_batch_free(out, 4);
    o.timeout_ms = 1;
    CHECK(ssk_search_batch(c, requests, 4, 1, &o, &out) == SSK_OK);
    CHECK(out[0].code == SSK_TIMEOUT && out[2].code == SSK_TIMEOUT && out[3].code == SSK_TIMEOUT);
    ssk_batch_free(out, 4);
    CHECK(ssk_search_batch(c, requests, 4, 0, &o, &out) == SSK_INVALID_REQUEST);
    ssk_client_free(c);
    pthread_mutex_destroy(&m.mutex);
    free(body);
}

typedef struct {
    int observed, callback_count, stop_after;
    const char *payload;
    int status;
} stream_fixture;
static int stream_event(void *context, const char *event, const char *data, const char *id,
                        int64_t retry) {
    stream_fixture *fixture = context;
    CHECK(!strcmp(event, "message"));
    CHECK(id && !strcmp(id, "unicode"));
    CHECK(retry == 25);
    if (!fixture->callback_count)
        CHECK(!strcmp(data, "ü first"));
    else
        CHECK(!strcmp(data, "second"));
    fixture->callback_count++;
    return fixture->stop_after && fixture->callback_count >= fixture->stop_after;
}
static ssk_code stream_fixture_transport(void *context, const ssk_http_request *request,
                                         ssk_sink *sink) {
    stream_fixture *fixture = context;
    CHECK(!strcmp(request->url, "https://api.tavily.com/research"));
    CHECK(ssk_sink_status(sink, fixture->status ? fixture->status : 200) == SSK_OK);
    CHECK(ssk_sink_header(sink, "Content-Type", "text/event-stream; charset=utf-8") == SSK_OK);
    for (size_t i = 0; fixture->payload[i]; i++) {
        ssk_code code = ssk_sink_write(sink, fixture->payload + i, 1);
        if (code)
            return code;
        if (fixture->callback_count && fixture->payload[i + 1])
            fixture->observed = 1;
    }
    return SSK_OK;
}
static void test_stream(void) {
    stream_fixture fixture = {.payload =
                                  "\xef\xbb\xbfid: unicode\r\nretry: 25\r\ndata: ü "
                                  "first\r\n\r\ndata: second\n\n:data comment\ndata: discarded"};
    ssk_client *c = client("tavily", NULL, stream_fixture_transport, &fixture, NULL);
    ssk_call_options o = options();
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    CHECK(ssk_native_stream(c, ssk_op_tavily_researchStream(), "{\"body\":{\"input\":\"x\"}}", &o,
                            stream_event, &fixture, &r, &e) == SSK_OK);
    CHECK(fixture.callback_count == 2 && fixture.observed);
    stream_fixture collected = {0};
    CHECK(ssk_response_sse(r, stream_event, &collected) == SSK_OK);
    CHECK(collected.callback_count == 2);
    ssk_response_free(r);
    fixture.callback_count = 0;
    fixture.stop_after = 1;
    CHECK(ssk_native_stream(c, ssk_op_tavily_researchStream(), "{\"body\":{}}", &o, stream_event,
                            &fixture, &r, &e) == SSK_ABORTED);
    CHECK(fixture.callback_count == 1 && !r);
    ssk_error_free(e);
    fixture.stop_after = 0;
    fixture.status = 503;
    fixture.callback_count = 0;
    CHECK(ssk_native_stream(c, ssk_op_tavily_researchStream(), "{\"body\":{}}", &o, stream_event,
                            &fixture, &r, &e) == SSK_UNAVAILABLE);
    CHECK(!fixture.callback_count);
    ssk_error_free(e);
    CHECK(ssk_native_stream(c, ssk_op_tavily_search(), "{\"body\":{}}", &o, stream_event, &fixture,
                            &r, &e) == SSK_UNSUPPORTED_OPTION);
    ssk_error_free(e);
    ssk_client_free(c);
}
static void test_malformed_provider(void) {
    for (size_t i = 0; i < ssk_provider_count(); i++) {
        const char *id = ssk_provider_at(i)->provider;
        mock m = {.body = "{}"};
        ssk_client *c =
            client(id, NULL, mock_transport, &m,
                   !strcmp(id, "searxng") ? "{\"baseUrl\":\"https://searxng.example\"}" : NULL);
        ssk_call_options o = options();
        assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
        m.body = "{\"results\":[";
        assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
        ssk_client_free(c);
    }
    char bad_escape[] = {'"', '\\', 0, '"'};
    ssk_json *json = NULL;
    CHECK(ssk_json_parse(bad_escape, sizeof(bad_escape), &json) == SSK_INVALID_RESPONSE);
    ssk_json *source = fixture("search-success.json");
    const char *fields[] = {"title", "snippet", "highlights", "score", "provenance"};
    for (size_t i = 0; i < 5; i++) {
        ssk_json *j = ssk__jclone(source),
                 *row = (ssk_json *)ssk_json_at(ssk_json_get(j, "results"), 0);
        CHECK(ssk__jset(row, fields[i], i == 3 ? ssk__jstr("NaN") : ssk__jnum(5)));
        char *text = ssk_json_encode(j);
        mock m = {.body = text};
        ssk_client *c = client(NULL, "https://gateway.example.test", mock_transport, &m, NULL);
        ssk_call_options o = options();
        assert_error(c, &m, SSK_INVALID_RESPONSE, &o);
        ssk_client_free(c);
        ssk_json_free(j);
        free(text);
    }
    ssk_json_free(source);
    mock m = {.body =
                  "{\"error\":{\"code\":\"rate_limit\",\"attempts\":[{\"provider\":\"safe\","
                  "\"startedAt\":\"2026-10-22T00:00:00Z\",\"durationMs\":0,\"outcome\":\"error\","
                  "\"code\":\"rate_limit\",\"private\":\"sensitive fixture-key secret-query\"}]}}",
              .status = 429};
    ssk_client *c = client(NULL, "https://gateway.example.test", mock_transport, &m, NULL);
    ssk_call_options o = options();
    assert_error(c, &m, SSK_RATE_LIMIT, &o);
    ssk_client_free(c);
    const ssk_operation *op = ssk_op_context_classifyNaics();
    native_mock native = {
        .op = op,
        .url = "https://api.context.dev/v1/"
               "web/naics?input=https%3A%2F%2Fexample.org&timeoutOpts%5Btimeout%5D=5"};
    c = client("context", NULL, native_transport, &native, NULL);
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    /* Independent bracket-query vector from retained source parameter metadata. */
    CHECK(ssk_native_call(
              c, op,
              "{\"query\":{\"input\":\"https://example.org\",\"timeoutOpts\":{\"timeout\":5}}}",
              NULL, 0, &o, &r, &e) == SSK_OK);
    ssk_response_free(r);
    ssk_client_free(c);
}

static void test_transport_edges(void) {
    CHECK(ssk__url_valid("HTTPS://example.org:0/path/ü", 0));
    CHECK(ssk__url_valid("https://[::1]:443/path", 1));
    CHECK(!ssk__url_valid("https://999.999/path", 0));
    CHECK(!ssk__url_valid("https://example.1/path", 0));
    CHECK(!ssk__url_valid("https://example.org/\xc2\xa0", 0));
    CHECK(!ssk__url_valid("https://example.org/\xc2\x85", 0));
    CHECK(ssk__timestamp_valid("2024-02-29T00:00:00Z"));
    CHECK(!ssk__timestamp_valid("2023-02-29T00:00:00Z"));
    CHECK(!ssk__timestamp_valid("0000-01-01T00:00:00Z"));
    mock rate = {.status = 429, .body = "sensitive", .retry = "9223372036854775.808"};
    ssk_client *c = client("exa", NULL, mock_transport, &rate, NULL);
    ssk_call_options o = options();
    ssk_response *r = NULL;
    ssk_error *e = NULL;
    CHECK(ssk_search(c, "{\"query\":\"x\"}", &o, &r, &e) == SSK_RATE_LIMIT);
    CHECK(ssk_error_retry_after_ms(e) == -1);
    ssk_error_free(e);
    rate.retry = "0.0001";
    CHECK(ssk_search(c, "{\"query\":\"x\"}", &o, &r, &e) == SSK_RATE_LIMIT);
    CHECK(ssk_error_retry_after_ms(e) == 1);
    ssk_error_free(e);
    ssk_client_free(c);
    const ssk_operation *op = ssk_op_wondersearch_searchDrive();
    native_mock native = {.op = op, .url = "https://api.wondersearch.ai/v1/drives/drive/search"};
    c = client("wondersearch", NULL, native_transport, &native, NULL);
    CHECK(ssk_native_call(c, op,
                          "{\"path\":{\"drive_id\":\"drive\"},\"body\":{},\"headers\":{"
                          "\"idempotency-key\":\"once\"}}",
                          NULL, 0, &o, &r, &e) == SSK_OK);
    ssk_response_free(r);
    ssk_client_free(c);
    op = ssk_op_serpapi_uploadImage();
    native = (native_mock){.op = op};
    c = client("serpapi", NULL, native_transport, &native, NULL);
    const char *input =
        "{\"headers\":{\"Content-Type\":\"multipart/form-data; boundary=fixture\"}}";
    const char *form =
        "--fixture\r\nContent-Disposition: form-data; name=image\r\n\r\nbytes\r\n--fixture--\r\n";
    CHECK(ssk_native_call(c, op, input, form, strlen(form), &o, &r, &e) == SSK_OK);
    ssk_response_free(r);
    form = "--fixture\r\nContent-Disposition: form-data; "
           "name=api_key\r\n\r\nsensitive\r\n--fixture\r\nContent-Disposition: form-data; "
           "name=image\r\n\r\nbytes\r\n--fixture--\r\n";
    int before = native.calls;
    CHECK(ssk_native_call(c, op, input, form, strlen(form), &o, &r, &e) == SSK_INVALID_REQUEST);
    CHECK(native.calls == before);
    ssk_error_free(e);
    ssk_client_free(c);
}
int main(void) {
    test_json();
    test_requests();
    test_golden();
    test_gateway();
    test_native();
    test_reliability();
    test_batch();
    test_stream();
    test_malformed_provider();
    test_transport_edges();
    printf("C deterministic suite passed (%zu assertions)\n", assertions);
    return 0;
}
