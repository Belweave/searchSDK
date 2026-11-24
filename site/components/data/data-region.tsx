import type { ReactNode } from "react";
import type { Dataset } from "@/lib/dataset";

/**
 * The only way to render a Dataset. Sample data is wrapped in a region that carries its label;
 * `npm run check` fails any page with sample data outside such a region, or a region without a label.
 *
 * By default the label sits above the data. With `placeLabel`, the region hands the label to its
 * children as a tag to place inside the instrument (a title bar, a legend); it must be rendered.
 */
export function DataRegion<T>({
  dataset,
  children,
  className,
  placeLabel = false,
}: {
  dataset: Dataset<T>;
  children: (data: T, label: ReactNode) => ReactNode;
  className?: string;
  placeLabel?: boolean;
}) {
  if (!dataset.sample) return <div className={className}>{children(dataset.data, null)}</div>;
  if (placeLabel) {
    return (
      <div data-sample="" className={className}>
        {children(dataset.data, <SampleTag>{dataset.label}</SampleTag>)}
      </div>
    );
  }
  return (
    <div data-sample="" className={className}>
      <SampleLabel>{dataset.label}</SampleLabel>
      {children(dataset.data, null)}
    </div>
  );
}

export function SampleLabel({ children }: { children: ReactNode }) {
  return (
    <p data-sample-label="" className="mb-4">
      <SampleTagBody>{children}</SampleTagBody>
    </p>
  );
}

/** The sample label as a state tag, for placing inside an instrument. */
export function SampleTag({ children }: { children: ReactNode }) {
  return (
    <span data-sample-label="" className="sample-tag-wrap">
      <SampleTagBody>{children}</SampleTagBody>
    </span>
  );
}

function SampleTagBody({ children }: { children: ReactNode }) {
  return (
    <span className="tag" style={{ "--tag-fill": "var(--sample)", "--tag-ink": "var(--on-state)" } as React.CSSProperties}>
      {children}
    </span>
  );
}
