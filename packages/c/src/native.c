#include "internal.h"
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <strings.h>

static int nonempty(const ssk_json *v) {
    return ssk__jisstr(v) && v->length;
}
static const ssk_json *parameter(const ssk_json *m, const char *where, const char *name) {
    const ssk_json *a = ssk_json_get(m, "parameters");
    for (size_t i = 0; a && i < a->count; i++)
        if (ssk__jeq(ssk_json_get(a->items[i], "in"), where) &&
            ssk__jeq(ssk_json_get(a->items[i], "name"), name))
            return a->items[i];
    return NULL;
}
static int scalar(const ssk_json *v) {
    return v && (ssk__jisstr(v) || v->type == SSK_JSON_BOOL || v->type == SSK_JSON_NUMBER);
}
static char *scalar_text(const ssk_json *v) {
    return ssk__jisstr(v) ? ssk_strdup(v->text) : scalar(v) ? ssk_json_encode(v) : NULL;
}
static ssk_code query_value(ssk_buf *b, const char *key, const ssk_json *v, const ssk_json *p) {
    if (v->type == SSK_JSON_NULL)
        return SSK_OK;
    if (v->type == SSK_JSON_OBJECT) {
        /* One-level bracket encoding retained by the reference adapters. */
        for (size_t i = 0; i < v->count; i++) {
            ssk_buf name = {0};
            ssk__buf_str(&name, key);
            ssk__buf_char(&name, '[');
            ssk__buf_str(&name, v->items[i]->key);
            ssk__buf_char(&name, ']');
            char *nested = ssk__buf_take(&name);
            if (!nested)
                return SSK_CONFIGURATION;
            if (v->items[i]->type == SSK_JSON_OBJECT) {
                free(nested);
                return SSK_UNSUPPORTED_OPTION;
            }
            ssk_code code = query_value(b, nested, v->items[i], NULL);
            free(nested);
            if (code)
                return code;
        }
        return SSK_OK;
    }
    if (v->type == SSK_JSON_ARRAY) {
        const ssk_json *explode = ssk_json_get(p, "explode");
        int comma = explode && explode->type == SSK_JSON_BOOL && explode->number == 0;
        ssk_buf joined = {0};
        for (size_t i = 0; i < v->count; i++) {
            char *s = scalar_text(v->items[i]);
            if (!s) {
                free(joined.data);
                return SSK_UNSUPPORTED_OPTION;
            }
            if (comma) {
                if (i)
                    ssk__buf_char(&joined, ',');
                ssk__buf_str(&joined, s);
            } else
                ssk__query_add(b, key, s, 0);
            free(s);
        }
        if (comma) {
            char *s = ssk__buf_take(&joined);
            if (!s)
                return SSK_CONFIGURATION;
            ssk__query_add(b, key, s, 0);
            free(s);
        }
        return b->failed ? SSK_CONFIGURATION : SSK_OK;
    }
    char *s = scalar_text(v);
    if (!s)
        return SSK_UNSUPPORTED_OPTION;
    ssk__query_add(b, key, s, 0);
    free(s);
    return b->failed ? SSK_CONFIGURATION : SSK_OK;
}
static int protected_header(const char *k) {
    const char *names[] = {"authorization",
                           "proxy-authorization",
                           "cookie",
                           "host",
                           "connection",
                           "content-length",
                           "transfer-encoding",
                           "x-api-key",
                           "x-subscription-token",
                           "x-tavily-access-mode",
                           "referer",
                           "origin"};
    for (size_t i = 0; i < sizeof(names) / sizeof(names[0]); i++)
        if (!strcasecmp(k, names[i]))
            return 1;
    return 0;
}
static const char *auth_header(const char *id) {
    if (!strcmp(id, "brave"))
        return "X-Subscription-Token";
    if (!strcmp(id, "context") || !strcmp(id, "tavily") || !strcmp(id, "perplexity") ||
        !strcmp(id, "linkup") || !strcmp(id, "firecrawl"))
        return "Authorization";
    return "X-API-Key";
}
static const ssk_json *header_value(const ssk_json *headers, const char *name) {
    for (size_t i = 0; headers && i < headers->count; i++)
        if (!strcasecmp(headers->items[i]->key, name))
            return headers->items[i];
    return NULL;
}
static ssk_code validate_parameters(const ssk_json *m, const ssk_json *input) {
    const ssk_json *a = ssk_json_get(m, "parameters");
    for (size_t i = 0; a && i < a->count; i++) {
        const ssk_json *p = a->items[i];
        const char *where = ssk_json_string(ssk_json_get(p, "in")),
                   *name = ssk_json_string(ssk_json_get(p, "name"));
        if (!where || !name)
            return SSK_CONFIGURATION;
        const ssk_json *v = !strcmp(where, "header")
                                ? header_value(ssk_json_get(input, "headers"), name)
                                : ssk_json_get(ssk_json_get(input, where), name);
        if ((!v || v->type == SSK_JSON_NULL) && ssk_json_bool(ssk_json_get(p, "required")))
            return SSK_INVALID_REQUEST;
        if (!v || v->type == SSK_JSON_NULL)
            continue;
        const ssk_json *type = ssk_json_get(p, "type"), *values = ssk_json_get(p, "enum");
        if ((ssk__jeq(type, "string") && !ssk__jisstr(v)) ||
            (ssk__jeq(type, "array") && v->type != SSK_JSON_ARRAY) ||
            (ssk__jeq(type, "number") && v->type != SSK_JSON_NUMBER) ||
            (ssk__jeq(type, "integer") &&
             (v->type != SSK_JSON_NUMBER || floor(v->number) != v->number)) ||
            (ssk__jeq(type, "boolean") && v->type != SSK_JSON_BOOL))
            return SSK_INVALID_REQUEST;
        if (values && values->type == SSK_JSON_ARRAY) {
            int found = 0;
            for (size_t k = 0; k < values->count; k++) {
                char *s = ssk_json_encode(v), *t = ssk_json_encode(values->items[k]);
                found = found || (s && t && !strcmp(s, t));
                free(s);
                free(t);
            }
            if (!found)
                return SSK_INVALID_REQUEST;
        }
    }
    return SSK_OK;
}
static char *native_path(const ssk_operation *op, const ssk_json *input) {
    const ssk_json *paths = ssk_json_get(input, "path");
    ssk_buf b = {0};
    const char *p = op->path;
    while (*p) {
        if (*p != '{') {
            ssk__buf_char(&b, *p++);
            continue;
        }
        const char *end = strchr(p, '}');
        if (!end) {
            b.failed = 1;
            break;
        }
        size_t n = (size_t)(end - p - 1);
        char name[256];
        if (!n || n >= sizeof(name)) {
            b.failed = 1;
            break;
        }
        memcpy(name, p + 1, n);
        name[n] = 0;
        const ssk_json *v = ssk_json_get(paths, name);
        char *text = scalar_text(v);
        if (!text || !*text || !strcmp(text, ".") || !strcmp(text, "..")) {
            free(text);
            b.failed = 1;
            break;
        }
        for (const unsigned char *c = (const unsigned char *)text; *c; c++)
            if (*c < 32 || *c == 127)
                b.failed = 1;
        char *encoded = ssk__encode_uri(text, 0);
        free(text);
        if (!encoded) {
            b.failed = 1;
            break;
        }
        ssk__buf_str(&b, encoded);
        free(encoded);
        p = end + 1;
    }
    return ssk__buf_take(&b);
}
/* Strict multipart framing for the SerpAPI credential-bearing form. Uploaded
 * bytes are never decoded or reconstructed. Header names are case insensitive;
 * quoted/unquoted field names are recognized before inserting the SDK key. */
