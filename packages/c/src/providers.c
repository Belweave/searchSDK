#include "internal.h"
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <strings.h>

typedef struct {
    ssk_capabilities cap;
    const char *endpoint, *auth;
    int bearer;
    const char *rows, *snippet, *highlights, *score, *id, *usage_object, *usage_field, *unit;
} provider;
static const provider providers[] = {{{"exa", 1, 0, 1200, 1200, 0},
                                      "https://api.exa.ai/search",
                                      "x-api-key",
                                      0,
                                      "results",
                                      NULL,
                                      "highlights",
                                      "score",
                                      "requestId",
                                      "costDollars",
                                      "total",
                                      "usd"},
                                     {{"tavily", 1, 0, 300, 150, 0},
                                      "https://api.tavily.com/search",
                                      "Authorization",
                                      1,
                                      "results",
                                      "content",
                                      NULL,
                                      "score",
                                      "request_id",
                                      "usage",
                                      "credits",
                                      "credits"},
                                     {{"brave", 0, 0, 0, 0, 0},
                                      "https://api.search.brave.com/res/v1/web/search",
                                      "X-Subscription-Token",
                                      0,
                                      "results",
                                      "description",
                                      "extra_snippets",
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"context", 1, 0, 100, 100, 500},
                                      "https://api.context.dev/v1/web/search",
                                      "Authorization",
                                      1,
                                      "results",
                                      "description",
                                      NULL,
                                      NULL,
                                      "request_id",
                                      "key_metadata",
                                      "credits_consumed",
                                      "credits"},
                                     {{"tinyfish", 1, 0, 100, 100, 0},
                                      "https://api.search.tinyfish.ai/",
                                      "X-API-Key",
                                      0,
                                      "results",
                                      "snippet",
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"firecrawl", 1, 1, 100, 100, 500},
                                      "https://api.firecrawl.dev/v2/search",
                                      "Authorization",
                                      1,
                                      "web",
                                      "description",
                                      NULL,
                                      NULL,
                                      "id",
                                      NULL,
                                      "creditsUsed",
                                      "credits"},
                                     {{"parallel", 1, 1, 200, 200, 0},
                                      "https://api.parallel.ai/v1/search",
                                      "x-api-key",
                                      0,
                                      "results",
                                      NULL,
                                      "excerpts",
                                      NULL,
                                      "search_id",
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"perplexity", 1, 1, 20, 20, 0},
                                      "https://api.perplexity.ai/search",
                                      "Authorization",
                                      1,
                                      "results",
                                      "snippet",
                                      NULL,
                                      NULL,
                                      "id",
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"serper", 0, 0, 0, 0, 0},
                                      "https://google.serper.dev/search",
                                      "X-API-KEY",
                                      0,
                                      "organic",
                                      "snippet",
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL,
                                      "credits",
                                      "credits"},
                                     {{"serpapi", 0, 0, 0, 0, 0},
                                      "https://serpapi.com/search.json",
                                      NULL,
                                      0,
                                      "organic_results",
                                      "snippet",
                                      NULL,
                                      NULL,
                                      "id",
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"you", 1, 1, 500, 5000, 0},
                                      "https://ydc-index.io/v1/search",
                                      "X-API-Key",
                                      0,
                                      "web",
                                      "description",
                                      NULL,
                                      NULL,
                                      "search_uuid",
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"linkup", 1, 0, 100, 50, 0},
                                      "https://api.linkup.so/v1/search",
                                      "Authorization",
                                      1,
                                      "results",
                                      "content",
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL},
                                     {{"valyu", 1, 0, 100, 100, 0},
                                      "https://api.valyu.ai/v1/search",
                                      "X-API-Key",
                                      0,
                                      "results",
                                      "content",
                                      NULL,
                                      "relevance_score",
                                      "tx_id",
                                      NULL,
                                      "total_deduction_dollars",
                                      "usd"},
                                     {{"searxng", 0, 0, 0, 0, 0},
                                      NULL,
                                      NULL,
                                      0,
                                      "results",
                                      "content",
                                      NULL,
                                      "score",
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL}};
size_t ssk_provider_count(void) {
    return sizeof(providers) / sizeof(providers[0]);
}
const ssk_capabilities *ssk_provider_at(size_t i) {
    return i < ssk_provider_count() ? &providers[i].cap : NULL;
}
const ssk_capabilities *ssk_provider_capabilities(const char *id) {
    if (id)
        for (size_t i = 0; i < ssk_provider_count(); i++)
            if (!strcmp(id, providers[i].cap.provider))
                return &providers[i].cap;
    return NULL;
}
static const provider *find_provider(const char *id) {
    if (id)
        for (size_t i = 0; i < ssk_provider_count(); i++)
            if (!strcmp(id, providers[i].cap.provider))
                return &providers[i];
    return NULL;
}
ssk_code ssk__validate_capabilities(const ssk_client *c, const ssk_json *q) {
    if (c->gateway_url)
        return SSK_OK;
    const ssk_capabilities *cap = ssk_provider_capabilities(c->provider);
    if (!cap)
        return SSK_UNSUPPORTED_OPTION;
    const ssk_json *i = ssk_json_get(q, "includeDomains"), *e = ssk_json_get(q, "excludeDomains"),
                   *query = ssk_json_get(q, "query");
    if (((i || e) && !cap->domain_filters) || (i && e && cap->mutually_exclusive_domain_filters) ||
        (i && i->count > cap->max_include_domains) || (e && e->count > cap->max_exclude_domains) ||
        (cap->max_query_utf16 && ssk__utf16_length(query->text) > cap->max_query_utf16))
        return SSK_UNSUPPORTED_OPTION;
    return SSK_OK;
}
static int key_valid(const char *s) {
    if (!s || !*s)
        return 0;
    for (const unsigned char *p = (const unsigned char *)s; *p; p++)
        if (*p < 0x21 || *p > 0x7e)
            return 0;
    return 1;
}
static char *joined(const ssk_json *a, const char *separator) {
    ssk_buf b = {0};
    for (size_t i = 0; a && i < a->count; i++) {
        if (i)
            ssk__buf_str(&b, separator);
        ssk__buf_str(&b, a->items[i]->text);
    }
    return ssk__buf_take(&b);
}
static int copy_field(ssk_json *b, const char *name, const ssk_json *q, const char *from) {
    const ssk_json *v = ssk_json_get(q, from);
    return !v || ssk__jset(b, name, ssk__jclone(v));
}
ssk_code ssk__provider_request(const ssk_client *c, const ssk_json *q, const char *key,
                               ssk_http_request *r, ssk_header **headers, char **url, char **body) {
    *headers = NULL;
    *url = NULL;
    *body = NULL;
    r->header_count = 0;
    const provider *p = find_provider(c->provider);
    if (!p)
        return SSK_UNSUPPORTED_OPTION;
    int searx = !strcmp(c->provider, "searxng");
    if (!searx && !key_valid(key))
        return SSK_CONFIGURATION;
    ssk_json *b = ssk__jnew(SSK_JSON_OBJECT);
    ssk_buf params = {0}, u = {0};
    ssk_code code = SSK_CONFIGURATION;
    if (!b)
        return code;
    const ssk_json *query = ssk_json_get(q, "query"), *limit = ssk_json_get(q, "limit"),
                   *inc = ssk_json_get(q, "includeDomains"),
                   *exc = ssk_json_get(q, "excludeDomains");
    const char *id = c->provider;
    int get = !strcmp(id, "brave") || !strcmp(id, "tinyfish") || !strcmp(id, "serpapi");
    r->method = get ? "GET" : "POST";
    if (!ssk__header_add(headers, &r->header_count, "Accept", "application/json"))
        goto done;
    if (p->auth) {
        ssk_buf auth = {0};
        if (p->bearer)
            ssk__buf_str(&auth, "Bearer ");
        ssk__buf_str(&auth, key);
        char *s = ssk__buf_take(&auth);
        int ok = s && ssk__header_add(headers, &r->header_count, p->auth, s);
        free(s);
        if (!ok)
            goto done;
    }
    if (get) {
        if (!strcmp(id, "brave")) {
            char n[8];
            snprintf(n, sizeof(n), "%.0f", limit->number);
            ssk__query_add(&params, "q", query->text, 1);
            ssk__query_add(&params, "count", n, 1);
            ssk__query_add(&params, "extra_snippets", "true", 1);
        } else if (!strcmp(id, "tinyfish")) {
            ssk__query_add(&params, "query", query->text, 1);
            ssk__query_add(&params, "domain_type", "web", 1);
            ssk__query_add(&params, "page", "0", 1);
            if (inc) {
                char *s = joined(inc, ",");
                if (!s)
                    goto done;
                ssk__query_add(&params, "include_domains", s, 1);
                free(s);
            }
            if (exc) {
                char *s = joined(exc, ",");
                if (!s)
                    goto done;
                ssk__query_add(&params, "exclude_domains", s, 1);
                free(s);
            }
        } else {
            ssk__query_add(&params, "engine", "google", 1);
            ssk__query_add(&params, "q", query->text, 1);
            ssk__query_add(&params, "api_key", key, 1);
        }
    } else if (searx) {
        const char *base = ssk_json_string(ssk_json_get(c->settings, "baseUrl"));
        if (!base)
            goto done;
        ssk__buf_str(&u, base);
        while (u.size && u.data[u.size - 1] == '/')
            u.data[--u.size] = 0;
        ssk__buf_str(&u, "/search");
        ssk__query_add(&params, "format", "json", 1);
        ssk__query_add(&params, "pageno", "1", 1);
        const ssk_json *v = ssk_json_get(c->settings, "language");
        if (v)
            ssk__query_add(&params, "language", v->text, 1);
        v = ssk_json_get(c->settings, "safeSearch");
        if (v) {
            char n[8];
            snprintf(n, sizeof(n), "%.0f", v->number);
            ssk__query_add(&params, "safesearch", n, 1);
        }
        v = ssk_json_get(c->settings, "timeRange");
        if (v)
            ssk__query_add(&params, "time_range", v->text, 1);
        v = ssk_json_get(c->settings, "categories");
        char *cat = v ? joined(v, ",") : ssk_strdup("general");
        if (!cat)
            goto done;
        ssk__query_add(&params, "categories", cat, 1);
        free(cat);
        ssk__query_add(&params, "q", query->text, 1);
        *body = ssk__buf_take(&params);
        if (!*body || !ssk__header_add(headers, &r->header_count, "Content-Type",
                                       "application/x-www-form-urlencoded"))
            goto done;
        const ssk_json *hs = ssk_json_get(c->settings, "headers");
        for (size_t i = 0; hs && i < hs->count; i++)
            if (!ssk__header_add(headers, &r->header_count, hs->items[i]->key, hs->items[i]->text))
                goto done;
    } else {
        const char *query_name = !strcmp(id, "serper") || !strcmp(id, "linkup") ? "q" : "query";
        const char *limit_name = !strcmp(id, "exa") || !strcmp(id, "context") ? "numResults"
                                 : !strcmp(id, "tavily") || !strcmp(id, "perplexity")
                                     ? "max_results"
                                 : !strcmp(id, "serper") ? "num"
                                 : !strcmp(id, "you")    ? "count"
                                 : !strcmp(id, "linkup") ? "maxResults"
                                 : !strcmp(id, "valyu")  ? "max_num_results"
                                                         : "limit";
        if (strcmp(id, "parallel")) {
            if (!ssk__jset(b, query_name, ssk__jclone(query)) ||
                !ssk__jset(
                    b, limit_name,
                    ssk__jnum(!strcmp(id, "context") && limit->number < 10 ? 10 : limit->number)))
                goto done;
            const char *ik = !strcmp(id, "tavily") || !strcmp(id, "you") ? "include_domains"
                             : !strcmp(id, "valyu")                      ? "included_sources"
                                                                         : "includeDomains";
            const char *ek = !strcmp(id, "tavily") || !strcmp(id, "you") ? "exclude_domains"
                             : !strcmp(id, "valyu")                      ? "excluded_sources"
                                                                         : "excludeDomains";
            if (strcmp(id, "perplexity") && (!copy_field(b, ik, q, "includeDomains") ||
                                             !copy_field(b, ek, q, "excludeDomains")))
                goto done;
        }
        if (!strcmp(id, "exa")) {
            ssk_json *contents = ssk__jnew(SSK_JSON_OBJECT);
            if (!contents)
                goto done;
            if (!ssk__jset(contents, "highlights", ssk__jbool(1))) {
                ssk_json_free(contents);
                goto done;
            }
            if (!ssk__jset(b, "type", ssk__jstr("auto"))) {
                ssk_json_free(contents);
                goto done;
            }
            if (!ssk__jset(b, "contents", contents))
                goto done;
        } else if (!strcmp(id, "tavily")) {
            if (!ssk__jset(b, "search_depth", ssk__jstr("basic")) ||
                !ssk__jset(b, "include_usage", ssk__jbool(1)) ||
                !ssk__jset(b, "auto_parameters", ssk__jbool(0)) ||
                !ssk__jset(b, "include_answer", ssk__jbool(0)) ||
                !ssk__jset(b, "include_raw_content", ssk__jbool(0)) ||
                (inc && !ssk__jset(b, "include_domains_mode", ssk__jstr("restrict"))))
                goto done;
        } else if (!strcmp(id, "firecrawl")) {
            ssk_json *sources = NULL;
            if (ssk_json_parse("[{\"type\":\"web\"}]", 16, &sources))
                goto done;
            if (!ssk__jset(b, "sources", sources) || !ssk__jset(b, "highlights", ssk__jbool(0)))
                goto done;
        } else if (!strcmp(id, "parallel")) {
            ssk_json *a = ssk__jnew(SSK_JSON_ARRAY), *adv = ssk__jnew(SSK_JSON_OBJECT),
                     *policy = ssk__jnew(SSK_JSON_OBJECT);
            int ok = a && adv && policy && ssk__jpush(a, ssk__jclone(query)) &&
                     ssk__jset(adv, "max_results", ssk__jclone(limit));
            if (ok && (inc || exc)) {
                ok = copy_field(policy, "include_domains", q, "includeDomains") &&
                     copy_field(policy, "exclude_domains", q, "excludeDomains");
                if (ok) {
                    ok = ssk__jset(adv, "source_policy", policy);
                    policy = NULL;
                }
            }
            if (ok) {
                ok = ssk__jset(b, "search_queries", a);
                a = NULL;
            }
            if (ok) {
                ok = ssk__jset(b, "advanced_settings", adv);
                adv = NULL;
            }
            if (ok)
                ok = ssk__jset(b, "mode", ssk__jstr("basic"));
            ssk_json_free(a);
            ssk_json_free(adv);
            ssk_json_free(policy);
            if (!ok)
                goto done;
        } else if (!strcmp(id, "perplexity")) {
            if (!ssk__jset(b, "search_type", ssk__jstr("web")))
                goto done;
            if (inc && !ssk__jset(b, "search_domain_filter", ssk__jclone(inc)))
                goto done;
            if (exc) {
                ssk_json *a = ssk__jnew(SSK_JSON_ARRAY);
                if (!a)
                    goto done;
                for (size_t i = 0; i < exc->count; i++) {
                    ssk_buf text = {0};
                    ssk__buf_char(&text, '-');
                    ssk__buf_str(&text, exc->items[i]->text);
                    char *s = ssk__buf_take(&text);
                    int ok = s && ssk__jpush(a, ssk__jstr(s));
                    free(s);
                    if (!ok) {
                        ssk_json_free(a);
                        goto done;
                    }
                }
                if (!ssk__jset(b, "search_domain_filter", a))
                    goto done;
            }
        } else if (!strcmp(id, "linkup")) {
            if (!ssk__jset(b, "depth", ssk__jstr("fast")) ||
                !ssk__jset(b, "outputType", ssk__jstr("searchResults")) ||
                !ssk__jset(b, "includeImages", ssk__jbool(0)))
                goto done;
        } else if (!strcmp(id, "valyu")) {
            if (!ssk__jset(b, "search_type", ssk__jstr("web")))
                goto done;
            const char *from[] = {"maxPrice",    "relevanceThreshold", "responseLength",
                                  "fastMode",    "startDate",          "endDate",
                                  "instructions"};
            const char *to[] = {"max_price",   "relevance_threshold", "response_length",
                                "fast_mode",   "start_date",          "end_date",
                                "instructions"};
            for (size_t i = 0; i < 7; i++)
                if (!copy_field(b, to[i], c->settings, from[i]))
                    goto done;
        }
        *body = ssk_json_encode(b);
        if (!*body ||
            !ssk__header_add(headers, &r->header_count, "Content-Type", "application/json"))
            goto done;
    }
    if (!searx)
        ssk__buf_str(&u, p->endpoint);
    if (get) {
        ssk__buf_char(&u, '?');
        char *s = ssk__buf_take(&params);
        if (!s)
            goto done;
        ssk__buf_str(&u, s);
        free(s);
    }
    *url = ssk__buf_take(&u);
    if (!*url)
        goto done;
    r->url = *url;
    r->headers = *headers;
    r->body = (const unsigned char *)*body;
    r->body_size = *body ? strlen(*body) : 0;
    code = SSK_OK;
done:
    ssk_json_free(b);
    free(params.data);
    free(u.data);
    if (code) {
        ssk__free_headers(*headers, r->header_count);
        *headers = NULL;
        r->header_count = 0;
        free(*url);
        *url = NULL;
        free(*body);
        *body = NULL;
    }
    return code;
}
static int opt_copy(ssk_json *o, const char *name, const ssk_json *source, const char *key) {
    const ssk_json *v = ssk_json_get(source, key);
    return !v || v->type == SSK_JSON_NULL || ssk__jset(o, name, ssk__jclone(v));
}
static int array_type(const ssk_json *j) {
    return j && j->type == SSK_JSON_ARRAY;
}
ssk_code ssk__provider_response(const ssk_client *c, const ssk_json *data, const char *time,
                                size_t limit, ssk_json **out) {
    *out = NULL;
    const provider *p = find_provider(c->provider);
    if (!p || !data || data->type != SSK_JSON_OBJECT)
        return SSK_INVALID_RESPONSE;
    const char *id = c->provider;
    const ssk_json *container = data, *ids = data;
    int empty = 0, warning = 0;
    ssk_code code = SSK_INVALID_RESPONSE;
    if (!strcmp(id, "brave")) {
        container = ssk_json_get(data, "web");
        if (!container) {
            if (!ssk__jisstr(ssk_json_get(ssk_json_get(data, "query"), "original")))
                return code;
            empty = 1;
        }
    } else if (!strcmp(id, "firecrawl")) {
        const ssk_json *success = ssk_json_get(data, "success");
        if (!success || success->type != SSK_JSON_BOOL)
            return code;
        if (success->number == 0)
            return SSK_PROVIDER_ERROR;
        container = ssk_json_get(data, "data");
    } else if (!strcmp(id, "valyu")) {
        const ssk_json *success = ssk_json_get(data, "success");
        if (!success || success->type != SSK_JSON_BOOL)
            return code;
        if (success->number == 0)
            return SSK_PROVIDER_ERROR;
    } else if (!strcmp(id, "you")) {
        container = ssk_json_get(data, "results");
        ids = ssk_json_get(data, "metadata");
        if (ids && ids->type != SSK_JSON_OBJECT)
            return code;
        if (!ssk_json_get(container, "web")) {
            if (!array_type(ssk_json_get(container, "news")))
                return code;
            empty = 1;
        }
    } else if (!strcmp(id, "serpapi")) {
        ids = ssk_json_get(data, "search_metadata");
        if (!ids || ids->type != SSK_JSON_OBJECT)
            return code;
        const ssk_json *info = ssk_json_get(data, "search_information"),
                       *rows = ssk_json_get(data, "organic_results");
        empty = ssk__jeq(ssk_json_get(ids, "status"), "Success") &&
                ssk__jeq(ssk_json_get(data, "error"),
                         "Google hasn't returned any results for this query.") &&
                ssk_json_number(ssk_json_get(info, "total_results")) == 0 &&
                ssk__jeq(ssk_json_get(info, "organic_results_state"), "Fully empty") &&
                (!rows || (array_type(rows) && !rows->count));
        if ((ssk_json_get(data, "error") && !empty) ||
            ssk__jeq(ssk_json_get(ids, "status"), "Error"))
            return SSK_PROVIDER_ERROR;
        if (!ssk__jeq(ssk_json_get(ids, "status"), "Success"))
            return code;
    } else if (!strcmp(id, "serper")) {
        if (ssk_json_get(data, "error") ||
            (ssk_json_get(data, "message") && !ssk_json_get(data, "organic")))
            return SSK_PROVIDER_ERROR;
    } else if (!strcmp(id, "searxng") && ssk_json_get(data, "error"))
        return SSK_PROVIDER_ERROR;
    const ssk_json *rows = ssk_json_get(container, p->rows);
    if (!empty && !array_type(rows))
        return code;
    ssk_json *o = ssk__jnew(SSK_JSON_OBJECT), *results = ssk__jnew(SSK_JSON_ARRAY),
             *warnings = ssk__jnew(SSK_JSON_ARRAY), *usage = ssk__jnew(SSK_JSON_NULL);
    if (!o || !results || !warnings || !usage) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    for (size_t i = 0; !empty && i < rows->count; i++) {
        const ssk_json *row = rows->items[i];
        if (row->type != SSK_JSON_OBJECT)
            goto done;
        if (!strcmp(id, "linkup") && ssk_json_get(row, "type") &&
            !ssk__jeq(ssk_json_get(row, "type"), "text"))
            goto done;
        ssk_json *r = ssk__jnew(SSK_JSON_OBJECT), *provenance = ssk__jnew(SSK_JSON_OBJECT);
        if (!r || !provenance) {
            ssk_json_free(r);
            ssk_json_free(provenance);
            code = SSK_CONFIGURATION;
            goto done;
        }
        const char *uk = !strcmp(id, "serper") || !strcmp(id, "serpapi") ? "link" : "url";
        const ssk_json *url = ssk_json_get(row, uk);
        int ok = ssk__jset(r, "url", ssk__jclone(url)) &&
                 opt_copy(r, "title", row, !strcmp(id, "linkup") ? "name" : "title");
        if (ok && p->snippet)
            ok = opt_copy(r, "snippet", row, p->snippet);
        if (ok && p->highlights)
            ok = opt_copy(r, "highlights", row, p->highlights);
        if (ok && p->score)
            ok = opt_copy(r, "score", row, p->score);
        if (ok && !strcmp(id, "you")) {
            const ssk_json *snippets = ssk_json_get(row, "snippets");
            if (snippets && snippets->type != SSK_JSON_NULL) {
                if (!array_type(snippets))
                    ok = 0;
                else
                    for (size_t s = 0; s < snippets->count; s++)
                        if (!ssk__jisstr(snippets->items[s]))
                            ok = 0;
                if (ok && !ssk_json_get(r, "snippet")) {
                    char *s = joined(snippets, "\n");
                    ok = s && ssk__jset(r, "snippet", ssk__jstr(s));
                    free(s);
                }
            }
        }
        if (ok)
            ok = ssk__jset(provenance, "provider", ssk__jstr(id)) &&
                 ssk__jset(provenance, "sourceUrl", ssk__jclone(url)) &&
                 ssk__jset(provenance, "retrievedAt", ssk__jstr(time));
        if (ok && p->id)
            ok = opt_copy(provenance, "requestId", ids, p->id);
        if (ok) {
            ok = ssk__jset(r, "provenance", provenance);
            provenance = NULL;
        }
        ssk_json_free(provenance);
        if (!ok) {
            ssk_json_free(r);
            goto done;
        }
        if (!ssk__jpush(results, r))
            goto done;
    }
    if (p->usage_field) {
        const ssk_json *obj = p->usage_object ? ssk_json_get(data, p->usage_object) : data;
        if (obj && obj->type != SSK_JSON_NULL && obj->type != SSK_JSON_OBJECT)
            goto done;
        const ssk_json *amount = ssk_json_get(obj, p->usage_field);
        if (amount && amount->type != SSK_JSON_NULL) {
            if (amount->type != SSK_JSON_NUMBER || amount->number < 0 ||
                (!strcmp(id, "firecrawl") && floor(amount->number) != amount->number))
                goto done;
            ssk_json_free(usage);
            usage = ssk__jnew(SSK_JSON_OBJECT);
            if (!usage || !ssk__jset(usage, "unit", ssk__jstr(p->unit)) ||
                !ssk__jset(usage, "value", ssk__jclone(amount)))
                goto done;
        }
    }
    if (!strcmp(id, "context")) {
        const ssk_json *v = ssk_json_get(data, "partial");
        if (v && v->type != SSK_JSON_BOOL)
            goto done;
        warning = v && v->number != 0;
    } else if (!strcmp(id, "exa")) {
        const ssk_json *w = ssk_json_get(data, "warnings"), *n = ssk_json_get(data, "notices");
        warning = (array_type(w) && w->count) || (array_type(n) && n->count);
    } else if (!strcmp(id, "parallel") || !strcmp(id, "searxng")) {
        const ssk_json *v =
            ssk_json_get(data, !strcmp(id, "parallel") ? "warnings" : "unresponsive_engines");
        if (v && v->type != SSK_JSON_NULL && !array_type(v))
            goto done;
        warning = array_type(v) && v->count;
    } else if (!strcmp(id, "firecrawl") || !strcmp(id, "valyu")) {
        const ssk_json *v = ssk_json_get(data, !strcmp(id, "valyu") ? "error" : "warning");
        if (v && v->type != SSK_JSON_NULL && !ssk__jisstr(v))
            goto done;
        warning = v && ssk__jisstr(v) && v->length;
        if (!strcmp(id, "valyu")) {
            v = ssk_json_get(data, "warnings");
            if (v && v->type != SSK_JSON_NULL) {
                if (!array_type(v))
                    goto done;
                for (size_t x = 0; x < v->count; x++)
                    if (!ssk__jisstr(v->items[x]))
                        goto done;
                warning = warning || v->count;
            }
        }
    }
    if (warning) {
        ssk_json *w = ssk__jnew(SSK_JSON_OBJECT);
        if (!w)
            goto done;
        if (!ssk__jset(w, "code", ssk__jstr("provider_warning")) ||
            !ssk__jset(w, "provider", ssk__jstr(id))) {
            ssk_json_free(w);
            goto done;
        }
        if (!ssk__jpush(warnings, w))
            goto done;
    }
    if (!ssk__jset(o, "results", results)) {
        results = NULL;
        goto done;
    }
    results = NULL;
    if (!ssk__jset(o, "usage", usage)) {
        usage = NULL;
        goto done;
    }
    usage = NULL;
    if (!ssk__jset(o, "warnings", warnings)) {
        warnings = NULL;
        goto done;
    }
    warnings = NULL;
    code = ssk__validate_response(o, 0);
    if (code)
        goto done;
    ssk_json *hits = (ssk_json *)ssk_json_get(o, "results");
    while (hits->count > limit)
        ssk_json_free(hits->items[--hits->count]);
    *out = o;
    o = NULL;
done:
    ssk_json_free(o);
    ssk_json_free(results);
    ssk_json_free(warnings);
    ssk_json_free(usage);
    return code;
}
