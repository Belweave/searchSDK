import type { CSSProperties } from "react";
import type { Art, ProviderBrand, Variant } from "@/lib/provider-assets";

/**
 * A provider's own mark or logo, unmodified (public/providers/SOURCES.md). Both the dark-surface
 * and light-surface files are in the markup and the theme shows one, so a theme switch never waits
 * for a download. Width follows each file's own proportions from its height; the box is reserved
 * before the image loads. Without a file, a monogram tile in the provider's hue stands in.
 *
 * `labelled`: the image is the provider's name (alt text); otherwise the name is beside it and the
 * image is decorative.
 */
function Pair({ v, height, alt, className }: { v: Variant; height: number; alt: string; className?: string }) {
  const one = (a: Art, theme: "dark" | "light") => (
    <img
      src={a.src}
      alt={theme === "dark" ? alt : ""}
      aria-hidden={theme === "light" || !alt ? true : undefined}
      width={Math.round((a.width / a.height) * height)}
      height={height}
      data-on={theme}
      decoding="async"
      draggable={false}
      className="brand-img"
    />
  );
  return (
    <span className={`brand-pair ${className ?? ""}`}>
      {one(v.dark, "dark")}
      {one(v.light, "light")}
    </span>
  );
}

export function ProviderMark({ brand, size = 20, labelled = false, className }: { brand: ProviderBrand; size?: number; labelled?: boolean; className?: string }) {
  if (brand.mark) return <Pair v={brand.mark} height={size} alt={labelled ? brand.name : ""} className={`brand-mark ${className ?? ""}`} />;
  return (
    <span
      className={`brand-monogram ${className ?? ""}`}
      style={{ "--mono-size": `${size}px`, "--mono-hue": brand.hue } as CSSProperties}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? brand.name : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {brand.monogram}
    </span>
  );
}

/** The provider's full logo when it has one; otherwise its mark and name. */
export function ProviderLogo({ brand, height = 24, className }: { brand: ProviderBrand; height?: number; className?: string }) {
  if (brand.logo) return <Pair v={brand.logo} height={height} alt={brand.name} className={`brand-logo ${className ?? ""}`} />;
  return <ProviderName brand={brand} size={height} className={className} />;
}

/** Mark and name together: the default way a provider appears in running UI. */
export function ProviderName({ brand, size = 18, className }: { brand: ProviderBrand; size?: number; className?: string }) {
  return (
    <span className={`brand-name ${className ?? ""}`} style={{ "--mark-size": `${size}px` } as CSSProperties}>
      <ProviderMark brand={brand} size={size} />
      <span>{brand.name}</span>
    </span>
  );
}
