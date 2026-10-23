using System.Text.Json;
using System.Text.Json.Serialization;

namespace SearchSdk;

/// <summary>A conservative schema union. Retains the exact JSON and offers typed views without guessing a discriminator.
/// Nested unions represent more than two alternatives. Unknown future alternatives remain accessible through Raw.</summary>
[JsonConverter(typeof(NativeUnionConverterFactory))]
public sealed class NativeUnion<TFirst, TSecond>
{
    public JsonElement Raw
    { get; }
    public NativeUnion(JsonElement raw)
    {
        Raw = raw.Clone();
    }
    public static NativeUnion<TFirst, TSecond> FromFirst(TFirst value) => new(JsonSerializer.SerializeToElement(value, Wire.Json));
    public static NativeUnion<TFirst, TSecond> FromSecond(TSecond value) => new(JsonSerializer.SerializeToElement(value, Wire.Json));
    public bool TryGetFirst(out TFirst? value) => TryGet(out value);
    public bool TryGetSecond(out TSecond? value) => TryGet(out value);
    private bool TryGet<T>(out T? value)
    {
        try
        {
            value = Raw.Deserialize<T>(Wire.Json);
            return value is not null;
        }
        catch { value = default; return false; }
    }
}
public sealed class NativeUnionConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) => typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(NativeUnion<,>);
    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) => (JsonConverter)Activator.CreateInstance(typeof(Converter<,>).MakeGenericType(typeToConvert.GetGenericArguments()))!;
    private sealed class Converter<TFirst, TSecond> : JsonConverter<NativeUnion<TFirst, TSecond>>
    {
        public override NativeUnion<TFirst, TSecond> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using var document = JsonDocument.ParseValue(ref reader);
            return new(document.RootElement);
        }
        public override void Write(Utf8JsonWriter writer, NativeUnion<TFirst, TSecond> value, JsonSerializerOptions options) => value.Raw.WriteTo(writer);
    }
}
