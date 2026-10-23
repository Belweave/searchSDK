/* Consumer of an installed distribution; no project/internal headers or network. */
#include <searchsdk/native.h>
#include <searchsdk/searchsdk.h>
#ifdef SSK_HAS_CURL
#include <searchsdk/curl.h>
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define REQUIRE(x)                                                                                 \
    do {                                                                                           \
        if (!(x)) {                                                                                \
            fprintf(stderr, "consumer failure at %d\n", __LINE__);                                 \
            exit(1);                                                                               \
        }                                                                                          \
    } while (0)
static char *load(const char *directory, const char *name) {
    char path[4096];
    snprintf(path, sizeof(path), "%s/%s", directory, name);
    FILE *file = fopen(path, "rb");
    REQUIRE(file);
    REQUIRE(!fseek(file, 0, SEEK_END));
    long size = ftell(file);
    REQUIRE(size > 0);
    rewind(file);
    char *text = malloc((size_t)size + 1);
    REQUIRE(text);
    REQUIRE(fread(text, 1, (size_t)size, file) == (size_t)size);
    fclose(file);
    text[size] = 0;
    return text;
}
typedef struct {
    const char *body;
    int calls;
} fixture_transport;
static ssk_code offline(void *context, const ssk_http_request *request, ssk_sink *sink) {
    fixture_transport *fixture = context;
    fixture->calls++;
    REQUIRE(!strcmp(request->url, "https://application.example/search"));
    REQUIRE(!strcmp(request->method, "POST"));
    REQUIRE(request->body_size > 0 && request->max_response_bytes == SSK_DEFAULT_MAX_BYTES);
    ssk_json *input = NULL;
    REQUIRE(!ssk_json_parse(request->body, request->body_size, &input));
    REQUIRE(!strcmp(ssk_json_string(ssk_json_get(input, "query")), "SDK consumer"));
    ssk_json_free(input);
    ssk_code code = ssk_sink_status(sink, 200);
    if (code)
        return code;
    code = ssk_sink_header(sink, "X-SearchSDK-Protocol", "1");
    if (code)
        return code;
    return ssk_sink_write(sink, fixture->body, strlen(fixture->body));
}
int main(int argc, char **argv) {
    REQUIRE(argc == 2);
    char *success = load(argv[1], "search-success.json");
    fixture_transport transport = {success, 0};
    ssk_config config;
    ssk_config_init(&config);
    config.gateway_url = "https://application.example/search";
    config.transport = offline;
    config.transport_context = &transport;
    ssk_client *client = NULL;
    ssk_error *error = NULL;
    REQUIRE(ssk_client_new(&config, &client, &error) == SSK_OK);
    ssk_call_options options;
    ssk_call_options_init(&options);
    options.credential = "fixture-application-token";
    ssk_response *response = NULL;
    REQUIRE(ssk_search(client, "{\"query\":\"SDK consumer\"}", &options, &response, &error) ==
            SSK_OK);
    /* Results and provenance remain alive after the client has been freed. */
    ssk_client_free(client);
    const ssk_json *result = ssk_json_at(ssk_json_get(ssk_response_json(response), "results"), 0);
    REQUIRE(result && ssk_json_get(result, "provenance"));
    REQUIRE(transport.calls == 1);
    char *encoded = ssk_json_encode(ssk_response_json(response));
    REQUIRE(encoded);
    ssk_free(encoded);
    ssk_response_free(response);
    char *requests = load(argv[1], "request-cases.json");
    ssk_json *cases = NULL;
    REQUIRE(!ssk_json_parse(requests, strlen(requests), &cases));
    const ssk_json *valid = ssk_json_get(cases, "valid");
    for (size_t i = 0; i < ssk_json_size(valid); i++) {
        const ssk_json *row = ssk_json_at(valid, i);
        char *input = ssk_json_encode(ssk_json_get(row, "input"));
        ssk_json *normalized = NULL;
        REQUIRE(!ssk_request_normalize(input, &normalized));
        REQUIRE(ssk_json_number(ssk_json_get(normalized, "limit")) >= 1);
        ssk_json_free(normalized);
        ssk_free(input);
    }
    const ssk_json *invalid = ssk_json_get(cases, "invalid");
    for (size_t i = 0; i < ssk_json_size(invalid); i++) {
        char *input = ssk_json_encode(ssk_json_get(ssk_json_at(invalid, i), "input"));
        ssk_json *normalized = NULL;
        REQUIRE(ssk_request_normalize(input, &normalized) == SSK_INVALID_REQUEST);
        REQUIRE(!normalized);
        ssk_free(input);
    }
    ssk_json_free(cases);
    free(requests);
    free(success);
    REQUIRE(ssk_provider_count() == 14 && ssk_operation_count() == 493);
    REQUIRE(ssk_op_context_headLogo() == ssk_operation_find("context", "headLogo"));
#ifdef SSK_HAS_CURL
    ssk_curl_options curl;
    ssk_curl_options_init(&curl);
    REQUIRE(curl.struct_size == sizeof(curl));
#endif
    puts("Installed C consumer: gateway, fixture requests, ownership, generated descriptors "
         "passed; no network calls.");
    return 0;
}
