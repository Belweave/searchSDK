import dev.searchsdk.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Offline installed-artifact example. Replace injected transports with server-side credentials for real use. */
public final class Consumer {
    private Consumer() {}
    public static void main(String[] args) throws Exception {
        Transport fixtures=(wire,context) -> CompletableFuture.completedFuture(new Transport.Response(200,
            "{\"request_id\":\"consumer-fixture\",\"results\":[{\"url\":\"https://example.com/reference\",\"title\":\"Synthetic reference\",\"content\":\"Offline fixture\"}]}".getBytes(StandardCharsets.UTF_8)));
        SearchClient search=SearchClient.builder(Providers.tavily("synthetic-credential",fixtures)).maxConcurrency(2).build();
        SearchResponse response=search.search(new SearchRequest("Java SDK fixture",3)).toCompletableFuture().get(2,TimeUnit.SECONDS);
        if(response.results().size()!=1 || !response.results().get(0).provenance().provider().equals("tavily")) throw new AssertionError("Normalized artifact consumer");
        NativeClient configured=NativeClient.builder("exa","synthetic-credential").transport((wire,context) ->
            CompletableFuture.completedFuture(new Transport.Response(200,Json.bytes(Map.of("requestId","offline","results",List.of(Map.of("url","https://example.com/native","title","Typed native result","future_field",true))))))).build();
        ExaModels.SearchRequest nativeBody=ExaModels.SearchRequest.builder("offline fixture").numResults(3).build();
        NativeResponse<ExaModels.SearchResponse> nativeResponse=new ExaClient(configured).search(nativeBody).toCompletableFuture().get(2,TimeUnit.SECONDS);
        String nativeTitle=nativeResponse.data().results().get(0).title();
        String nativeUrl=nativeResponse.data().results().get(0).url();
        if(!nativeTitle.equals("Typed native result") || !nativeUrl.equals("https://example.com/native") || NativeClient.catalog().size()!=493) throw new AssertionError("Typed native artifact consumer and resources");
        if(!nativeResponse.data().results().get(0).additionalFields().containsKey("future_field")) throw new AssertionError("Native unknown fields retained");
        if(!new ContextClient(NativeClient.builder("context","synthetic").transport(fixtures).build())
            .logoUrl(NativeInput.builder().query("publicClientId","public").query("domain","example.com").build())
            .toCompletableFuture().get(2,TimeUnit.SECONDS).data().startsWith("https://logos.context.dev/")) throw new AssertionError("Supplemental artifact API");
        System.out.println("PASS packaged Java 17 consumer: normalized search, schema-backed native request/response API, catalog resource and logo binding (offline)");
    }
}