static const unsigned char *find_bytes(const unsigned char *data, size_t n, const char *needle) {
    size_t length = strlen(needle);
    if (length > n)
        return NULL;
    for (size_t i = 0; i <= n - length; i++)
        if (!memcmp(data + i, needle, length))
            return data + i;
    return NULL;
}

static char *multipart_name(const unsigned char *data, size_t n) {
    if (memchr(data, 0, n) || n > 16384)
        return NULL;
    char *headers = malloc(n + 1);
    if (!headers)
        return NULL;
    memcpy(headers, data, n);
    headers[n] = 0;
    char *name = NULL;
    int disposition = 0;
    for (char *line = headers; line && *line;) {
        char *next = strstr(line, "\r\n");
        if (next) {
            *next = 0;
            next += 2;
        }
        char *colon = strchr(line, ':');
        if (!colon)
            goto invalid;
        *colon++ = 0;
        while (*colon == ' ' || *colon == '\t')
            colon++;
        if (!strcasecmp(line, "Content-Transfer-Encoding"))
            goto invalid;
        if (!strcasecmp(line, "Content-Disposition")) {
            if (disposition++)
                goto invalid;
            if (strncasecmp(colon, "form-data", 9) ||
                (colon[9] && colon[9] != ';' && colon[9] != ' '))
                goto invalid;
            char *p = colon + 9;
            while (*p) {
                while (*p == ' ' || *p == '\t' || *p == ';')
                    p++;
                if (!*p)
                    break;
                char attribute[128];
                size_t length = 0;
                while (*p && *p != '=' && *p != ' ' && *p != '\t') {
                    if (length + 1 >= sizeof(attribute))
                        goto invalid;
                    attribute[length++] = *p++;
                }
                attribute[length] = 0;
                while (*p == ' ' || *p == '\t')
                    p++;
                if (!length || *p++ != '=')
                    goto invalid;
                while (*p == ' ' || *p == '\t')
                    p++;
                ssk_buf value = {0};
                if (*p == '"') {
                    p++;
                    while (*p && *p != '"') {
                        if (*p == '\\') {
                            p++;
                            if (!*p) {
                                free(value.data);
                                goto invalid;
                            }
                        }
                        ssk__buf_char(&value, *p++);
                    }
                    if (*p != '"') {
                        free(value.data);
                        goto invalid;
                    }
                    p++;
                } else {
                    while (*p && *p != ';' && *p != ' ' && *p != '\t')
                        ssk__buf_char(&value, *p++);
                }
                char *text = ssk__buf_take(&value);
                if (!text)
                    goto invalid;
                if (!strcasecmp(attribute, "name")) {
                    if (name) {
                        free(text);
                        goto invalid;
                    }
                    name = text;
                } else {
                    free(text);
                    if (!strcasecmp(attribute, "name*"))
                        goto invalid;
                }
                while (*p == ' ' || *p == '\t')
                    p++;
                if (*p && *p != ';')
                    goto invalid;
            }
        }
        line = next;
    }
    free(headers);
    return name;
invalid:
    free(headers);
    free(name);
    return NULL;
}

