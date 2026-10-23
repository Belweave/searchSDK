#define _POSIX_C_SOURCE 200809L
#include <curl/curl.h>
#include <pthread.h>
#include <searchsdk/curl.h>
#include <searchsdk/searchsdk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define CHECK(x)                                                                                   \
    do {                                                                                           \
        if (!(x)) {                                                                                \
            fprintf(stderr, "loopback:%d: %s\n", __LINE__, #x);                                    \
            exit(1);                                                                               \
        }                                                                                          \
    } while (0)
static void *cancel_later(void *arg) {
    struct timespec t = {0, 15000000};
    nanosleep(&t, NULL);
    ssk_cancel_trigger(arg);
    return NULL;
}
static void call(const char *base, const char *path, const char *ca, ssk_code want,
                 uint32_t timeout, size_t cap, int cancel) {
    char url[2048];
    snprintf(url, sizeof(url), "%s%s", base, path);
    ssk_config config;
    ssk_config_init(&config);
    ssk_curl_options transport;
    ssk_curl_options_init(&transport);
    transport.ca_bundle = ca;
    config.gateway_url = url;
    config.transport = ssk_curl_transport;
    config.transport_context = &transport;
    config.timeout_ms = timeout;
    config.max_response_bytes = cap;
    ssk_client *client = NULL;
    ssk_error *error = NULL;
    CHECK(ssk_client_new(&config, &client, &error) == SSK_OK);
    ssk_call_options options;
    ssk_call_options_init(&options);
    options.credential = "local-application-token";
    ssk_cancel *token = cancel ? ssk_cancel_new() : NULL;
    options.cancel = token;
    pthread_t thread;
    if (cancel)
        CHECK(!pthread_create(&thread, NULL, cancel_later, token));
    uint64_t start = ssk_monotonic_ms();
    ssk_response *response = NULL;
    ssk_code code = ssk_search(client, "{\"query\":\"loopback & + ü\",\"limit\":2}", &options,
                               &response, &error);
    if (code != want)
        fprintf(stderr, "%s: actual %s expected %s\n", path, ssk_code_name(code),
                ssk_code_name(want));
    CHECK(code == want);
    CHECK(ssk_monotonic_ms() - start < 3000);
    if (!code) {
        CHECK(response && !error);
        CHECK(ssk_json_size(ssk_json_get(ssk_response_json(response), "results")) == 1);
    } else {
        CHECK(!response && error);
        CHECK(!strstr(ssk_code_message(code), "local-application-token"));
    }
    if (cancel)
        CHECK(!pthread_join(thread, NULL));
    ssk_cancel_free(token);
    ssk_response_free(response);
    ssk_error_free(error);
    ssk_client_free(client);
}
int main(int argc, char **argv) {
    CHECK(argc == 3);
    CHECK(curl_global_init(CURL_GLOBAL_DEFAULT) == CURLE_OK);
    call(argv[1], "/success", argv[2], SSK_OK, 1000, 0, 0);
    call(argv[1], "/chunked", argv[2], SSK_OK, 1000, 0, 0);
    call(argv[1], "/gzip", argv[2], SSK_OK, 1000, 0, 0);
    call(argv[1], "/redirect", argv[2], SSK_PROVIDER_ERROR, 1000, 0, 0);
    call(argv[1], "/oversized", argv[2], SSK_INVALID_RESPONSE, 1000, 256, 0);
    call(argv[1], "/gzip-bomb", argv[2], SSK_INVALID_RESPONSE, 1000, 256, 0);
    call(argv[1], "/malformed", argv[2], SSK_INVALID_RESPONSE, 1000, 0, 0);
    call(argv[1], "/protocol", argv[2], SSK_INVALID_RESPONSE, 1000, 0, 0);
    call(argv[1], "/error", argv[2], SSK_RATE_LIMIT, 1000, 0, 0);
    call(argv[1], "/slow", argv[2], SSK_TIMEOUT, 20, 0, 0);
    call(argv[1], "/slow", argv[2], SSK_ABORTED, 1000, 0, 1);
    call(argv[1], "/success", NULL, SSK_NETWORK, 1000, 0, 0); /* untrusted CA must fail */
    curl_global_cleanup();
    puts("HTTPS loopback: verified TLS, exact POST, auth, chunking, gzip, redirects, caps, errors, "
         "deadline, cancellation");
    return 0;
}
