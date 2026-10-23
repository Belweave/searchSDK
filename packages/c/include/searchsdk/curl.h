#ifndef SEARCHSDK_CURL_H
#define SEARCHSDK_CURL_H
#include "searchsdk.h"
#ifdef __cplusplus
extern "C" {
#endif
typedef struct {
    size_t struct_size;
    /* Optional explicit PEM CA bundle; NULL uses system trust. TLS verification
     * remains mandatory. The path is borrowed for the duration of each call. */
    const char *ca_bundle;
} ssk_curl_options;
void ssk_curl_options_init(ssk_curl_options *);
/* Optional libcurl adapter: ctx is NULL or const ssk_curl_options*. Fresh handle;
 * TLS verification on, HTTPS only, no redirect/proxy/netrc/cookie credentials.
 * curl_global_init(CURL_GLOBAL_DEFAULT) before threads; cleanup after all calls. */
ssk_code ssk_curl_transport(void *, const ssk_http_request *, ssk_sink *);
#ifdef __cplusplus
}
#endif
#endif