static unsigned char *image_form(const void *data, size_t n, const char *type, const char *key,
                                 size_t *size) {
    if (!data || !n || !type || !key || strncasecmp(type, "multipart/form-data;", 20))
        return NULL;
    const char *p = strstr(type, "boundary=");
    if (!p)
        return NULL;
    p += 9;
    char boundary[72];
    size_t length = 0;
    int quoted = *p == '"';
    if (quoted)
        p++;
    while (*p && (quoted ? *p != '"' : *p != ';' && *p != ' ')) {
        if (length >= 70 || (!isalnum((unsigned char)*p) && !strchr("'()+_,-./:=?", *p)))
            return NULL;
        boundary[length++] = *p++;
    }
    boundary[length] = 0;
    if (!length || (quoted && *p != '"'))
        return NULL;
    char delimiter[76], separator[80];
    snprintf(delimiter, sizeof(delimiter), "--%s", boundary);
    snprintf(separator, sizeof(separator), "\r\n--%s", boundary);
    size_t delimiter_size = strlen(delimiter), position = 0, parts = 0;
    int image = 0, complete = 0;
    const unsigned char *bytes = data;
    while (position < n && ++parts <= 64) {
        if (n - position < delimiter_size + 2 ||
            memcmp(bytes + position, delimiter, delimiter_size))
            return NULL;
        position += delimiter_size;
        if (!memcmp(bytes + position, "--", 2)) {
            position += 2;
            if (n - position == 2 && !memcmp(bytes + position, "\r\n", 2))
                position += 2;
            complete = position == n;
            break;
        }
        if (memcmp(bytes + position, "\r\n", 2))
            return NULL;
        position += 2;
        const unsigned char *end = find_bytes(bytes + position, n - position, "\r\n\r\n");
        if (!end)
            return NULL;
        char *name = multipart_name(bytes + position, (size_t)(end - bytes) - position);
        if (!name)
            return NULL;
        int forbidden = !strcasecmp(name, "api_key");
        image = image || !strcmp(name, "image");
        free(name);
        if (forbidden)
            return NULL;
        position = (size_t)(end - bytes) + 4;
        const unsigned char *next = find_bytes(bytes + position, n - position, separator);
        if (!next)
            return NULL;
        position = (size_t)(next - bytes) + 2;
    }
    if (!image || !complete)
        return NULL;
    ssk_buf result = {0};
    ssk__buf_str(&result, delimiter);
    ssk__buf_str(&result, "\r\nContent-Disposition: form-data; name=\"api_key\"\r\n\r\n");
    ssk__buf_str(&result, key);
    ssk__buf_str(&result, "\r\n");
    ssk__buf_add(&result, data, n);
    *size = result.size;
    return (unsigned char *)ssk__buf_take(&result);
}
ssk_code ssk_native_call(const ssk_client *c, const ssk_operation *op, const char *input_text,
                         const void *raw, size_t raw_size, const ssk_call_options *options,
                         ssk_response **out, ssk_error **error) {
    if (error)
        *error = NULL;
    if (!out)
        return ssk__fail(error, SSK_INVALID_REQUEST, 0, -1, NULL);
    *out = NULL;
    if (!c || c->gateway_url || !op)
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    /* Only catalog-owned descriptor identities may select a credential destination. */
    int known = 0;
    for (size_t i = 0; i < ssk_operation_count(); i++)
        if (op == ssk_operation_at(i)) {
            known = 1;
            break;
        }
    if (!known || strcmp(op->provider, c->provider) ||
        (options && (options->struct_size != sizeof(*options) ||
                     (options->retrieved_at && !ssk__timestamp_valid(options->retrieved_at)))))
        return ssk__fail(error, SSK_CONFIGURATION, 0, -1, NULL);
    uint64_t deadline =
        ssk_monotonic_ms() + (options && options->timeout_ms ? options->timeout_ms : c->timeout_ms);
    ssk_json *input = NULL, *m = NULL, *body_json = NULL;
    ssk_response *response = NULL;
    ssk_code code = SSK_INVALID_REQUEST;
    char *path = NULL, *url = NULL, *body = NULL;
    unsigned char *form = NULL;
    ssk_header *headers = NULL;
    size_t header_count = 0;
    ssk_buf query = {0}, address = {0};
    const char *fields[] = {"path", "query", "headers", "body", "accessMode"};
    const char *text = input_text ? input_text : "{}";
    if (ssk_json_parse(text, strlen(text), &input) || !ssk__jfields(input, fields, 5) ||
        ssk_json_parse(op->metadata_json, strlen(op->metadata_json), &m))
        goto done;
    const ssk_json *q = ssk_json_get(input, "query"), *hs = ssk_json_get(input, "headers"),
                   *paths = ssk_json_get(input, "path"), *b = ssk_json_get(input, "body"),
                   *mode = ssk_json_get(input, "accessMode");
    if ((q && q->type != SSK_JSON_OBJECT) || (hs && hs->type != SSK_JSON_OBJECT) ||
        (paths && paths->type != SSK_JSON_OBJECT) || raw_size > SSK_MAX_REQUEST_BYTES ||
        (!raw && raw_size))
        goto done;
    code = validate_parameters(m, input);
    if (code)
        goto done;
    const char *body_mode = ssk_json_string(ssk_json_get(m, "bodyMode"));
    if (!body_mode) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    if ((raw && b) || (!strcmp(body_mode, "none") && (raw || b)) ||
        (!strcmp(body_mode, "json") && raw) || (!strcmp(body_mode, "raw") && b)) {
        code = SSK_UNSUPPORTED_OPTION;
        goto done;
    }
    if (ssk_json_bool(ssk_json_get(m, "bodyRequired")) && (!strcmp(body_mode, "raw") ? !raw : !b)) {
        code = SSK_INVALID_REQUEST;
        goto done;
    }
    if (paths)
        for (size_t i = 0; i < paths->count; i++)
            if (!parameter(m, "path", paths->items[i]->key)) {
                code = SSK_UNSUPPORTED_OPTION;
                goto done;
            }
    path = native_path(op, input);
    if (!path) {
        code = SSK_INVALID_REQUEST;
        goto done;
    }
    int public_op = !strcmp(op->base_url, "https://logos.context.dev") ||
                    !strcmp(op->base_url, "https://x402.tavily.com");
    const char *key = options ? options->credential : NULL;
    int keyless = mode && ssk__jeq(mode, "keyless") && !strcmp(op->provider, "tavily") &&
                  (!strcmp(op->name, "search") || !strcmp(op->name, "extract"));
    if (mode && !keyless) {
        code = SSK_UNSUPPORTED_OPTION;
        goto done;
    }
    if (keyless && key) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    if (!public_op && !keyless) {
        if (!key || !*key || strlen(key) > 8192) {
            code = SSK_CONFIGURATION;
            goto done;
        }
        for (const unsigned char *p = (const unsigned char *)key; *p; p++)
            if (*p < 0x21 || *p > 0x7e) {
                code = SSK_CONFIGURATION;
                goto done;
            }
    }
    if (q)
        for (size_t i = 0; i < q->count; i++) {
            const char *name = q->items[i]->key;
            if (!strcmp(name, "api_key") || !strcmp(name, "apiKey") ||
                (!strcmp(op->provider, "serpapi") && !strcmp(name, "output"))) {
                code = SSK_INVALID_REQUEST;
                goto done;
            }
            const ssk_json *p = parameter(m, "query", name);
            if (!p && strcmp(op->provider, "serpapi")) {
                code = SSK_UNSUPPORTED_OPTION;
                goto done;
            }
            const ssk_json *engine = ssk_json_get(m, "fixedEngine");
            if (engine && !strcmp(name, "engine"))
                continue;
            code = query_value(&query, name, q->items[i], p);
            if (code)
                goto done;
        }
    const ssk_json *fixed_engine = ssk_json_get(m, "fixedEngine"),
                   *credential_query = ssk_json_get(m, "credentialQuery");
    if (fixed_engine)
        ssk__query_add(&query, "engine", fixed_engine->text, 0);
    if (credential_query)
        ssk__query_add(&query, credential_query->text, key, 0);
    if (!strcmp(op->provider, "serpapi")) {
        if (!fixed_engine &&
            (!strcmp(op->name, "search") || !strcmp(op->name, "searchHtml") ||
             !strcmp(op->name, "searchMarkdown") || !strcmp(op->name, "searchPixelPositions")) &&
            !nonempty(ssk_json_get(q, "engine"))) {
            code = SSK_INVALID_REQUEST;
            goto done;
        }
        if ((!strcmp(op->name, "google") && !nonempty(ssk_json_get(q, "q"))) ||
            (!strncmp(op->name, "extract", 7) && !nonempty(ssk_json_get(q, "url"))) ||
            (ssk_json_bool(ssk_json_get(q, "async")) &&
             ssk_json_bool(ssk_json_get(q, "no_cache")))) {
            code = SSK_INVALID_REQUEST;
            goto done;
        }
    }
    if (public_op && !strcmp(op->provider, "context")) {
        if (!nonempty(ssk_json_get(q, "publicClientId")) || !nonempty(ssk_json_get(q, "domain"))) {
            code = SSK_INVALID_REQUEST;
            goto done;
        }
    }
    if (query.failed) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    ssk__buf_str(&address, op->base_url);
    ssk__buf_str(&address, path);
    if (query.size) {
        ssk__buf_char(&address, '?');
        ssk__buf_add(&address, query.data, query.size);
    }
    url = ssk__buf_take(&address);
    if (!url) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    if (!strcmp(op->response_mode, "embedding-url")) {
        ssk_http_request check = {0};
        check.cancel = options ? options->cancel : NULL;
        check.deadline_ms = deadline;
        code = ssk_http_check(&check);
        if (code)
            goto done;
        response = calloc(1, sizeof(*response));
        if (!response) {
            code = SSK_CONFIGURATION;
            goto done;
        }
        response->data = (unsigned char *)url;
        response->size = strlen(url);
        url = NULL;
        *out = response;
        response = NULL;
        code = SSK_OK;
        goto done;
    }
    if (hs)
        for (size_t i = 0; i < hs->count; i++) {
            for (size_t k = 0; k < i; k++)
                if (!strcasecmp(hs->items[k]->key, hs->items[i]->key)) {
                    code = SSK_INVALID_REQUEST;
                    goto done;
                }
            const ssk_json *v = hs->items[i];
            if (v->type == SSK_JSON_NULL)
                continue;
            if (!ssk__jisstr(v) || protected_header(v->key) ||
                !ssk__header_add(&headers, &header_count, v->key, v->text)) {
                code = SSK_INVALID_REQUEST;
                goto done;
            }
        }
    const ssk_json *fixed_headers = ssk_json_get(m, "headers");
    for (size_t i = 0; fixed_headers && i < fixed_headers->count; i++)
        if (!ssk__header_add(&headers, &header_count, fixed_headers->items[i]->key,
                             fixed_headers->items[i]->text)) {
            code = SSK_CONFIGURATION;
            goto done;
        }
    if (!public_op && !credential_query && !keyless && strcmp(op->provider, "serpapi")) {
        const char *name = auth_header(op->provider);
        ssk_buf auth = {0};
        if (!strcmp(name, "Authorization"))
            ssk__buf_str(&auth, "Bearer ");
        ssk__buf_str(&auth, key);
        char *value = ssk__buf_take(&auth);
        int ok = value && ssk__header_add(&headers, &header_count, name, value);
        free(value);
        if (!ok) {
            code = SSK_CONFIGURATION;
            goto done;
        }
    }
    if (keyless && !ssk__header_add(&headers, &header_count, "X-Tavily-Access-Mode", "keyless")) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    if (b) {
        body_json = ssk__jclone(b);
        if (!body_json) {
            code = SSK_CONFIGURATION;
            goto done;
        }
        if (ssk_json_bool(ssk_json_get(m, "stream"))) {
            int stream = ssk_json_bool(ssk_json_get(m, "streamValue"));
            const ssk_json *v = ssk_json_get(body_json, "stream");
            if (body_json->type != SSK_JSON_OBJECT ||
                (v && (v->type != SSK_JSON_BOOL || (v->number != 0) != stream))) {
                code = SSK_UNSUPPORTED_OPTION;
                goto done;
            }
            if (!ssk__jset(body_json, "stream", ssk__jbool(stream))) {
                code = SSK_CONFIGURATION;
                goto done;
            }
        }
        if (!strcmp(op->provider, "exa") && !strcmp(op->name, "searchStream") &&
            !ssk_json_get(body_json, "outputSchema")) {
            code = SSK_INVALID_REQUEST;
            goto done;
        }
        if (!strcmp(op->name, "paidSearch")) {
            const ssk_json *depth = ssk_json_get(body_json, "search_depth");
            if (depth && !ssk__jeq(depth, "advanced")) {
                code = SSK_UNSUPPORTED_OPTION;
                goto done;
            }
        }
        body = ssk_json_encode(body_json);
        if (!body ||
            !ssk__header_add(&headers, &header_count, "Content-Type", "application/json")) {
            code = SSK_CONFIGURATION;
            goto done;
        }
    }
    if (raw) {
        const char *type = NULL;
        for (size_t i = 0; i < header_count; i++)
            if (!strcasecmp(headers[i].name, "Content-Type"))
                type = headers[i].value;
        if (!type) {
            const char *source_type = ssk_json_string(ssk_json_get(m, "contentType"));
            if (source_type && !strcmp(source_type, "multipart/form-data")) {
                code = SSK_INVALID_REQUEST;
                goto done;
            }
            if (!ssk__header_add(&headers, &header_count, "Content-Type",
                                 source_type ? source_type : "application/octet-stream")) {
                code = SSK_CONFIGURATION;
                goto done;
            }
        }
        if (!strcmp(op->provider, "serpapi") && !strcmp(op->name, "uploadImage")) {
            form = image_form(raw, raw_size, type, key, &raw_size);
            if (!form) {
                code = SSK_INVALID_REQUEST;
                goto done;
            }
            raw = form;
        }
    }
    const char *accept = !strcmp(op->response_mode, "sse")    ? "text/event-stream"
                         : !strcmp(op->response_mode, "json") ? "application/json"
                                                              : "*/*";
    if (!ssk__header_add(&headers, &header_count, "Accept", accept)) {
        code = SSK_CONFIGURATION;
        goto done;
    }
    ssk_http_request h = {url,
                          op->method,
                          headers,
                          header_count,
                          raw ? (const unsigned char *)raw : (const unsigned char *)body,
                          raw    ? raw_size
                          : body ? strlen(body)
                                 : 0,
                          deadline,
                          c->max_bytes,
                          options ? options->cancel : NULL};
    code = ssk__http_call(c, &h, &response, error, 0);
    if (code)
        goto done;
    if (!strcmp(op->response_mode, "sse")) {
        const char *content_type = ssk_response_header(response, "Content-Type");
        if (content_type &&
            (strncasecmp(content_type, "text/event-stream", 17) ||
             (content_type[17] && content_type[17] != ';' && content_type[17] != ' '))) {
            code = SSK_INVALID_RESPONSE;
            goto done;
        }
    }
    if (!strcmp(op->response_mode, "json")) {
        if (!response->size &&
            (response->status == 204 || response->status == 205 || !strcmp(op->method, "HEAD")))
            response->json = ssk__jnew(SSK_JSON_NULL);
        else
            code = ssk_json_parse(response->data, response->size, &response->json);
    } else if (!strcmp(op->response_mode, "empty")) {
        if (response->size)
            code = SSK_INVALID_RESPONSE;
        else
            response->json = ssk__jnew(SSK_JSON_NULL);
    } else if (!strcmp(op->response_mode, "text") || !strcmp(op->response_mode, "sse")) {
        if (!ssk__utf8_valid(response->data, response->size) ||
            (response->data && memchr(response->data, 0, response->size)))
            code = SSK_INVALID_RESPONSE;
        if (!strcmp(op->provider, "perplexity") && !strcmp(op->name, "revokeAuthToken") &&
            response->size)
            code = SSK_INVALID_RESPONSE;
    }
    if (!code)
        code = ssk_http_check(&h);
    if (!code) {
        *out = response;
        response = NULL;
    }
done:
    if (code && (!error || !*error))
        ssk__fail(error, code, 0, -1, NULL);
    ssk_response_free(response);
    ssk_json_free(input);
    ssk_json_free(m);
    ssk_json_free(body_json);
    free(path);
    free(url);
    free(body);
    free(form);
    free(query.data);
    free(address.data);
    ssk__free_headers(headers, header_count);
    return code;
}

