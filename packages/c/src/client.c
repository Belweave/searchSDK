#define _POSIX_C_SOURCE 200809L
#include "internal.h"
#include <ctype.h>
#include <math.h>
#include <pthread.h>
#include <stdio.h>
#include <strings.h>
#include <time.h>

void ssk_config_init(ssk_config *c) {
    if (c) {
        memset(c, 0, sizeof(*c));
        c->struct_size = sizeof(*c);
    }
}
void ssk_call_options_init(ssk_call_options *o) {
    if (o) {
        memset(o, 0, sizeof(*o));
        o->struct_size = sizeof(*o);
    }
}
static int identifier(const char *s, size_t max, int spaces) {
    if (!s || !*s || strlen(s) > max || !isalpha((unsigned char)*s) || ((unsigned char)*s) >= 128)
        return 0;
    for (const unsigned char *p = (const unsigned char *)s; *p; p++)
        if (*p >= 128 || (!isalnum(*p) && *p != '_' && *p != '-' && !(spaces && *p == ' ')))
            return 0;
    return 1;
}
static int date_only(const ssk_json *v) {
    if (!ssk__jisstr(v) || v->length != 10)
        return 0;
    char s[32];
    snprintf(s, sizeof(s), "%sT00:00:00Z", v->text);
    return ssk__timestamp_valid(s);
}
static int valyu_settings(const ssk_json *s) {
    const char *fields[] = {"maxPrice",    "relevanceThreshold", "responseLength",
                            "fastMode",    "startDate",          "endDate",
                            "instructions"};
    if (!ssk__jfields(s, fields, 7))
        return 0;
    const ssk_json *v = ssk_json_get(s, "maxPrice");
    if (v && (!(ssk_json_number(v) > 0)))
        return 0;
    v = ssk_json_get(s, "relevanceThreshold");
    if (v && (!(ssk_json_number(v) >= 0) || v->number > 1))
        return 0;
    v = ssk_json_get(s, "responseLength");
    if (v && !ssk__jeq(v, "short") && !ssk__jeq(v, "medium") && !ssk__jeq(v, "large") &&
        !ssk__jeq(v, "max") &&
        !(v->type == SSK_JSON_NUMBER && v->number > 0 && v->number <= 9007199254740991.0 &&
          floor(v->number) == v->number))
        return 0;
    v = ssk_json_get(s, "fastMode");
    if (v && v->type != SSK_JSON_BOOL)
        return 0;
    const ssk_json *a = ssk_json_get(s, "startDate"), *b = ssk_json_get(s, "endDate");
    if ((a && !date_only(a)) || (b && !date_only(b)) || (a && b && strcmp(a->text, b->text) > 0))
        return 0;
    v = ssk_json_get(s, "instructions");
    if (v) {
        if (!ssk__jisstr(v) || ssk__utf16_length(v->text) > 500)
            return 0;
        ssk_json *q = ssk__jnew(SSK_JSON_OBJECT), *normalized = NULL;
        if (!q)
            return 0;
        int ok = ssk__jset(q, "query", ssk__jclone(v));
        char *text = ok ? ssk_json_encode(q) : NULL;
        ssk_json_free(q);
        ok = text && !ssk_request_normalize(text, &normalized);
        free(text);
        ssk_json_free(normalized);
        if (!ok)
            return 0;
    }
    return 1;
}
static int searx_settings(const ssk_json *s) {
    const char *fields[] = {"baseUrl",    "headers",   "language",
                            "safeSearch", "timeRange", "categories"};
    if (!ssk__jfields(s, fields, 6))
        return 0;
    const ssk_json *v = ssk_json_get(s, "baseUrl");
    if (!ssk__jisstr(v) || !ssk__url_valid(v->text, 1))
        return 0;
    v = ssk_json_get(s, "language");
    if (v && (!ssk__jisstr(v) || !identifier(v->text, 35, 0)))
        return 0;
    v = ssk_json_get(s, "safeSearch");
    if (v && !(v->type == SSK_JSON_NUMBER && v->number >= 0 && v->number <= 2 &&
               floor(v->number) == v->number))
        return 0;
    v = ssk_json_get(s, "timeRange");
    if (v && !ssk__jeq(v, "day") && !ssk__jeq(v, "month") && !ssk__jeq(v, "year"))
        return 0;
    v = ssk_json_get(s, "categories");
    if (v) {
        if (v->type != SSK_JSON_ARRAY || !v->count || v->count > 20)
            return 0;
        for (size_t i = 0; i < v->count; i++)
            if (!ssk__jisstr(v->items[i]) || !identifier(v->items[i]->text, 64, 1))
                return 0;
    }
    v = ssk_json_get(s, "headers");
    if (v) {
        if (v->type != SSK_JSON_OBJECT || v->count > 32)
            return 0;
        const char *blocked[] = {
            "host",   "cookie",       "connection",         "content-length", "transfer-encoding",
            "accept", "content-type", "proxy-authorization"};
        for (size_t i = 0; i < v->count; i++) {
            if (!ssk__jisstr(v->items[i]) ||
                !ssk__header_valid(v->items[i]->key, v->items[i]->text))
                return 0;
            for (size_t k = 0; k < 8; k++)
                if (!strcasecmp(v->items[i]->key, blocked[k]))
                    return 0;
        }
    }
    return 1;
}
ssk_code ssk_client_new(const ssk_config *config, ssk_client **out, ssk_error **error) {
    if (error)
        *error = NULL;
    if (!out)
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    *out = NULL;
    if (!config || config->struct_size != sizeof(*config) || !config->transport ||
        !!config->provider == !!config->gateway_url || config->max_retries > 8 ||
        config->max_response_bytes > SSK_MAX_REQUEST_BYTES)
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    if (config->gateway_url && (!ssk__url_valid(config->gateway_url, 1) || config->max_retries ||
                                config->provider_options_json))
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    if (config->provider) {
        int found = ssk_provider_capabilities(config->provider) != NULL;
        for (size_t i = 0; !found && i < ssk_operation_count(); i++)
            found = !strcmp(config->provider, ssk_operation_at(i)->provider);
        if (!found)
            return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    }
    ssk_client *c = calloc(1, sizeof(*c));
    if (!c)
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    c->provider = ssk_strdup(config->provider);
    c->gateway_url = ssk_strdup(config->gateway_url);
    c->transport = config->transport;
    c->context = config->transport_context;
    c->timeout_ms = config->timeout_ms ? config->timeout_ms : 10000;
    c->attempt_timeout_ms = config->attempt_timeout_ms;
    c->max_bytes = config->max_response_bytes ? config->max_response_bytes : SSK_DEFAULT_MAX_BYTES;
    c->max_retries = config->max_retries;
    c->retry_delay_ms = config->retry_delay_ms ? config->retry_delay_ms : 100;
    const char *s = config->provider_options_json ? config->provider_options_json : "{}";
    int ok = (!config->provider || c->provider) && (!config->gateway_url || c->gateway_url) &&
             !ssk_json_parse(s, strlen(s), &c->settings) && c->settings->type == SSK_JSON_OBJECT;
    if (ok && c->provider) {
        if (!strcmp(c->provider, "searxng"))
            ok = searx_settings(c->settings);
        else if (!strcmp(c->provider, "valyu"))
            ok = valyu_settings(c->settings);
        else
            ok = !c->settings->count;
    }
    if (!ok) {
        ssk_client_free(c);
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    }
    *out = c;
    return SSK_OK;
}
void ssk_client_free(ssk_client *c) {
    if (c) {
        free(c->provider);
        free(c->gateway_url);
        ssk_json_free(c->settings);
        free(c);
    }
}
static int options_valid(const ssk_call_options *o) {
    if (!o)
        return 1;
    if (o->struct_size != sizeof(*o) || (o->retrieved_at && !ssk__timestamp_valid(o->retrieved_at)))
        return 0;
    if (o->credential) {
        if (!*o->credential || strlen(o->credential) > 8192)
            return 0;
        for (const unsigned char *p = (const unsigned char *)o->credential; *p; p++)
            if (*p < 0x21 || *p > 0x7e)
                return 0;
    }
    return 1;
}
static int transient(ssk_code code) {
    return code == SSK_RATE_LIMIT || code == SSK_UNAVAILABLE || code == SSK_NETWORK ||
           code == SSK_ATTEMPT_TIMEOUT;
}
static ssk_code wait_retry(const ssk_call_options *o, uint64_t deadline, uint64_t delay) {
    uint64_t now = ssk_monotonic_ms();
    if (now >= deadline || delay >= deadline - now)
        return SSK_TIMEOUT;
    uint64_t until = now + delay;
    while ((now = ssk_monotonic_ms()) < until) {
        if (o && ssk_cancel_is_triggered(o->cancel))
            return SSK_ABORTED;
        uint64_t ms = until - now;
        if (ms > 10)
            ms = 10;
        struct timespec t = {0, (long)ms * 1000000};
        nanosleep(&t, NULL);
    }
    return SSK_OK;
}
static int add_attempt(ssk_json *a, const char *provider_id, const char *time, uint64_t start,
                       ssk_code code, int status, int64_t delay) {
    ssk_json *row = ssk__jnew(SSK_JSON_OBJECT);
    if (!row)
        return 0;
    int ok = ssk__jset(row, "provider", ssk__jstr(provider_id)) &&
             ssk__jset(row, "startedAt", ssk__jstr(time)) &&
             ssk__jset(row, "durationMs", ssk__jnum((double)(ssk_monotonic_ms() - start))) &&
             ssk__jset(row, "outcome", ssk__jstr(code ? "error" : "success"));
    if (ok && code)
        ok = ssk__jset(row, "code", ssk__jstr(ssk_code_name(code)));
    if (ok && status)
        ok = ssk__jset(row, "status", ssk__jnum(status));
    if (ok && delay >= 0)
        ok = ssk__jset(row, "retryAfterMs", ssk__jnum((double)delay));
    if (!ok) {
        ssk_json_free(row);
        return 0;
    }
    return ssk__jpush(a, row);
}
static int finish_json(ssk_response *r, ssk_json *json) {
    char *s = ssk_json_encode(json);
    if (!s)
        return 0;
    free(r->data);
    r->data = (unsigned char *)s;
    r->size = strlen(s);
    ssk_json_free(r->json);
    r->json = json;
    return 1;
}
ssk_code ssk__search_until(const ssk_client *c, const char *request, const ssk_call_options *o,
                           uint64_t deadline, ssk_response **out, ssk_error **error) {
    if (error)
        *error = NULL;
    if (!out)
        return ssk__fail(error, SSK_INVALID_REQUEST, 0, -1, NULL);
    *out = NULL;
    if (!c || !options_valid(o))
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    ssk_json *q = NULL, *attempts = ssk__jnew(SSK_JSON_ARRAY);
    ssk_response *r = NULL;
    ssk_error *err = NULL;
    ssk_code code = ssk_request_normalize(request, &q);
    if (code)
        goto done;
    code = ssk__validate_capabilities(c, q);
    if (code)
        goto done;
    if (!attempts) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    for (uint32_t retry = 0;; retry++) {
        uint64_t start = ssk_monotonic_ms();
        uint64_t attempt_deadline = deadline;
        if (!c->gateway_url && c->attempt_timeout_ms && start + c->attempt_timeout_ms < deadline)
            attempt_deadline = start + c->attempt_timeout_ms;
        char now[32];
        ssk__utc_now(now);
        ssk_http_request h = {0};
        h.deadline_ms = attempt_deadline;
        h.max_response_bytes = c->max_bytes;
        h.cancel = o ? o->cancel : NULL;
        ssk_header *headers = NULL;
        char *url = NULL, *body = NULL;
        if (c->gateway_url) {
            url = ssk_strdup(c->gateway_url);
            body = ssk_json_encode(q);
            h.method = "POST";
            int ok = url && body &&
                     ssk__header_add(&headers, &h.header_count, "Content-Type", "application/json");
            if (ok && o && o->credential) {
                ssk_buf auth = {0};
                ssk__buf_str(&auth, "Bearer ");
                ssk__buf_str(&auth, o->credential);
                char *s = ssk__buf_take(&auth);
                ok = s && ssk__header_add(&headers, &h.header_count, "Authorization", s);
                free(s);
            }
            code = ok ? SSK_OK : SSK_CONFIGURATION;
            h.url = url;
            h.body = (const unsigned char *)body;
            h.body_size = body ? strlen(body) : 0;
            h.headers = headers;
        } else
            code = ssk__provider_request(c, q, o ? o->credential : NULL, &h, &headers, &url, &body);
        if (!code)
            code = ssk__http_call(c, &h, &r, &err, c->gateway_url != NULL);
        ssk__free_headers(headers, h.header_count);
        free(url);
        free(body);
        if (code == SSK_TIMEOUT && attempt_deadline < deadline)
            code = SSK_ATTEMPT_TIMEOUT;
        if (!code) {
            ssk_json *parsed = NULL;
            code = ssk_json_parse(r->data, r->size, &parsed);
            if (!code && c->gateway_url) {
                const char *protocol = ssk_response_header(r, "X-SearchSDK-Protocol");
                if (r->status != 200 || (protocol && strcmp(protocol, "1")))
                    code = SSK_INVALID_RESPONSE;
                else
                    code = ssk__validate_response(parsed, 1);
                if (!code) {
                    ssk_json *hits = (ssk_json *)ssk_json_get(parsed, "results");
                    size_t limit = (size_t)ssk_json_number(ssk_json_get(q, "limit"));
                    while (hits->count > limit)
                        ssk_json_free(hits->items[--hits->count]);
                    if (!finish_json(r, parsed))
                        code = SSK_CONFIGURATION;
                    else
                        parsed = NULL;
                }
            } else if (!code) {
                ssk_json *normalized = NULL;
                const char *retrieved = o && o->retrieved_at ? o->retrieved_at : now;
                code = ssk__provider_response(c, parsed, retrieved,
                                              (size_t)ssk_json_number(ssk_json_get(q, "limit")),
                                              &normalized);
                if (!code) {
                    if (!finish_json(r, normalized)) {
                        ssk_json_free(normalized);
                        code = SSK_CONFIGURATION;
                    }
                }
            }
            ssk_json_free(parsed);
        }
        if (o && ssk_cancel_is_triggered(o->cancel))
            code = SSK_ABORTED;
        else if (ssk_monotonic_ms() >= deadline)
            code = SSK_TIMEOUT;
        else if (ssk_monotonic_ms() >= attempt_deadline)
            code = SSK_ATTEMPT_TIMEOUT;
        int status = r ? r->status : err ? err->status : 0;
        int64_t delay = err ? err->retry_after : -1;
        if (c->gateway_url) {
            if (code && err) {
                if (error) {
                    *error = err;
                    err = NULL;
                }
                goto done;
            }
            if (!code) {
                *out = r;
                r = NULL;
                goto done;
            }
            goto done;
        }
        if (!add_attempt(attempts, c->provider, now, start, code, status, delay)) {
            code = SSK_CONFIGURATION;
            goto done;
        }
        if (!code) {
            if (!ssk__jset(r->json, "provider", ssk__jstr(c->provider)) ||
                !ssk__jset(r->json, "attempts", ssk__jclone(attempts))) {
                code = SSK_CONFIGURATION;
                goto done;
            }
            ssk_json *final = r->json;
            r->json = NULL;
            if (!finish_json(r, final)) {
                ssk_json_free(final);
                code = SSK_CONFIGURATION;
                goto done;
            }
            *out = r;
            r = NULL;
            goto done;
        }
        ssk_response_free(r);
        r = NULL;
        if (!transient(code) || retry >= c->max_retries)
            goto done;
        ssk_error_free(err);
        err = NULL;
        uint64_t wait = (uint64_t)c->retry_delay_ms << retry;
        if (wait > 5000)
            wait = 5000;
        if (delay >= 0 && (uint64_t)delay > wait)
            wait = (uint64_t)delay;
        code = wait_retry(o, deadline, wait);
        if (code)
            goto done;
    }
done:
    if (code && (!error || !*error))
        ssk__fail(error, code, err ? err->status : 0, err ? err->retry_after : -1, attempts);
    ssk_error_free(err);
    ssk_response_free(r);
    ssk_json_free(q);
    ssk_json_free(attempts);
    return code;
}
ssk_code ssk_search(const ssk_client *c, const char *q, const ssk_call_options *o, ssk_response **r,
                    ssk_error **e) {
    uint64_t deadline =
        ssk_monotonic_ms() + (o && o->struct_size == sizeof(*o) && o->timeout_ms ? o->timeout_ms
                              : c                                                ? c->timeout_ms
                                                                                 : 10000);
    return ssk__search_until(c, q, o, deadline, r, e);
}
ssk_code ssk_search_chain(const ssk_client *const *clients, const ssk_call_options *options,
                          size_t n, const char *text, ssk_response **out, ssk_error **error) {
    uint64_t started = ssk_monotonic_ms();
    if (error)
        *error = NULL;
    if (!out)
        return ssk__fail(error, SSK_INVALID_REQUEST, 0, -1, NULL);
    *out = NULL;
    if (!clients || !n || n > 64)
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    ssk_json *q = NULL, *attempts = ssk__jnew(SSK_JSON_ARRAY);
    ssk_code code = ssk_request_normalize(text, &q);
    if (code)
        goto done;
    for (size_t i = 0; i < n; i++) {
        if (!clients[i] || clients[i]->gateway_url ||
            !options_valid(options ? options + i : NULL)) {
            code = SSK_CONFIGURATION;
            goto done;
        }
        code = ssk__validate_capabilities(clients[i], q);
        if (code)
            goto done;
    }
    uint64_t deadline =
        started + (options && options->timeout_ms ? options->timeout_ms : clients[0]->timeout_ms);
    for (size_t i = 0; i < n; i++) {
        ssk_error *err = NULL;
        ssk_response *r = NULL;
        code =
            ssk__search_until(clients[i], text, options ? options + i : NULL, deadline, &r, &err);
        const ssk_json *a = code ? ssk_error_attempts(err) : ssk_json_get(r->json, "attempts");
        for (size_t k = 0; a && k < a->count; k++)
            if (!ssk__jpush(attempts, ssk__jclone(a->items[k]))) {
                code = SSK_CONFIGURATION;
                break;
            }
        if (!code) {
            int ok = ssk__jset(r->json, "attempts", ssk__jclone(attempts));
            if (ok && i) {
                ssk_json *w = ssk__jnew(SSK_JSON_OBJECT);
                ok = w && ssk__jset(w, "code", ssk__jstr("fallback_used")) &&
                     ssk__jset(w, "provider", ssk__jstr(clients[i]->provider));
                if (ok)
                    ok = ssk__jpush((ssk_json *)ssk_json_get(r->json, "warnings"), w);
                else
                    ssk_json_free(w);
            }
            ssk_json *final = r->json;
            r->json = NULL;
            if (ok)
                ok = finish_json(r, final);
            if (!ok) {
                ssk_json_free(final);
                code = SSK_CONFIGURATION;
            } else {
                *out = r;
                r = NULL;
            }
        }
        if (code && (!transient(code) || i + 1 == n))
            ssk__fail(error, code, err ? err->status : 0, err ? err->retry_after : -1, attempts);
        ssk_error_free(err);
        ssk_response_free(r);
        if (!code || !transient(code))
            break;
    }
done:
    if (code && (!error || !*error))
        ssk__fail(error, code, 0, -1, attempts);
    ssk_json_free(q);
    ssk_json_free(attempts);
    return code;
}
typedef struct {
    const ssk_client *client;
    const char *const *requests;
    size_t count, next;
    const ssk_call_options *options;
    uint64_t deadline;
    ssk_outcome *out;
    pthread_mutex_t lock;
} batch;
static void *batch_worker(void *data) {
    batch *b = data;
    for (;;) {
        pthread_mutex_lock(&b->lock);
        size_t i = b->next++;
        pthread_mutex_unlock(&b->lock);
        if (i >= b->count)
            break;
        b->out[i].code = ssk__search_until(b->client, b->requests[i], b->options, b->deadline,
                                           &b->out[i].response, &b->out[i].error);
    }
    return NULL;
}
ssk_code ssk_search_batch(const ssk_client *c, const char *const *requests, size_t n,
                          size_t concurrency, const ssk_call_options *o, ssk_outcome **out) {
    if (!out)
        return SSK_INVALID_REQUEST;
    *out = NULL;
    if (!c || (!requests && n) || n > 4096 || !concurrency || concurrency > 64 || !options_valid(o))
        return SSK_INVALID_REQUEST;
    if (!n)
        return SSK_OK;
    ssk_outcome *results = calloc(n, sizeof(*results));
    if (!results)
        return SSK_CONFIGURATION;
    batch b = {c,       requests,
               n,       0,
               o,       ssk_monotonic_ms() + (o && o->timeout_ms ? o->timeout_ms : c->timeout_ms),
               results, PTHREAD_MUTEX_INITIALIZER};
    pthread_t threads[63];
    size_t spawned = 0;
    if (concurrency > n)
        concurrency = n;
    for (size_t i = 1; i < concurrency; i++)
        if (!pthread_create(&threads[spawned], NULL, batch_worker, &b))
            spawned++;
    batch_worker(&b);
    for (size_t i = 0; i < spawned; i++)
        pthread_join(threads[i], NULL);
    pthread_mutex_destroy(&b.lock);
    *out = results;
    return SSK_OK;
}
void ssk_batch_free(ssk_outcome *r, size_t n) {
    if (r) {
        for (size_t i = 0; i < n; i++) {
            ssk_response_free(r[i].response);
            ssk_error_free(r[i].error);
        }
        free(r);
    }
}
