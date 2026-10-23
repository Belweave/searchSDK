#define _POSIX_C_SOURCE 200809L
#include "internal.h"
#include <arpa/inet.h>
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <strings.h>
#include <time.h>

/* WHATWG-style numeric IPv4 host bounds; ordinary DNS/IDNA names remain names. */
static int ipv4_host_valid(const char *start, const char *end) {
    if (end > start && end[-1] == '.')
        end--;
    const char *last = end;
    while (last > start && last[-1] != '.')
        last--;
    int numeric = last < end;
    for (const char *p = last; p < end; p++)
        if (*p < '0' || *p > '9')
            numeric = 0;
    if (end - last >= 2 && last[0] == '0' && (last[1] == 'x' || last[1] == 'X'))
        numeric = 1;
    if (!numeric)
        return 1;
    uint64_t values[4];
    size_t count = 0;
    while (start < end) {
        if (count == 4)
            return 0;
        const char *finish = start;
        while (finish < end && *finish != '.')
            finish++;
        if (finish == start)
            return 0;
        unsigned base = 10;
        if (finish - start >= 2 && start[0] == '0' && (start[1] == 'x' || start[1] == 'X')) {
            base = 16;
            start += 2;
        } else if (finish - start >= 2 && *start == '0') {
            base = 8;
            start++;
        }
        uint64_t value = 0;
        for (const char *p = start; p < finish; p++) {
            unsigned c = (unsigned char)*p, digit = c >= '0' && c <= '9'   ? c - '0'
                                                    : c >= 'a' && c <= 'f' ? c - 'a' + 10
                                                    : c >= 'A' && c <= 'F' ? c - 'A' + 10
                                                                           : 99;
            if (digit >= base || value > (UINT32_MAX - digit) / base)
                return 0;
            value = value * base + digit;
        }
        values[count++] = value;
        start = finish < end ? finish + 1 : end;
    }
    if (!count)
        return 0;
    for (size_t i = 0; i + 1 < count; i++)
        if (values[i] > 255)
            return 0;
    return values[count - 1] < (UINT64_C(1) << (8 * (5 - count)));
}