/* Incremental SSE decoder. All allocations are bounded by the transport's
 * cumulative decoded-byte ceiling; no parser state outlives the call. */
typedef struct {
    ssk_buf line, data;
    char *event, *id;
    int64_t retry;
    int has_data, after_cr, first_line;
    ssk_sse_fn callback;
    void *context;
} sse_decoder;

static ssk_code sse_line(sse_decoder *d) {
    const char *line = d->line.data ? d->line.data : "";
    size_t n = d->line.size;
    if (!ssk__utf8_valid((const unsigned char *)line, n) || memchr(line, 0, n))
        return SSK_INVALID_RESPONSE;
    if (d->first_line) {
        if (n >= 3 && !memcmp(line, "\xef\xbb\xbf", 3)) {
            line += 3;
            n -= 3;
        }
        d->first_line = 0;
    }
    if (!n) {
        if (d->has_data) {
            if (d->data.size)
                d->data.data[--d->data.size] = 0;
            if (d->callback(d->context, d->event && *d->event ? d->event : "message",
                            d->data.data ? d->data.data : "", d->id, d->retry))
                return SSK_ABORTED;
        }
        d->has_data = 0;
        d->data.size = 0;
        if (d->data.data)
            d->data.data[0] = 0;
        free(d->event);
        d->event = NULL;
        return SSK_OK;
    }
    if (*line == ':')
        return SSK_OK;
    size_t colon = 0;
    while (colon < n && line[colon] != ':')
        colon++;
    size_t start = colon < n ? colon + 1 : colon;
    if (start < n && line[start] == ' ')
        start++;
    size_t length = n - start;
    if (colon == 4 && !memcmp(line, "data", 4)) {
        ssk__buf_add(&d->data, line + start, length);
        ssk__buf_char(&d->data, '\n');
        d->has_data = 1;
        return d->data.failed ? SSK_CONFIGURATION : SSK_OK;
    }
    if ((colon == 5 && !memcmp(line, "event", 5)) || (colon == 2 && !memcmp(line, "id", 2))) {
        char *text = malloc(length + 1);
        if (!text)
            return SSK_CONFIGURATION;
        memcpy(text, line + start, length);
        text[length] = 0;
        char **slot = colon == 2 ? &d->id : &d->event;
        free(*slot);
        *slot = text;
    } else if (colon == 5 && !memcmp(line, "retry", 5)) {
        int64_t number = 0;
        int valid = length != 0;
        for (size_t i = start; i < n; i++) {
            unsigned char c = (unsigned char)line[i];
            if (c < '0' || c > '9' || number > (INT64_MAX - (c - '0')) / 10) {
                valid = 0;
                break;
            }
            number = number * 10 + (c - '0');
        }
        if (valid)
            d->retry = number;
    }
    return SSK_OK;
}

