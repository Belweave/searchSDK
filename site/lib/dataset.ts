/**
 * Every data file the site renders comes wrapped in a Dataset. Sample data can only reach the page
 * through <DataRegion> (components/data/data-region.tsx), which always shows its label.
 * `npm run check` fails a page whose sample data appears outside a labelled region.
 */
export type Dataset<T> = {
  readonly sample: boolean;
  /** Visible label for sample data; null for measured or verified data. */
  readonly label: string | null;
  readonly data: T;
};

type Labelled = { sample?: unknown; label?: unknown };

export function toDataset<T>(file: Labelled, data: T, name: string): Dataset<T> {
  const sample = file.sample === true;
  const label = typeof file.label === "string" && file.label.trim() ? file.label : null;
  if (sample && !label) throw new Error(`${name} is marked sample but has no label.`);
  return { sample, label: sample ? label : null, data };
}
