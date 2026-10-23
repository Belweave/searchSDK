/* Handwritten strict JSON codec, searchSDK; no bundled third-party parser. */
#define _GNU_SOURCE
#include "internal.h"
#include <locale.h>
#include <math.h>
#include <stdio.h>
#ifdef __APPLE__
#include <xlocale.h>
#endif
#include <errno.h>
#include <limits.h>

void ssk_free(void *p) {
    free(p);
}
char *ssk_strdup(const char *s) {
    if (!s)
        return NULL;
    size_t n = strlen(s);
    char *p = malloc(n + 1);
    if (p)
        memcpy(p, s, n + 1);
    return p;
}
void ssk__buf_add(ssk_buf *b, const void *s, size_t n) {
    if (b->failed || !n)
        return;
    if (!s || n > SIZE_MAX - b->size - 1) {
        b->failed = 1;
        return;
    }
    size_t need = b->size + n + 1;
    if (need > b->capacity) {
        size_t cap = b->capacity ? b->capacity : 128;
        while (cap < need) {
            if (cap > SIZE_MAX / 2) {
                cap = need;
                break;
            }
            cap *= 2;
        }
        char *p = realloc(b->data, cap);
        if (!p) {
            b->failed = 1;
            return;
        }
        b->data = p;
        b->capacity = cap;
    }
    memcpy(b->data + b->size, s, n);
    b->size += n;
    b->data[b->size] = 0;
}
void ssk__buf_str(ssk_buf *b, const char *s) {
    if (s)
        ssk__buf_add(b, s, strlen(s));
    else
        b->failed = 1;
}
void ssk__buf_char(ssk_buf *b, char c) {
    ssk__buf_add(b, &c, 1);
}
char *ssk__buf_take(ssk_buf *b) {
    if (b->failed) {
        free(b->data);
        memset(b, 0, sizeof(*b));
        return NULL;
    }
    char *s = b->data ? b->data : ssk_strdup("");
    memset(b, 0, sizeof(*b));
    return s;
}
ssk_json *ssk__jnew(int type) {
    ssk_json *j = calloc(1, sizeof(*j));
    if (j)
        j->type = type;
    return j;
}
ssk_json *ssk__jstrn(const char *s, size_t n) {
    ssk_json *j = ssk__jnew(SSK_JSON_STRING);
    if (!j)
        return NULL;
    j->text = malloc(n + 1);
    if (!j->text) {
        free(j);
        return NULL;
    }
    memcpy(j->text, s, n);
    j->text[n] = 0;
    j->length = n;
    return j;
}
ssk_json *ssk__jstr(const char *s) {
    return s ? ssk__jstrn(s, strlen(s)) : NULL;
}
ssk_json *ssk__jnum(double n) {
    if (!isfinite(n))
        return NULL;
    ssk_json *j = ssk__jnew(SSK_JSON_NUMBER);
    if (j)
        j->number = n;
    return j;
}
ssk_json *ssk__jbool(int n) {
    ssk_json *j = ssk__jnew(SSK_JSON_BOOL);
    if (j)
        j->number = n != 0;
    return j;
}
void ssk_json_free(ssk_json *j) {
    if (!j)
        return;
    for (size_t i = 0; i < j->count; i++)
        ssk_json_free(j->items[i]);
    free(j->items);
    free(j->text);
    free(j->key);
    free(j);
}
int ssk__jpush(ssk_json *j, ssk_json *v) {
    if (!j || !v || (j->type != SSK_JSON_ARRAY && j->type != SSK_JSON_OBJECT)) {
        ssk_json_free(v);
        return 0;
    }
    if (j->count == j->capacity) {
        size_t c = j->capacity ? j->capacity * 2 : 8;
        if (c > SSK_MAX_NODES) {
            ssk_json_free(v);
            return 0;
        }
        ssk_json **p = realloc(j->items, c * sizeof(*p));
        if (!p) {
            ssk_json_free(v);
            return 0;
        }
        j->items = p;
        j->capacity = c;
    }
    j->items[j->count++] = v;
    return 1;
}
int ssk__jset(ssk_json *j, const char *key, ssk_json *v) {
    if (!j || j->type != SSK_JSON_OBJECT || !v) {
        ssk_json_free(v);
        return 0;
    }
    for (size_t i = 0; i < j->count; i++)
        if (!strcmp(j->items[i]->key, key)) {
            v->key = ssk_strdup(key);
            v->key_length = strlen(key);
            if (!v->key) {
                ssk_json_free(v);
                return 0;
            }
            ssk_json_free(j->items[i]);
            j->items[i] = v;
            return 1;
        }
    v->key = ssk_strdup(key);
    v->key_length = strlen(key);
    if (!v->key) {
        ssk_json_free(v);
        return 0;
    }
    return ssk__jpush(j, v);
}
ssk_json *ssk__jclone(const ssk_json *s) {
    if (!s)
        return NULL;
    ssk_json *j = s->type == SSK_JSON_STRING ? ssk__jstrn(s->text, s->length) : ssk__jnew(s->type);
    if (!j)
        return NULL;
    j->number = s->number;
    for (size_t i = 0; i < s->count; i++) {
        ssk_json *c = ssk__jclone(s->items[i]);
        if (c && s->type == SSK_JSON_OBJECT) {
            c->key = ssk_strdup(s->items[i]->key);
            c->key_length = s->items[i]->key_length;
            if (!c->key) {
                ssk_json_free(c);
                c = NULL;
            }
        }
        if (!ssk__jpush(j, c)) {
            ssk_json_free(j);
            return NULL;
        }
    }
    return j;
}
int ssk_json_type(const ssk_json *j) {
    return j ? j->type : -1;
}
size_t ssk_json_size(const ssk_json *j) {
    return j ? j->count : 0;
}
const ssk_json *ssk_json_at(const ssk_json *j, size_t i) {
    return j && i < j->count ? j->items[i] : NULL;
}
const ssk_json *ssk_json_get(const ssk_json *j, const char *k) {
    if (!j || j->type != SSK_JSON_OBJECT || !k)
        return NULL;
    size_t n = strlen(k);
    for (size_t i = 0; i < j->count; i++)
        if (j->items[i]->key_length == n && !memcmp(j->items[i]->key, k, n))
            return j->items[i];
    return NULL;
}
const char *ssk_json_key(const ssk_json *j, size_t i) {
    const ssk_json *v = ssk_json_at(j, i);
    return v ? v->key : NULL;
}
const char *ssk_json_string(const ssk_json *j) {
    return j && j->type == SSK_JSON_STRING ? j->text : NULL;
}
size_t ssk_json_string_length(const ssk_json *j) {
    return j && j->type == SSK_JSON_STRING ? j->length : 0;
}
double ssk_json_number(const ssk_json *j) {
    return j && j->type == SSK_JSON_NUMBER ? j->number : NAN;
}
int ssk_json_bool(const ssk_json *j) {
    return j && j->type == SSK_JSON_BOOL ? j->number != 0 : 0;
}
int ssk__jisstr(const ssk_json *j) {
    return j && j->type == SSK_JSON_STRING && strlen(j->text) == j->length;
}
int ssk__jeq(const ssk_json *j, const char *s) {
    return ssk__jisstr(j) && !strcmp(j->text, s);
}
int ssk__jfields(const ssk_json *j, const char *const *keys, size_t n) {
    if (!j || j->type != SSK_JSON_OBJECT)
        return 0;
    for (size_t i = 0; i < j->count; i++) {
        size_t k = 0;
        for (; k < n; k++)
            if (j->items[i]->key_length == strlen(keys[k]) && !strcmp(j->items[i]->key, keys[k]))
                break;
        if (k == n)
            return 0;
    }
    return 1;
}
int ssk__utf8_valid(const unsigned char *p, size_t n) {
    for (size_t i = 0; i < n;) {
        uint32_t c = p[i++];
        size_t k;
        if (c < 128)
            continue;
        if (c >= 0xc2 && c <= 0xdf) {
            c &= 31;
            k = 1;
        } else if (c >= 0xe0 && c <= 0xef) {
            c &= 15;
            k = 2;
        } else if (c >= 0xf0 && c <= 0xf4) {
            c &= 7;
            k = 3;
        } else
            return 0;
        if (n - i < k)
            return 0;
        size_t count = k;
        while (k--) {
            if ((p[i] & 0xc0) != 0x80)
                return 0;
            c = (c << 6) | (p[i++] & 63);
        }
        if ((count == 1 && c < 128) || (count == 2 && c < 2048) || (count == 3 && c < 65536) ||
            c > 0x10ffff || (c >= 0xd800 && c <= 0xdfff))
            return 0;
    }
    return 1;
}
size_t ssk__utf16_length(const char *s) {
    size_t n = 0;
    for (const unsigned char *p = (const unsigned char *)s; *p; p++)
        if ((*p & 0xc0) != 0x80)
            n += *p >= 0xf0 ? 2u : 1u;
    return n;
}
typedef struct {
    const unsigned char *p, *end;
    size_t nodes;
    int failed;
} parser;
static void ws(parser *p) {
    while (p->p < p->end && (*p->p == ' ' || *p->p == '\n' || *p->p == '\r' || *p->p == '\t'))
        p->p++;
}
static int hex4(parser *p, uint32_t *v) {
    if ((size_t)(p->end - p->p) < 4)
        return 0;
    *v = 0;
    for (int i = 0; i < 4; i++) {
        unsigned c = *p->p++;
        unsigned x = c >= '0' && c <= '9'   ? c - '0'
                     : c >= 'a' && c <= 'f' ? c - 'a' + 10
                     : c >= 'A' && c <= 'F' ? c - 'A' + 10
                                            : 99;
        if (x == 99)
            return 0;
        *v = (*v << 4) | x;
    }
    return 1;
}
static char *string_parse(parser *p, size_t *length) {
    ssk_buf b = {0};
    p->p++;
    while (p->p < p->end) {
        unsigned c = *p->p++;
        if (c == '"') {
            *length = b.size;
            return ssk__buf_take(&b);
        }
        if (c < 32)
            break;
        if (c != '\\') {
            ssk__buf_char(&b, (char)c);
            continue;
        }
        if (p->p == p->end)
            break;
        c = *p->p++;
        if (!c)
            break;
        const char *a = "\"\\/bfnrt", *z = strchr(a, (int)c);
        if (z) {
            ssk__buf_char(&b, "\"\\/\b\f\n\r\t"[z - a]);
            continue;
        }
        if (c != 'u')
            break;
        uint32_t u;
        if (!hex4(p, &u))
            break;
        if (u >= 0xd800 && u <= 0xdbff) {
            uint32_t lo;
            if ((size_t)(p->end - p->p) < 6 || p->p[0] != '\\' || p->p[1] != 'u')
                break;
            p->p += 2;
            if (!hex4(p, &lo) || lo < 0xdc00 || lo > 0xdfff)
                break;
            u = 0x10000 + ((u - 0xd800) << 10) + (lo - 0xdc00);
        } else if (u >= 0xdc00 && u <= 0xdfff)
            break;
        if (u < 128)
            ssk__buf_char(&b, (char)u);
        else {
            if (u >= 65536)
                ssk__buf_char(&b, (char)(0xf0 | (u >> 18)));
            if (u >= 2048)
                ssk__buf_char(&b, (char)((u >= 65536 ? 0x80 : 0xe0) | ((u >> 12) & 63)));
            ssk__buf_char(&b, (char)((u >= 2048 ? 0x80 : 0xc0) | ((u >> 6) & 63)));
            ssk__buf_char(&b, (char)(0x80 | (u & 63)));
        }
    }
    free(b.data);
    p->failed = 1;
    return NULL;
}
static ssk_json *value_parse(parser *p, unsigned depth) {
    ws(p);
    if (depth > SSK_MAX_JSON_DEPTH || p->p == p->end || ++p->nodes > SSK_MAX_NODES)
        return NULL;
    unsigned c = *p->p;
    ssk_json *j = NULL;
    if (c == '{' || c == '[') {
        int object = c == '{';
        p->p++;
        j = ssk__jnew(object ? SSK_JSON_OBJECT : SSK_JSON_ARRAY);
        if (!j)
            return NULL;
        ws(p);
        if (p->p < p->end && *p->p == (object ? '}' : ']')) {
            p->p++;
            return j;
        }
        for (;;) {
            char *key = NULL;
            size_t len = 0;
            if (object) {
                ws(p);
                if (p->p == p->end || *p->p != '"')
                    goto bad;
                key = string_parse(p, &len);
                if (!key)
                    goto bad;
                /* NUL keys cannot be named by C string APIs; reject them explicitly. */
                if (strlen(key) != len) {
                    free(key);
                    goto bad;
                }
                if (ssk_json_get(j, key)) {
                    free(key);
                    goto bad;
                }
                ws(p);
                if (p->p == p->end || *p->p++ != ':') {
                    free(key);
                    goto bad;
                }
            }
            ssk_json *v = value_parse(p, depth + 1);
            if (!v) {
                free(key);
                goto bad;
            }
            v->key = key;
            v->key_length = len;
            if (!ssk__jpush(j, v))
                goto bad;
            ws(p);
            if (p->p == p->end)
                goto bad;
            c = *p->p++;
            if (c == (object ? '}' : ']'))
                return j;
            if (c != ',')
                goto bad;
        }
    } else if (c == '"') {
        size_t n = 0;
        char *s = string_parse(p, &n);
        if (!s)
            return NULL;
        j = ssk__jnew(SSK_JSON_STRING);
        if (!j) {
            free(s);
            return NULL;
        }
        j->text = s;
        j->length = n;
        return j;
    } else if (c == 't' || c == 'f' || c == 'n') {
        const char *s = c == 't' ? "true" : c == 'f' ? "false" : "null";
        size_t n = strlen(s);
        if ((size_t)(p->end - p->p) < n || memcmp(p->p, s, n))
            return NULL;
        p->p += n;
        return c == 'n' ? ssk__jnew(SSK_JSON_NULL) : ssk__jbool(c == 't');
    } else if (c == '-' || (c >= '0' && c <= '9')) {
        const unsigned char *start = p->p;
        if (c == '-')
            p->p++;
        if (p->p == p->end)
            return NULL;
        if (*p->p == '0')
            p->p++;
        else {
            if (*p->p < '1' || *p->p > '9')
                return NULL;
            while (p->p < p->end && *p->p >= '0' && *p->p <= '9')
                p->p++;
        }
        if (p->p < p->end && *p->p == '.') {
            p->p++;
            const unsigned char *a = p->p;
            while (p->p < p->end && *p->p >= '0' && *p->p <= '9')
                p->p++;
            if (a == p->p)
                return NULL;
        }
        if (p->p < p->end && (*p->p == 'e' || *p->p == 'E')) {
            p->p++;
            if (p->p < p->end && (*p->p == '+' || *p->p == '-'))
                p->p++;
            const unsigned char *a = p->p;
            while (p->p < p->end && *p->p >= '0' && *p->p <= '9')
                p->p++;
            if (a == p->p)
                return NULL;
        }
        size_t n = (size_t)(p->p - start);
        char *s = malloc(n + 1);
        if (!s)
            return NULL;
        memcpy(s, start, n);
        s[n] = 0;
        locale_t loc = newlocale(LC_NUMERIC_MASK, "C", (locale_t)0);
        if (!loc) {
            free(s);
            return NULL;
        }
        double v = strtod_l(s, NULL, loc);
        freelocale(loc);
        free(s);
        return ssk__jnum(v);
    }
    return NULL;
bad:
    ssk_json_free(j);
    return NULL;
}
ssk_code ssk_json_parse(const void *data, size_t n, ssk_json **out) {
    if (!out)
        return SSK_INVALID_REQUEST;
    *out = NULL;
    if (!data || !n || n > SSK_MAX_REQUEST_BYTES || !ssk__utf8_valid(data, n))
        return SSK_INVALID_RESPONSE;
    parser p = {(const unsigned char *)data, (const unsigned char *)data + n, 0, 0};
    ssk_json *j = value_parse(&p, 0);
    ws(&p);
    if (!j || p.failed || p.p != p.end) {
        ssk_json_free(j);
        return SSK_INVALID_RESPONSE;
    }
    *out = j;
    return SSK_OK;
}
static void quoted(ssk_buf *b, const char *s, size_t n) {
    ssk__buf_char(b, '"');
    for (size_t i = 0; i < n; i++) {
        unsigned char c = (unsigned char)s[i];
        if (c == '"' || c == '\\') {
            ssk__buf_char(b, '\\');
            ssk__buf_char(b, (char)c);
        } else if (c < 32) {
            char x[7];
            snprintf(x, sizeof(x), "\\u%04x", c);
            ssk__buf_str(b, x);
        } else
            ssk__buf_char(b, (char)c);
    }
    ssk__buf_char(b, '"');
}
static void encode(ssk_buf *b, const ssk_json *j) {
    if (!j) {
        b->failed = 1;
        return;
    }
    switch (j->type) {
    case SSK_JSON_NULL:
        ssk__buf_str(b, "null");
        break;
    case SSK_JSON_BOOL:
        ssk__buf_str(b, j->number != 0 ? "true" : "false");
        break;
    case SSK_JSON_NUMBER: {
        char x[64];
        locale_t l = newlocale(LC_NUMERIC_MASK, "C", (locale_t)0);
        if (!l) {
            b->failed = 1;
            return;
        }
        locale_t old = uselocale(l);
        int n = snprintf(x, sizeof(x), "%.17g", j->number);
        uselocale(old);
        freelocale(l);
        if (n < 0 || (size_t)n >= sizeof(x))
            b->failed = 1;
        else
            ssk__buf_str(b, x);
        break;
    }
    case SSK_JSON_STRING:
        quoted(b, j->text, j->length);
        break;
    default: {
        int o = j->type == SSK_JSON_OBJECT;
        ssk__buf_char(b, o ? '{' : '[');
        for (size_t i = 0; i < j->count; i++) {
            if (i)
                ssk__buf_char(b, ',');
            if (o) {
                quoted(b, j->items[i]->key, j->items[i]->key_length);
                ssk__buf_char(b, ':');
            }
            encode(b, j->items[i]);
        }
        ssk__buf_char(b, o ? '}' : ']');
        break;
    }
    }
}
char *ssk_json_encode(const ssk_json *j) {
    ssk_buf b = {0};
    encode(&b, j);
    return ssk__buf_take(&b);
}