static ssk_code sse_feed(void *context, const void *bytes, size_t n) {
    sse_decoder *d = context;
    if (!bytes)
        return n ? SSK_INVALID_RESPONSE : SSK_OK;
    const unsigned char *data = bytes;
    for (size_t i = 0; i < n; i++) {
        if (d->after_cr) {
            d->after_cr = 0;
            if (data[i] == '\n')
                continue;
        }
        if (data[i] == '\n' || data[i] == '\r') {
            ssk_code code = sse_line(d);
            if (code)
                return code;
            d->line.size = 0;
            if (d->line.data)
                d->line.data[0] = 0;
            d->after_cr = data[i] == '\r';
        } else {
            ssk__buf_char(&d->line, (char)data[i]);
            if (d->line.failed)
                return SSK_CONFIGURATION;
        }
    }
    return SSK_OK;
}

typedef struct {
    const ssk_client *client;
    sse_decoder decoder;
    ssk_sink *sink;
} stream_transport;
static ssk_code stream_bytes(void *context, const void *bytes, size_t size) {
    stream_transport *t = context;
    const char *type = ssk_response_header(t->sink->response, "Content-Type");
    if (type && (strncasecmp(type, "text/event-stream", 17) ||
                 (type[17] && type[17] != ';' && type[17] != ' ')))
        return SSK_INVALID_RESPONSE;
    return sse_feed(&t->decoder, bytes, size);
}
static ssk_code stream_request(void *context, const ssk_http_request *r, ssk_sink *sink) {
    stream_transport *t = context;
    t->sink = sink;
    sink->on_bytes = stream_bytes;
    sink->on_bytes_context = t;
    return t->client->transport(t->client->context, r, sink);
}

