#pragma once
#include <searchsdk/searchsdk.hpp>
#include <cmath>
#include <map>
#include <type_traits>

namespace searchsdk::wire {
// Three wire states: optional<Nullable<T>> distinguishes absent, null, and a value.
template<class T> struct Nullable {
    std::optional<T> value;
    Nullable() = default;
    Nullable(std::nullptr_t) noexcept {}
    Nullable(T item) : value(std::move(item)) {}
    template<class U, std::enable_if_t<std::is_constructible_v<T,U> && !std::is_same_v<std::decay_t<U>,Nullable>,int> = 0>
    Nullable(U&& item) : value(std::in_place,std::forward<U>(item)) {}
};
template<class T> struct Codec {
    static Json encode(const T& value) { return value.json(); }
    static T decode(const Json& value) { return T::from_json(value); }
};
template<> struct Codec<Json> {
    static Json encode(const Json& value) { return value; }
    static Json decode(const Json& value) { return value; }
};
template<> struct Codec<std::string> {
    static Json encode(const std::string& value) { return Json::string(value); }
    static std::string decode(const Json& value) { return value.as_string(); }
};
template<> struct Codec<bool> {
    static Json encode(bool value) { return Json::boolean(value); }
    static bool decode(const Json& value) { return value.as_bool(); }
};
template<> struct Codec<double> {
    static Json encode(double value) { return Json::number(value); }
    static double decode(const Json& value) { return value.as_number(); }
};
template<> struct Codec<std::int64_t> {
    static Json encode(std::int64_t value) {
        if (value < -9007199254740991LL || value > 9007199254740991LL) throw Error(Code::invalid_request);
        return Json::number(static_cast<double>(value));
    }
    static std::int64_t decode(const Json& value) {
        const auto number=value.as_number();
        if (!std::isfinite(number) || std::floor(number)!=number || number < -9007199254740991.0 || number > 9007199254740991.0) throw Error(Code::invalid_response);
        return static_cast<std::int64_t>(number);
    }
};
template<class T> struct Codec<Nullable<T>> {
    static Json encode(const Nullable<T>& value) { return value.value?Codec<T>::encode(*value.value):Json{}; }
    static Nullable<T> decode(const Json& value) { return value.is_null()?Nullable<T>{}:Nullable<T>{Codec<T>::decode(value)}; }
};
template<class T> struct Codec<std::vector<T>> {
    static Json encode(const std::vector<T>& values) {
        std::vector<Json> out;out.reserve(values.size());for (const auto& value:values) out.push_back(Codec<T>::encode(value));return Json::array(out);
    }
    static std::vector<T> decode(const Json& values) {
        if (values.kind()!=Json::Kind::array) throw Error(Code::invalid_response);
        std::vector<T> out;out.reserve(values.size());for (std::size_t i=0;i<values.size();++i) out.push_back(Codec<T>::decode(values.at(i)));return out;
    }
};
template<class T> struct Codec<std::map<std::string,T>> {
    static Json encode(const std::map<std::string,T>& values) {
        std::vector<std::pair<std::string,Json>> out;for (const auto& value:values) out.emplace_back(value.first,Codec<T>::encode(value.second));return Json::object(out);
    }
    static std::map<std::string,T> decode(const Json& values) {
        if (values.kind()!=Json::Kind::object) throw Error(Code::invalid_response);
        std::map<std::string,T> out;for (std::size_t i=0;i<values.size();++i) out.emplace(values.key(i),Codec<T>::decode(values.at(i)));return out;
    }
};
template<class T> Json encode(const T& value) { return Codec<T>::encode(value); }
template<class T> T decode(const Json& value) { return Codec<T>::decode(value); }
template<class T> void field(std::vector<std::pair<std::string,Json>>& out,const char* name,const T& value) { out.emplace_back(name,encode(value)); }
template<class T> void field(std::vector<std::pair<std::string,Json>>& out,const char* name,const std::optional<T>& value) { if(value) out.emplace_back(name,encode(*value)); }
template<class T> void read(const Json& object,const char* name,T& out) {
    const auto value=object.find(name);if (!value) throw Error(Code::invalid_response);out=decode<T>(*value);
}
template<class T> void read(const Json& object,const char* name,std::optional<T>& out) {
    if (const auto value=object.find(name)) out=decode<T>(*value);
}
inline void extras(std::vector<std::pair<std::string,Json>>& fields,const std::map<std::string,Json>& extra,const std::vector<std::string_view>& known) {
    for (const auto& field:extra) {
        for (const auto key:known) if(field.first==key) throw Error(Code::invalid_request);
        fields.push_back(field);
    }
}
inline std::map<std::string,Json> unknown(const Json& object,const std::vector<std::string_view>& known) {
    if (object.kind()!=Json::Kind::object) throw Error(Code::invalid_response);
    std::map<std::string,Json> out;
    for (std::size_t i=0;i<object.size();++i) {
        auto name=object.key(i);bool found=false;for(const auto key:known) if(name==key) found=true;
        if (!found) out.emplace(std::move(name),object.at(i));
    }
    return out;
}
template<class T> struct Result { T data; NativeResponse raw; };
template<class T> Result<T> result(NativeResponse response) {
    auto json=response.json();if (!json) throw Error(Code::invalid_response);
    auto data=decode<T>(*json);return {std::move(data),std::move(response)};
}
} // namespace searchsdk::wire
