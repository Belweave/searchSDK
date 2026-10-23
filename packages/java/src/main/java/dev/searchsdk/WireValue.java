package dev.searchsdk;

import java.util.*;

/** Lossless, immutable native JSON value, including unconstrained schemas and unknown union variants. */
public class WireValue {
    private final Object value;
    protected WireValue(Object value) { this.value=WireTypes.snapshot(value); }
    public static WireValue fromJson(Object value) { return new WireValue(value); }
    public Object toJson() { return value; }
    public String asString() { return WireTypes.string(value); }
    public Boolean asBoolean() { return WireTypes.bool(value); }
    public Double asNumber() { return WireTypes.number(value); }
    public Long asInteger() { return WireTypes.integer(value); }
    public WireObject asObject() { return value==null ? null : WireObject.fromJson(value); }
    public List<WireValue> asArray() { return WireTypes.list(value,WireValue::fromJson); }
    @Override public final String toString() { return getClass().getSimpleName()+"[redacted]"; }
    @Override public final boolean equals(Object other) { return other instanceof WireValue wire && Objects.equals(value,wire.value); }
    @Override public final int hashCode() { return Objects.hashCode(value); }
}