ssk_code ssk_native_stream(const ssk_client *client, const ssk_operation *operation,
                           const char *input, const ssk_call_options *options, ssk_sse_fn callback,
                           void *context, ssk_response **response, ssk_error **error) {
    if (error)
        *error = NULL;
    if (response)
        *response = NULL;
    int known = 0;
    for (size_t i = 0; i < ssk_operation_count(); i++)
        if (operation == ssk_operation_at(i)) {
            known = 1;
            break;
        }
    if (!client || !callback || !known || strcmp(operation->response_mode, "sse"))
        return ssk__fail(error, SSK_UNSUPPORTED_OPTION, 0, -1, NULL);
    stream_transport transport = {0};
    transport.client = client;
    transport.decoder.callback = callback;
    transport.decoder.context = context;
    transport.decoder.retry = -1;
    transport.decoder.first_line = 1;
    ssk_client wrapper = *client;
    wrapper.transport = stream_request;
    wrapper.context = &transport;
    ssk_code code = ssk_native_call(&wrapper, operation, input, NULL, 0, options, response, error);
    free(transport.decoder.line.data);
    free(transport.decoder.data.data);
    free(transport.decoder.event);
    free(transport.decoder.id);
    return code;
}

ssk_code ssk_response_sse(const ssk_response *response, ssk_sse_fn callback, void *context) {
    if (!response || !callback)
        return SSK_INVALID_REQUEST;
    if (!ssk__utf8_valid(response->data, response->size) ||
        (response->data && memchr(response->data, 0, response->size)))
        return SSK_INVALID_RESPONSE;
    sse_decoder decoder = {0};
    decoder.callback = callback;
    decoder.context = context;
    decoder.retry = -1;
    decoder.first_line = 1;
    ssk_code code = sse_feed(&decoder, response->data, response->size);
    free(decoder.line.data);
    free(decoder.data.data);
    free(decoder.event);
    free(decoder.id);
    return code;
}
