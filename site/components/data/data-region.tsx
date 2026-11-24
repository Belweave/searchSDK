import type { ReactNode } from "react";
import type { Dataset } from "@/lib/dataset";

/**
 * The only way to render a Dataset. Sample data is wrapped in a region that carries its label;
 * `npm run check` fails any page with sample data outside such a region, or a region without a label.
 */
export function DataRegion<T>({
  dataset,
  children,
  className,
}: {
  dataset: Dataset<T>;
  children: (data: T) => ReactNode;
  className?: string;
}) {
  if (!dataset.sample) return <div className={className}>{children(dataset.data)}</div>;
  return (
    <div data-sample="" className={className}>
      <SampleLabel>{dataset.label}</SampleLabel>
      {children(dataset.data)}
    </div>
  );
}

export function SampleLabel({ children }: { children: ReactNode }) {
  return (
    <p data-sample-label="" className="mb-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-sample">
      <span aria-hidden="true" className="inline-block size-2 rounded-sm bg-sample" />
      {children}
    </p>
  );
}