int ssk__url_valid(const char *s, int endpoint) {
    if (!s)
        return 0;
    size_t n = strlen(s);
    if (!n || !ssk__utf8_valid((const unsigned char *)s, n))
        return 0;
    for (const unsigned char *p = (const unsigned char *)s; *p;) {
        uint32_t cp = *p++;
        if (cp >= 0xc0) {
            size_t k = cp < 0xe0 ? 1u : cp < 0xf0 ? 2u : 3u;
            cp &= k == 1 ? 31u : k == 2 ? 15u : 7u;
            while (k--)
                cp = (cp << 6) | (*p++ & 63);
        }
        if (cp <= 32 || (cp >= 127 && cp <= 159) || cp == '\\' || cp == 160 || cp == 0x1680 ||
            (cp >= 0x2000 && cp <= 0x200a) || cp == 0x2028 || cp == 0x2029 || cp == 0x202f ||
            cp == 0x205f || cp == 0x3000 || cp == 0xfeff)
            return 0;
    }
    const char *a;
    if (!strncasecmp(s, "https://", 8))
        a = s + 8;
    else if (!endpoint && !strncasecmp(s, "http://", 7))
        a = s + 7;
    else
        return 0;
    const char *end = a + strcspn(a, "/?#");
    if (a == end || memchr(a, '@', (size_t)(end - a)))
        return 0;
    if (endpoint && (strchr(a, '?') || strchr(a, '#')))
        return 0;
    const char *port = NULL;
    if (*a == '[') {
        const char *r = memchr(a, ']', (size_t)(end - a));
        if (!r || r == a + 1)
            return 0;
        char addr[INET6_ADDRSTRLEN];
        size_t k = (size_t)(r - a - 1);
        if (k >= sizeof(addr))
            return 0;
        memcpy(addr, a + 1, k);
        addr[k] = 0;
        unsigned char bytes[16];
        if (inet_pton(AF_INET6, addr, bytes) != 1)
            return 0;
        if (r + 1 != end) {
            if (r[1] != ':')
                return 0;
            port = r + 2;
        }
    } else {
        const char *r = memchr(a, ':', (size_t)(end - a));
        const char *host_end = r ? r : end;
        if (host_end == a)
            return 0;
        for (const unsigned char *p = (const unsigned char *)a; p < (const unsigned char *)host_end;
             p++)
            if (!isalnum(*p) && *p != '.' && *p != '-' && *p != '_' && *p < 128)
                return 0;
        if (!ipv4_host_valid(a, host_end))
            return 0;
        if (r)
            port = r + 1;
    }
    if (port) {
        unsigned value = 0;
        if (port == end)
            return 0;
        for (const char *p = port; p < end; p++) {
            if (*p < '0' || *p > '9' || value > 6553)
                return 0;
            value = value * 10 + (unsigned)(*p - '0');
        }
        if (value > 65535)
            return 0;
    }
    return 1;
}
static int ndigits(const char *s, size_t n) {
    for (size_t i = 0; i < n; i++)
        if (s[i] < '0' || s[i] > '9')
            return 0;
    return 1;
}
int ssk__timestamp_valid(const char *s) {
    if (!s)
        return 0;
    size_t n = strlen(s);
    if (n < 20 || !ndigits(s, 4) || s[4] != '-' || !ndigits(s + 5, 2) || s[7] != '-' ||
        !ndigits(s + 8, 2) || s[10] != 'T' || !ndigits(s + 11, 2) || s[13] != ':' ||
        !ndigits(s + 14, 2) || s[16] != ':' || !ndigits(s + 17, 2))
        return 0;
    int y = (s[0] - '0') * 1000 + (s[1] - '0') * 100 + (s[2] - '0') * 10 + s[3] - '0';
    int m = (s[5] - '0') * 10 + s[6] - '0', d = (s[8] - '0') * 10 + s[9] - '0';
    static const int days[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1] + (m == 2 && leap) ||
        (s[11] - '0') * 10 + s[12] - '0' > 23 || (s[14] - '0') * 10 + s[15] - '0' > 59 ||
        (s[17] - '0') * 10 + s[18] - '0' > 59)
        return 0;
    size_t i = 19;
    if (s[i] == '.') {
        size_t start = ++i;
        while (i < n && s[i] >= '0' && s[i] <= '9')
            i++;
        if (i == start)
            return 0;
    }
    if (i < n && s[i] == 'Z' && i + 1 == n)
        return 1;
    return i + 6 == n && (s[i] == '+' || s[i] == '-') && ndigits(s + i + 1, 2) && s[i + 3] == ':' &&
           ndigits(s + i + 4, 2) && (s[i + 1] - '0') * 10 + s[i + 2] - '0' <= 23 &&
           (s[i + 4] - '0') * 10 + s[i + 5] - '0' <= 59;
}
void ssk__utc_now(char out[32]) {
    struct timespec t;
    struct tm tm;
    clock_gettime(CLOCK_REALTIME, &t);
    gmtime_r(&t.tv_sec, &tm);
    strftime(out, 32, "%Y-%m-%dT%H:%M:%S.000Z", &tm);
}
static int blank(const char *s) {
    const unsigned char *p = (const unsigned char *)s;
    while (*p) {
        uint32_t c = *p++;
        if (c >= 0xc0) {
            size_t k = c < 0xe0 ? 1u : c < 0xf0 ? 2u : 3u;
            c &= k == 1 ? 31u : k == 2 ? 15u : 7u;
            while (k--)
                c = (c << 6) | (*p++ & 63);
        }
        if (!(c == 9 || c == 10 || c == 11 || c == 12 || c == 13 || c == 32 || c == 160 ||
              c == 0x1680 || (c >= 0x2000 && c <= 0x200a) || c == 0x2028 || c == 0x2029 ||
              c == 0x202f || c == 0x205f || c == 0x3000 || c == 0xfeff))
            return 0;
    }
    return 1;
}
static int domain_valid(const char *s) {
    size_t n = strlen(s), start = 0, dots = 0;
    if (!n || n > 253)
        return 0;
    for (size_t i = 0; i <= n; i++)
        if (s[i] == '.' || !s[i]) {
            size_t k = i - start;
            if (!k || k > 63 || !isalnum((unsigned char)s[start]) ||
                !isalnum((unsigned char)s[i - 1]))
                return 0;
            for (size_t x = start; x < i; x++)
                if ((unsigned char)s[x] >= 128 || (!isalnum((unsigned char)s[x]) && s[x] != '-'))
                    return 0;
            start = i + 1;
            if (s[i] == '.')
                dots++;
        }
    return dots > 0;
}
static ssk_json *domains(const ssk_json *v) {
    if (!v || v->type != SSK_JSON_ARRAY || !v->count)
        return NULL;
    ssk_json *a = ssk__jnew(SSK_JSON_ARRAY);
    if (!a)
        return NULL;
    for (size_t i = 0; i < v->count; i++) {
        const ssk_json *s = v->items[i];
        if (!ssk__jisstr(s) || !domain_valid(s->text))
            goto bad;
        char *copy = ssk_strdup(s->text);
        if (!copy)
            goto bad;
        for (char *p = copy; *p; p++)
            *p = (char)tolower((unsigned char)*p);
        size_t x = 0;
        for (; x < a->count; x++)
            if (ssk__jeq(a->items[x], copy))
                break;
        if (x == a->count && !ssk__jpush(a, ssk__jstr(copy))) {
            free(copy);
            goto bad;
        }
        free(copy);
    }
    return a;
bad:
    ssk_json_free(a);
    return NULL;
}
ssk_code ssk_request_normalize(const char *text, ssk_json **out) {
    if (!out)
        return SSK_INVALID_REQUEST;
    *out = NULL;
    ssk_json *v = NULL, *o = NULL, *inc = NULL, *exc = NULL;
    if (!text || ssk_json_parse(text, strlen(text), &v))
        return SSK_INVALID_REQUEST;
    const char *fields[] = {"query", "limit", "includeDomains", "excludeDomains"};
    const ssk_json *q = ssk_json_get(v, "query"), *lim = ssk_json_get(v, "limit");
    if (!ssk__jfields(v, fields, 4) || !ssk__jisstr(q) || blank(q->text))
        goto bad;
    double n = lim ? ssk_json_number(lim) : 5;
    if (!isfinite(n) || n < 1 || n > 20 || floor(n) != n)
        goto bad;
    const ssk_json *i = ssk_json_get(v, "includeDomains"), *e = ssk_json_get(v, "excludeDomains");
    if (i && !(inc = domains(i)))
        goto bad;
    if (e && !(exc = domains(e)))
        goto bad;
    for (size_t a = 0; inc && a < inc->count; a++)
        for (size_t b = 0; exc && b < exc->count; b++)
            if (ssk__jeq(inc->items[a], exc->items[b]->text))
                goto bad;
    o = ssk__jnew(SSK_JSON_OBJECT);
    if (!o || !ssk__jset(o, "query", ssk__jclone(q)) || !ssk__jset(o, "limit", ssk__jnum(n)))
        goto bad;
    if (inc) {
        ssk_json *t = inc;
        inc = NULL;
        if (!ssk__jset(o, "includeDomains", t))
            goto bad;
    }
    if (exc) {
        ssk_json *t = exc;
        exc = NULL;
        if (!ssk__jset(o, "excludeDomains", t))
            goto bad;
    }
    ssk_json_free(v);
    *out = o;
    return SSK_OK;
bad:
    ssk_json_free(v);
    ssk_json_free(o);
    ssk_json_free(inc);
    ssk_json_free(exc);
    return SSK_INVALID_REQUEST;
}
static int provider_id(const ssk_json *j) {
    if (!ssk__jisstr(j) || !j->length || j->length > 64)
        return 0;
    for (size_t i = 0; i < j->length; i++) {
        unsigned char c = (unsigned char)j->text[i];
        if (c >= 128 || (!isalnum(c) && c != '_' && c != '-'))
            return 0;
    }
    return 1;
}
static int optional_string(const ssk_json *j) {
    return !j || j->type == SSK_JSON_NULL || ssk__jisstr(j);
}
static int optional_number(const ssk_json *j) {
    return !j || j->type == SSK_JSON_NULL || (j->type == SSK_JSON_NUMBER && isfinite(j->number));
}
static int strings(const ssk_json *j) {
    if (!j || j->type != SSK_JSON_ARRAY)
        return 0;
    for (size_t i = 0; i < j->count; i++)
        if (!ssk__jisstr(j->items[i]))
            return 0;
    return 1;
}
static int request_id(const ssk_json *j) {
    if (!j || j->type == SSK_JSON_NULL)
        return 1;
    if (!ssk__jisstr(j) || !j->length || j->length > 256)
        return 0;
    for (size_t i = 0; i < j->length; i++) {
        unsigned char c = (unsigned char)j->text[i];
        if (c >= 128 || (!isalnum(c) && !strchr("_.:/-", c)))
            return 0;
    }
    return 1;
}
static int nonnegative(const ssk_json *j) {
    return j && j->type == SSK_JSON_NUMBER && isfinite(j->number) && j->number >= 0;
}
static int status_valid(const ssk_json *j) {
    return !j || (nonnegative(j) && j->number >= 100 && j->number <= 599 &&
                  floor(j->number) == j->number);
}
static int code_valid(const ssk_json *j) {
    if (!ssk__jisstr(j))
        return 0;
    for (ssk_code i = 1; i <= SSK_PROVIDER_ERROR; i++)
        if (ssk__jeq(j, ssk_code_name(i)))
            return 1;
    return 0;
}
ssk_code ssk__validate_response(const ssk_json *j, int full) {
    if (!j || j->type != SSK_JSON_OBJECT)
        return SSK_INVALID_RESPONSE;
    const ssk_json *r = ssk_json_get(j, "results"), *u = ssk_json_get(j, "usage"),
                   *w = ssk_json_get(j, "warnings");
    if (!r || r->type != SSK_JSON_ARRAY || !u || !w || w->type != SSK_JSON_ARRAY)
        return SSK_INVALID_RESPONSE;
    for (size_t i = 0; i < r->count; i++) {
        const ssk_json *row = r->items[i], *url = ssk_json_get(row, "url"),
                       *p = ssk_json_get(row, "provenance"), *source = ssk_json_get(p, "sourceUrl"),
                       *date = ssk_json_get(p, "retrievedAt"), *h = ssk_json_get(row, "highlights");
        if (!ssk__jisstr(url) || !ssk__url_valid(url->text, 0) ||
            !optional_string(ssk_json_get(row, "title")) ||
            !optional_string(ssk_json_get(row, "snippet")) ||
            !optional_number(ssk_json_get(row, "score")) ||
            (h && h->type != SSK_JSON_NULL && !strings(h)) ||
            !provider_id(ssk_json_get(p, "provider")) || !ssk__jisstr(source) ||
            !ssk__url_valid(source->text, 0) || !ssk__jisstr(date) ||
            !ssk__timestamp_valid(date->text) || !request_id(ssk_json_get(p, "requestId")))
            return SSK_INVALID_RESPONSE;
    }
    if (u->type != SSK_JSON_NULL &&
        (!nonnegative(ssk_json_get(u, "value")) || (!ssk__jeq(ssk_json_get(u, "unit"), "usd") &&
                                                    !ssk__jeq(ssk_json_get(u, "unit"), "credits"))))
        return SSK_INVALID_RESPONSE;
    for (size_t i = 0; i < w->count; i++) {
        const ssk_json *a = w->items[i];
        if (!provider_id(ssk_json_get(a, "provider")) ||
            (!ssk__jeq(ssk_json_get(a, "code"), "fallback_used") &&
             !ssk__jeq(ssk_json_get(a, "code"), "provider_warning")))
            return SSK_INVALID_RESPONSE;
    }
    if (full) {
        const ssk_json *a = ssk_json_get(j, "attempts"), *reuse = ssk_json_get(j, "reuse");
        if (!provider_id(ssk_json_get(j, "provider")) || !a || a->type != SSK_JSON_ARRAY ||
            a->count > 1024 || (reuse && !ssk__jeq(reuse, "cache") && !ssk__jeq(reuse, "inflight")))
            return SSK_INVALID_RESPONSE;
        for (size_t i = 0; i < a->count; i++) {
            const ssk_json *x = a->items[i], *d = ssk_json_get(x, "startedAt"),
                           *c = ssk_json_get(x, "code"), *delay = ssk_json_get(x, "retryAfterMs");
            if (!provider_id(ssk_json_get(x, "provider")) || !ssk__jisstr(d) ||
                !ssk__timestamp_valid(d->text) || !nonnegative(ssk_json_get(x, "durationMs")) ||
                (!ssk__jeq(ssk_json_get(x, "outcome"), "success") &&
                 !ssk__jeq(ssk_json_get(x, "outcome"), "error")) ||
                (c && !code_valid(c)) || !status_valid(ssk_json_get(x, "status")) ||
                (delay && !nonnegative(delay)))
                return SSK_INVALID_RESPONSE;
        }
    }
    return SSK_OK;
}
