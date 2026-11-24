/** Placeholder wordmark until the brand mark lands (branch v2/brand). */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-fg">
      <span aria-hidden="true" className="flex h-4 items-end gap-[2px]">
        {([1, 3, 6, 8] as const).map((slot, i) => (
          <span key={slot} className="w-[3px] rounded-sm" style={{ height: `${40 + i * 20}%`, background: `var(--hue-${slot})` }} />
        ))}
      </span>
      searchSDK
    </span>
  );
}
