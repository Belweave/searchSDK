export function SkipLink({ target = "main" }: { target?: string }) {
  return (
    <a href={`#${target}`} className="skip-link">
      Skip to content
    </a>
  );
}
