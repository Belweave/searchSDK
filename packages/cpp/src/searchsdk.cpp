#include <searchsdk/searchsdk.hpp>
#include "transport-state.hpp"
#include <cmath>
#include <exception>
#include <iomanip>
#include <limits>
#include <locale>
#include <mutex>
#include <sstream>

namespace searchsdk {
namespace {
void require(bool condition, Code code=Code::invalid_response) { if (!condition) throw Error(code); }
void check(ssk_code code) { if (code!=SSK_OK) throw Error(static_cast<Code>(code)); }
std::string cstring(std::string_view value, Code code=Code::invalid_request) {
    require(value.find('\0')==std::string_view::npos, code);
    return std::string(value);
}
std::uint32_t millis(std::chrono::milliseconds value) {
    require(value.count()>0 && static_cast<std::uint64_t>(value.count())<=UINT32_MAX, Code::configuration);
    return static_cast<std::uint32_t>(value.count());
}
std::string quote(std::string_view value) {
    static const char hex[]="0123456789abcdef";
    std::string out="\"";
    for (unsigned char c : value) {
        if (c=='"' || c=='\\') { out+='\\'; out+=static_cast<char>(c); }
        else if (c<32) { out+="\\u00"; out+=hex[c>>4]; out+=hex[c&15]; }
        else out+=static_cast<char>(c);
    }
    return out+'"';
}
std::optional<std::string> opt_string(const Json& object, const char* field) {
    auto value=object.find(field); if (!value || value->is_null()) return {}; return value->as_string();
}
Code code_from_name(const std::string& name) {
    for (ssk_code code=SSK_OK;code<=SSK_PROVIDER_ERROR;++code)
        if (name==ssk_code_name(code)) return static_cast<Code>(code);
    throw Error(Code::invalid_response);
}
std::chrono::milliseconds duration(double value) {
    // The wire format permits fractional delays; round upward, never shorten Retry-After.
    require(std::isfinite(value) && value>=0 && value<static_cast<double>(INT64_MAX));
    return std::chrono::milliseconds(static_cast<std::int64_t>(std::ceil(value)));
}
}

Json Json::parse(std::string_view text) {
    ssk_json* value=nullptr;
    const auto code=ssk_json_parse(text.data(),text.size(),&value);
    std::shared_ptr<const void> owner(value,[](const void* p){ssk_json_free(const_cast<ssk_json*>(static_cast<const ssk_json*>(p)));});
    check(code); require(value!=nullptr,Code::configuration);
    return Json(std::move(owner),value);
}
Json Json::string(std::string_view value) { return parse(quote(value)); }
Json Json::number(double value) {
    require(std::isfinite(value),Code::invalid_request);
    std::ostringstream out; out.imbue(std::locale::classic());
    out<<std::setprecision(std::numeric_limits<double>::max_digits10)<<value;
    return parse(out.str());
}
Json Json::boolean(bool value) { return parse(value?"true":"false"); }
Json Json::array(const std::vector<Json>& values) {
    std::string text="["; bool comma=false;
    for (const auto& value : values) { if (comma) text+=','; comma=true; text+=value.dump(); }
    return parse(text+"]");
}
Json Json::object(std::initializer_list<std::pair<std::string,Json>> values) {
    return object(std::vector<std::pair<std::string,Json>>(values));
}
Json Json::object(const std::vector<std::pair<std::string,Json>>& values) {
    std::string text="{"; bool comma=false;
    for (const auto& value : values) { if (comma) text+=','; comma=true; text+=quote(cstring(value.first)); text+=':'; text+=value.second.dump(); }
    return parse(text+"}");
}
Json::Kind Json::kind() const noexcept { return value_?static_cast<Kind>(ssk_json_type(value_)):Kind::null; }
std::size_t Json::size() const noexcept { return value_?ssk_json_size(value_):0; }
Json Json::at(std::size_t index) const {
    require(kind()==Kind::array || kind()==Kind::object);
    const auto* child=ssk_json_at(value_,index); require(child!=nullptr);
    return Json(owner_,child);
}
std::optional<Json> Json::find(std::string_view name) const {
    require(kind()==Kind::object);
    const auto key=cstring(name);
    const auto* child=ssk_json_get(value_,key.c_str());
    if (!child) return {};
    return Json(owner_,child);
}
Json Json::at(std::string_view key) const { auto child=find(key); require(child.has_value()); return *child; }
std::string Json::key(std::size_t index) const {
    require(kind()==Kind::object); const auto* key=ssk_json_key(value_,index); require(key!=nullptr); return key;
}
std::string Json::as_string() const {
    require(kind()==Kind::string); return {ssk_json_string(value_),ssk_json_string_length(value_)};
}
double Json::as_number() const { require(kind()==Kind::number); return ssk_json_number(value_); }
bool Json::as_bool() const { require(kind()==Kind::boolean); return ssk_json_bool(value_)!=0; }
std::string Json::dump() const {
    if (!value_) return "null";
    std::unique_ptr<char,decltype(&ssk_free)> text(ssk_json_encode(value_),ssk_free);
    require(text!=nullptr,Code::configuration); return text.get();
}

Error::Error(Code code,int status,std::optional<std::chrono::milliseconds> delay,Json attempts)
    : std::runtime_error(ssk_code_message(static_cast<ssk_code>(code))), code_(code), status_(status),
      retry_after_(delay), attempts_(std::move(attempts)) {}
Error Error::consume(ssk_code code,ssk_error* raw) {
    std::shared_ptr<ssk_error> value(raw,ssk_error_free);
    if (!value) return Error(static_cast<Code>(code));
    const auto delay=ssk_error_retry_after_ms(value.get());
    Json attempts(value,ssk_error_attempts(value.get()));
    if (attempts.is_null()) attempts=Json::array({});
    return Error(static_cast<Code>(code),ssk_error_status(value.get()),
                 delay<0?std::optional<std::chrono::milliseconds>{}:std::chrono::milliseconds(delay),std::move(attempts));
}
Cancellation::Cancellation() : value_(ssk_cancel_new(),ssk_cancel_free) { require(value_!=nullptr,Code::configuration); }
void Cancellation::cancel() const noexcept { if (value_) ssk_cancel_trigger(value_.get()); }
bool Cancellation::cancelled() const noexcept { return value_ && ssk_cancel_is_triggered(value_.get()); }

namespace detail {
ssk_code TransportAccess::run(const HttpRequest& request,const ResponseWriter& writer,ssk_transport_fn transport,void* context) {
    require(request.state_ && writer.state_ && request.state_==writer.state_,Code::configuration);
    std::lock_guard<std::recursive_mutex> guard(request.state_->mutex);
    require(request.state_->request && request.state_->sink,Code::aborted);
    return transport(context,request.state_->request,request.state_->sink);
}
}
Code HttpRequest::check() const noexcept {
    if (!state_) return Code::aborted;
    std::lock_guard<std::recursive_mutex> guard(state_->mutex);
    return state_->request?static_cast<Code>(ssk_http_check(state_->request)):Code::aborted;
}
void ResponseWriter::status(int status) const {
    require(state_!=nullptr,Code::aborted);
    std::lock_guard<std::recursive_mutex> guard(state_->mutex);
    require(state_->sink!=nullptr,Code::aborted); check(ssk_sink_status(state_->sink,status));
}
void ResponseWriter::header(std::string_view name,std::string_view value) const {
    require(state_!=nullptr,Code::aborted);
    const auto n=cstring(name),v=cstring(value);
    std::lock_guard<std::recursive_mutex> guard(state_->mutex);
    require(state_->sink!=nullptr,Code::aborted); check(ssk_sink_header(state_->sink,n.c_str(),v.c_str()));
}
void ResponseWriter::write(std::string_view bytes) const {
    require(state_!=nullptr,Code::aborted);
    std::lock_guard<std::recursive_mutex> guard(state_->mutex);
    require(state_->sink!=nullptr,Code::aborted);require(!state_->writing,Code::invalid_request);
    state_->writing=true;
    struct Guard { bool& value; ~Guard(){value=false;} } active{state_->writing};
    check(ssk_sink_write(state_->sink,bytes.data(),bytes.size()));
}
void ResponseWriter::write(const std::vector<std::uint8_t>& bytes) const {
    if(bytes.empty()){write(std::string_view{});return;}
    write(std::string_view(reinterpret_cast<const char*>(bytes.data()),bytes.size()));
}

struct Client::Impl {
    std::string provider;
    std::uint32_t timeout_ms=10000;
    Transport transport;
    std::unique_ptr<ssk_client,decltype(&ssk_client_free)> value{nullptr,ssk_client_free};
};
ssk_code Client::transport_bridge(void* context,const ssk_http_request* raw,ssk_sink* sink) noexcept {
    try {
        auto state=std::make_shared<detail::TransportState>(); state->request=raw; state->sink=sink;
        struct Guard { std::shared_ptr<detail::TransportState> state; ~Guard(){state->close();} } guard{state};
        HttpRequest request; request.state_=state; request.url=raw->url; request.method=raw->method;
        request.deadline_ms=raw->deadline_ms; request.max_response_bytes=raw->max_response_bytes;
        if (raw->body_size) request.body.assign(raw->body,raw->body+raw->body_size);
        for (std::size_t i=0;i<raw->header_count;++i) request.headers.emplace_back(raw->headers[i].name,raw->headers[i].value);
        static_cast<Impl*>(context)->transport(request,ResponseWriter(state));
        return static_cast<ssk_code>(request.check());
    } catch (const Error& error) { return static_cast<ssk_code>(error.code()); }
      catch (...) { return SSK_NETWORK; }
}
Client::Client(Config config) : impl_(std::make_shared<Impl>()) {
    require(static_cast<bool>(config.transport),Code::configuration);
    cstring(config.provider,Code::configuration); cstring(config.gateway_url,Code::configuration);
    impl_->provider=std::move(config.provider); impl_->transport=std::move(config.transport);
    const auto settings=config.provider_options?config.provider_options->dump():std::string{};
    ssk_config raw; ssk_config_init(&raw);
    raw.provider=impl_->provider.empty()?nullptr:impl_->provider.c_str();
    raw.gateway_url=config.gateway_url.empty()?nullptr:config.gateway_url.c_str();
    raw.provider_options_json=settings.empty()?nullptr:settings.c_str();
    raw.transport=transport_bridge; raw.transport_context=impl_.get(); raw.timeout_ms=millis(config.timeout);
    impl_->timeout_ms=raw.timeout_ms;
    raw.attempt_timeout_ms=config.attempt_timeout?millis(*config.attempt_timeout):0;
    require(config.max_response_bytes>0,Code::configuration); raw.max_response_bytes=config.max_response_bytes;
    raw.max_retries=config.max_retries; raw.retry_delay_ms=millis(config.retry_delay);
    ssk_client* client=nullptr; ssk_error* error=nullptr;
    const auto code=ssk_client_new(&raw,&client,&error); impl_->value.reset(client);
    if (code!=SSK_OK) throw Error::consume(code,error);
    ssk_error_free(error); require(client!=nullptr,Code::configuration);
}
const Client::Impl& Client::checked() const { require(impl_ && impl_->value,Code::configuration); return *impl_; }
const std::string& Client::provider() const { return checked().provider; }
std::uint64_t Client::deadline_for(const CallOptions& call) const {
    const auto timeout=call.timeout?millis(*call.timeout):checked().timeout_ms;
    const auto deadline=ssk_monotonic_ms()+timeout;check_budget(call,deadline);return deadline;
}
void Client::check_budget(const CallOptions& call,std::uint64_t deadline) {
    if (call.cancellation && call.cancellation->cancelled()) throw Error(Code::aborted);
    if (ssk_monotonic_ms()>=deadline) throw Error(Code::timeout);
}
CallOptions Client::remaining_options(const CallOptions& call,std::uint64_t deadline) {
    check_budget(call,deadline);auto out=call;auto now=ssk_monotonic_ms();
    if (now>=deadline) throw Error(Code::timeout);
    out.timeout=std::chrono::milliseconds(deadline-now);return out;
}
ssk_call_options Client::options(const CallOptions& options) {
    cstring(options.credential); if (options.retrieved_at) cstring(*options.retrieved_at);
    ssk_call_options raw; ssk_call_options_init(&raw);
    raw.credential=options.credential.empty()?nullptr:options.credential.c_str();
    raw.cancel=options.cancellation?options.cancellation->value_.get():nullptr;
    raw.timeout_ms=options.timeout?millis(*options.timeout):0;
    raw.retrieved_at=options.retrieved_at?options.retrieved_at->c_str():nullptr;
    return raw;
}
Json SearchRequest::json() const {
    std::vector<std::pair<std::string,Json>> fields{{"query",Json::string(query)}};
    if (limit) fields.emplace_back("limit",Json::number(*limit));
    auto domains=[&](const char* key,const auto& values) {
        if (values) { std::vector<Json> items; for (const auto& value:*values) items.push_back(Json::string(value)); fields.emplace_back(key,Json::array(items)); }
    };
    domains("includeDomains",include_domains); domains("excludeDomains",exclude_domains);
    return Json::object(fields);
}
Json Client::normalize(const Json& request) {
    const auto text=request.dump(); ssk_json* raw=nullptr;
    const auto code=ssk_request_normalize(text.c_str(),&raw);
    std::shared_ptr<const void> owner(raw,[](const void* p){ssk_json_free(const_cast<ssk_json*>(static_cast<const ssk_json*>(p)));});
    check(code); require(raw!=nullptr,Code::configuration); return Json(owner,raw);
}
SearchResponse Client::decode(ssk_response* raw) {
    NativeResponse owned(raw); auto json=owned.json(); require(json.has_value());
    SearchResponse out; out.json=*json; out.provider=json->at("provider").as_string(); out.reuse=opt_string(*json,"reuse");
    auto rows=json->at("results");
    for (std::size_t i=0;i<rows.size();++i) {
        auto row=rows.at(i); SearchResult result; result.url=row.at("url").as_string();
        result.title=opt_string(row,"title"); result.snippet=opt_string(row,"snippet");
        if (auto score=row.find("score");score && !score->is_null()) result.score=score->as_number();
        if (auto highlights=row.find("highlights");highlights && !highlights->is_null()) {
            result.highlights.emplace(); for (std::size_t k=0;k<highlights->size();++k) result.highlights->push_back(highlights->at(k).as_string());
        }
        auto p=row.at("provenance"); result.provenance={p.at("provider").as_string(),p.at("sourceUrl").as_string(),p.at("retrievedAt").as_string(),opt_string(p,"requestId")};
        out.results.push_back(std::move(result));
    }
    auto usage=json->at("usage"); if (!usage.is_null()) out.usage=Usage{usage.at("unit").as_string(),usage.at("value").as_number()};
    auto warnings=json->at("warnings");
    for (std::size_t i=0;i<warnings.size();++i) { auto w=warnings.at(i); out.warnings.push_back({w.at("code").as_string(),w.at("provider").as_string()}); }
    auto attempts=json->at("attempts");
    for (std::size_t i=0;i<attempts.size();++i) {
        auto a=attempts.at(i); Attempt attempt;
        attempt.provider=a.at("provider").as_string(); attempt.started_at=a.at("startedAt").as_string();
        attempt.outcome=a.at("outcome").as_string(); attempt.duration_ms=a.at("durationMs").as_number();
        if (auto value=a.find("code")) attempt.code=code_from_name(value->as_string());
        if (auto value=a.find("status")) attempt.status=static_cast<int>(value->as_number());
        if (auto value=a.find("retryAfterMs")) attempt.retry_after=duration(value->as_number());
        out.attempts.push_back(std::move(attempt));
    }
    return out;
}
SearchResponse Client::search(const SearchRequest& request,const CallOptions& call) const {
    const auto deadline=deadline_for(call);auto json=request.json();auto response=search(json,remaining_options(call,deadline));
    check_budget(call,deadline);return response;
}
SearchResponse Client::search(const Json& request,const CallOptions& call) const {
    const auto& impl=checked();const auto deadline=deadline_for(call);const auto text=request.dump();auto bounded=remaining_options(call,deadline);auto opts=options(bounded);
    ssk_response* response=nullptr; ssk_error* error=nullptr;
    auto code=ssk_search(impl.value.get(),text.c_str(),&opts,&response,&error);
    if (code!=SSK_OK) { ssk_response_free(response); throw Error::consume(code,error); }
    ssk_error_free(error);auto result=decode(response);check_budget(call,deadline);return result;
}
std::vector<BatchOutcome> Client::batch(const std::vector<SearchRequest>& requests,std::size_t concurrency,const CallOptions& call) const {
    const auto& impl=checked();
    const auto deadline=ssk_monotonic_ms()+(call.timeout?millis(*call.timeout):impl.timeout_ms);
    require(concurrency>=1 && concurrency<=64,Code::configuration);
    require(requests.size()<=4096,Code::invalid_request);
    (void)options(call);
    if(requests.empty())return {};
    std::vector<std::string> text; text.reserve(requests.size());
    for (const auto& request:requests) {
        try {text.push_back(request.json().dump());}
        catch(const Error& error) {
            if(error.code()!=Code::invalid_request && error.code()!=Code::invalid_response)throw;
            // Feed a deterministically invalid request to C for this one slot.
            // Encoding failures must not discard valid siblings.
            text.emplace_back("null");
        }
    }
    std::vector<const char*> pointers; for (const auto& value:text) pointers.push_back(value.c_str());
    const auto now=ssk_monotonic_ms();
    if ((call.cancellation && call.cancellation->cancelled()) || now>=deadline) {
        const auto code=call.cancellation && call.cancellation->cancelled()?Code::aborted:Code::timeout;
        std::vector<BatchOutcome> result;result.reserve(requests.size());
        for(std::size_t i=0;i<requests.size();++i)result.emplace_back(Error(code));
        return result;
    }
    auto bounded=call;bounded.timeout=std::chrono::milliseconds(deadline-now);auto opts=options(bounded);
    ssk_outcome* outcomes=nullptr;
    auto code=ssk_search_batch(impl.value.get(),pointers.data(),pointers.size(),concurrency,&opts,&outcomes);
    auto release=[count=requests.size()](ssk_outcome* value){ssk_batch_free(value,count);};
    std::unique_ptr<ssk_outcome,decltype(release)> owned(outcomes,release); check(code);
    require(requests.empty() || outcomes!=nullptr,Code::configuration);
    std::vector<BatchOutcome> result; result.reserve(requests.size());
    for (std::size_t i=0;i<requests.size();++i) {
        auto& item=outcomes[i];
        if (item.code==SSK_OK) {
            auto* response=item.response;item.response=nullptr;
            try {result.emplace_back(decode(response));}
            catch(const Error& error){result.emplace_back(error);}
        }
        else { auto* error=item.error; item.error=nullptr; result.emplace_back(Error::consume(item.code,error)); }
    }
    // C decoded each item inside its own budget; preserve completed siblings
    // when other queued items consume the remaining whole-batch deadline.
    return result;
}
SearchResponse Client::fallback(const std::vector<Client>& clients,const SearchRequest& request,const std::vector<CallOptions>& calls) {
    require(!clients.empty() && clients.size()==calls.size(),Code::configuration);
    const auto deadline=clients[0].deadline_for(calls[0]);
    std::vector<const ssk_client*> pointers; std::vector<ssk_call_options> opts;
    for (std::size_t i=0;i<clients.size();++i) { pointers.push_back(clients[i].checked().value.get()); opts.push_back(options(calls[i])); }
    const auto text=request.json().dump(); ssk_response* response=nullptr; ssk_error* error=nullptr;
    auto first=remaining_options(calls[0],deadline);opts[0]=options(first);
    auto code=ssk_search_chain(pointers.data(),opts.data(),pointers.size(),text.c_str(),&response,&error);
    if (code!=SSK_OK) { ssk_response_free(response); throw Error::consume(code,error); }
    ssk_error_free(error);auto result=decode(response);check_budget(calls[0],deadline);return result;
}
NativeResponse Client::native(std::string_view name,const NativeInput& input,const CallOptions& call) const {
    const auto& impl=checked();const auto deadline=deadline_for(call);const auto operation=cstring(name);
    const auto* descriptor=ssk_operation_find(impl.provider.c_str(),operation.c_str());
    require(descriptor!=nullptr,Code::unsupported_option);
    const auto text=input.parameters.dump();auto bounded=remaining_options(call,deadline);auto opts=options(bounded);
    // A nonnull sentinel distinguishes an explicitly empty raw body from no raw body.
    const unsigned char empty=0;
    const void* bytes=input.raw_body?(input.raw_body->empty()?&empty:input.raw_body->data()):nullptr;
    ssk_response* response=nullptr; ssk_error* error=nullptr;
    auto code=ssk_native_call(impl.value.get(),descriptor,text.c_str(),bytes,input.raw_body?input.raw_body->size():0,&opts,&response,&error);
    if (code!=SSK_OK) { ssk_response_free(response); throw Error::consume(code,error); }
    ssk_error_free(error);require(response!=nullptr,Code::configuration);NativeResponse result(response);check_budget(call,deadline);return result;
}
NativeResponse Client::stream(std::string_view name,const NativeInput& input,const std::function<bool(SseEvent)>& callback,const CallOptions& call) const {
    const auto& impl=checked();const auto deadline=deadline_for(call);
    require(static_cast<bool>(callback),Code::configuration);require(!input.raw_body,Code::unsupported_option);
    const auto operation=cstring(name);const auto* descriptor=ssk_operation_find(impl.provider.c_str(),operation.c_str());
    require(descriptor!=nullptr,Code::unsupported_option);
    const auto text=input.parameters.dump();auto bounded=remaining_options(call,deadline);auto opts=options(bounded);
    struct Context { const std::function<bool(SseEvent)>& callback; std::exception_ptr error; } context{callback,{}};
    auto bridge=[](void* opaque,const char* event,const char* data,const char* id,std::int64_t retry) noexcept -> int {
        auto& ctx=*static_cast<Context*>(opaque);
        try {
            SseEvent value;if(event)value.event=event;if(id)value.id=id;value.data=data?data:"";
            if(retry>=0)value.retry=std::chrono::milliseconds(retry);
            return ctx.callback(std::move(value))?0:1;
        } catch (...) {ctx.error=std::current_exception();return 1;}
    };
    ssk_response* response=nullptr;ssk_error* error=nullptr;
    const auto code=ssk_native_stream(impl.value.get(),descriptor,text.c_str(),&opts,bridge,&context,&response,&error);
    if(context.error){ssk_response_free(response);ssk_error_free(error);std::rethrow_exception(context.error);}
    if(code!=SSK_OK){ssk_response_free(response);throw Error::consume(code,error);}
    ssk_error_free(error);require(response!=nullptr,Code::configuration);NativeResponse result(response);check_budget(call,deadline);return result;
}
std::vector<Capabilities> Client::providers() {
    std::vector<Capabilities> result;
    for (std::size_t i=0;i<ssk_provider_count();++i) {
        const auto* p=ssk_provider_at(i);
        result.push_back({p->provider,p->domain_filters!=0,p->mutually_exclusive_domain_filters!=0,p->max_include_domains,p->max_exclude_domains,p->max_query_utf16});
    }
    return result;
}
std::vector<Operation> Client::operations() {
    std::vector<Operation> result;
    for (std::size_t i=0;i<ssk_operation_count();++i) {
        const auto* o=ssk_operation_at(i);
        result.push_back({o->provider,o->name,o->method,o->base_url,o->path,o->response_mode,o->source,Json::parse(o->metadata_json)});
    }
    return result;
}
int NativeResponse::status() const noexcept { return value_?ssk_response_status(value_.get()):0; }
std::optional<std::string> NativeResponse::header(std::string_view name) const {
    require(value_!=nullptr,Code::configuration); const auto key=cstring(name);
    const auto* value=ssk_response_header(value_.get(),key.c_str()); if (!value) return {}; return std::string(value);
}
std::vector<std::uint8_t> NativeResponse::bytes() const {
    require(value_!=nullptr,Code::configuration); std::size_t size=0; const auto* data=ssk_response_data(value_.get(),&size);
    if (!size) return {};
    require(data!=nullptr);
    return {data,data+size};
}
std::string NativeResponse::text() const { auto data=bytes(); if (data.empty()) return {}; return {reinterpret_cast<const char*>(data.data()),data.size()}; }
std::optional<Json> NativeResponse::json() const {
    require(value_!=nullptr,Code::configuration); const auto* json=ssk_response_json(value_.get()); if (!json) return {};
    return Json(value_,json);
}
void NativeResponse::for_each_sse(const std::function<bool(SseEvent)>& callback) const {
    require(value_!=nullptr && static_cast<bool>(callback),Code::configuration);
    struct Context { const std::function<bool(SseEvent)>& callback; std::exception_ptr error; bool stopped=false; } context{callback,{},false};
    auto bridge=[](void* opaque,const char* event,const char* data,const char* id,std::int64_t retry) noexcept -> int {
        auto& ctx=*static_cast<Context*>(opaque);
        try {
            SseEvent value; if (event) value.event=event; if (id) value.id=id; value.data=data?data:"";
            if (retry>=0) value.retry=std::chrono::milliseconds(retry);
            if (!ctx.callback(std::move(value))) { ctx.stopped=true; return 1; } return 0;
        } catch (...) { ctx.error=std::current_exception(); return 1; }
    };
    auto code=ssk_response_sse(value_.get(),bridge,&context);
    if (context.error) std::rethrow_exception(context.error);
    if (context.stopped && code==SSK_ABORTED) return;
    check(code);
}
std::vector<SseEvent> NativeResponse::events() const {
    std::vector<SseEvent> result; for_each_sse([&](SseEvent event){result.push_back(std::move(event));return true;}); return result;
}
} // namespace searchsdk
